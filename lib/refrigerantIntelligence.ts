import type {
    AppLanguage,
    OcrScanRecord,
    Refrigerant,
    RefrigerantRiskLevel,
    SafetyAlertColor,
    WhatGasRefrigerantProfile,
} from '@/types/index';
export { getEmergencySafetyScripts } from '@/lib/emergencySafety';
import { extractCharge, extractRefrigerantCandidates, extractRefrigerantCode } from '@/lib/refrigerant-code';

const NAMEPLATE_PATTERNS = {
    // Tolerate OCR noise around the label and a single space inside the value (e.g. "QL11 4980907").
    serialNumber: /(serial|s\/n|\bsn)[^A-Z0-9\n]{0,4}\s*([A-Z0-9-]{3,}(?: [0-9]{4,})?)/i,
    model: /(model|mod\.?|\bmdl)[^A-Z0-9\n]{0,4}\s*([A-Z0-9-]{3,})/i,
    // Fallback when the label is unreadable: a token that mixes letters and digits like SZ185S4CC.
    modelShape: /\b([A-Z]{1,4}\d{2,4}[A-Z0-9-]{2,})\b/,
};

const KNOWN_MANUFACTURERS = [
    'Copeland', 'Performer', 'Danfoss', 'Bitzer', 'Carrier', 'Daikin', 'Mitsubishi', 'Panasonic',
    'LG', 'Samsung', 'Trane', 'York', 'Midea', 'Gree', 'Hisense', 'Embraco', 'Tecumseh', 'Bock',
    'Frascold', 'Hitachi', 'Toshiba', 'Fujitsu', 'Emerson', 'Lennox', 'Rheem',
];

const RISK_TEXT: Record<SafetyAlertColor, string> = {
    green: 'Green: stable handling profile with standard controls.',
    orange: 'Orange: moderate hazard, reinforce ventilation and ignition checks.',
    red: 'Red: high flammability risk, use strict ignition-source control.',
    blue: 'Blue: toxic or specialist handling profile, escalate supervision.',
};

export function normaliseRefrigerantCode(value: string) {
    return value.toUpperCase().replace(/\s+/g, '').replace('R', 'R-').replace('R--', 'R-');
}

function toProfile(record: Refrigerant): WhatGasRefrigerantProfile {
    const code = record.ashraeCode ?? record.odsName ?? 'Unknown';
    const ashraeSafetyClass = record.ashraeSafetyGroup ?? 'Unclassified';
    const classification = classifySafetyAlert(ashraeSafetyClass);

    return {
        id: record.id,
        code,
        commonName: record.odsName ?? code,
        ashraeSafetyClass,
        riskColor: classification.color,
        riskLevel: classification.riskLevel,
        typicalUse: record.realApplications?.[0] ?? 'See the WhatGas record for application detail.',
        odp: Number(record.odp) || 0,
        gwp: Number(record.gwp) || 0,
        emergencyNotes: buildEmergencyNotes(record, classification.color),
        fieldChecklist: buildFieldChecklist(record, classification.color),
        whatGasReference: `UNEP WhatGas registry record #${record.id}`,
    };
}

function buildEmergencyNotes(record: Refrigerant, color: SafetyAlertColor): string[] {
    if (color === 'red') {
        return ['Remove ignition sources immediately.', 'Ventilate the space before restarting work.'];
    }
    if (color === 'blue') {
        return ['Evacuate immediately on a large leak.', 'Use respiratory protection and escalate to a supervisor.'];
    }
    if (color === 'orange') {
        return ['Treat as mildly flammable.', 'Verify continuous ventilation when charging.'];
    }
    if (record.toxicity) {
        return [`Toxicity note: ${record.toxicity}`, 'Confirm ventilation before opening the system.'];
    }
    return ['Follow standard leak-response procedure.', 'Confirm ventilation before opening the system.'];
}

function buildFieldChecklist(record: Refrigerant, color: SafetyAlertColor): string[] {
    if (color === 'red') {
        return ['Confirm ventilation', 'Isolate sparks and flame', 'Wear anti-static PPE'];
    }
    if (color === 'blue') {
        return ['Confirm emergency wash stations', 'Use respiratory PPE', 'Notify supervisor before entry'];
    }
    if (color === 'orange') {
        return ['Check ignition controls', 'Use leak detector', 'Record confined-space controls'];
    }
    return ['Confirm pressure relief devices', 'Review high-pressure zone markings', 'Validate ventilation'];
}

/**
 * Looks up a refrigerant against the live UNEP WhatGas-backed registry
 * (synced into the `refrigerants` table). Returns null on no match, no
 * session, or a network/API failure.
 */
export async function fetchWhatGasProfile(code: string | undefined | null): Promise<WhatGasRefrigerantProfile | null> {
    if (!code) return null;

    try {
        // Ask for several matches and keep only the record whose code is exactly the one asked for.
        // The first fuzzy match could be a different refrigerant (R-13 also matches R-134a), and
        // showing another gas's safety class would be worse than showing none.
        const res = await fetch(`/api/refrigerants?q=${encodeURIComponent(code)}&pageSize=10`, {
            credentials: 'include',
        });
        if (!res.ok) return null;

        const body = await res.json() as { data: Refrigerant[] };
        const wanted = sameCodeKey(code);
        const record = body.data?.find((item) => sameCodeKey(item.ashraeCode ?? '') === wanted);
        return record ? toProfile(record) : null;
    } catch {
        return null;
    }
}

/** Upper case with no spaces or hyphens, so "R-134a", "R134A" and "r 134a" compare equal. */
export function sameCodeKey(value: string): string {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function classifySafetyAlert(ashraeSafetyClass: string): {
    color: SafetyAlertColor;
    riskLevel: RefrigerantRiskLevel;
    label: string;
} {
    const value = ashraeSafetyClass.toUpperCase();

    if (value.startsWith('B')) {
        return { color: 'blue', riskLevel: 'critical', label: `Blue / ${ashraeSafetyClass}` };
    }

    if (value === 'A3') {
        return { color: 'red', riskLevel: 'high', label: 'Red / A3' };
    }

    if (value === 'A2L' || value === 'A2') {
        return { color: 'orange', riskLevel: 'moderate', label: `Orange / ${ashraeSafetyClass}` };
    }

    if (value === 'A1') {
        return { color: 'green', riskLevel: 'low', label: `Green / ${ashraeSafetyClass}` };
    }

    return { color: 'green', riskLevel: 'low', label: `Unclassified / ${ashraeSafetyClass}` };
}

export async function getRiskSummary(code: string | undefined | null) {
    const profile = await fetchWhatGasProfile(code);

    if (!profile) {
        return null;
    }

    const classification = classifySafetyAlert(profile.ashraeSafetyClass);
    return {
        ...classification,
        profile,
        guidance: RISK_TEXT[classification.color],
    };
}

export async function buildPreJobChecklist(code: string | undefined | null) {
    const profile = await fetchWhatGasProfile(code);

    if (!profile) {
        return [
            'Confirm refrigerant identity from the equipment nameplate.',
            'Review PPE, ventilation, and leak-response controls before opening the system.',
            'Record the refrigerant class in the job pack before work starts.',
        ];
    }

    return [
        `Refrigerant confirmed: ${profile.code} (${profile.commonName})`,
        ...profile.fieldChecklist,
        'Capture technician sign-off before starting the job.',
    ];
}

export async function extractNameplateData(rawText: string): Promise<OcrScanRecord> {
    const serialNumber = rawText.match(NAMEPLATE_PATTERNS.serialNumber)?.[2];
    const model = rawText.match(NAMEPLATE_PATTERNS.model)?.[2]
        ?? rawText.toUpperCase().match(NAMEPLATE_PATTERNS.modelShape)?.[1];

    // Try the most likely codes in turn and keep the first one the registry knows exactly. A code the
    // registry does not know is kept as typed text for the person to check, with no safety class attached.
    const candidates = extractRefrigerantCandidates(rawText).slice(0, 3);
    let refrigerantCode: string | undefined = candidates[0];
    let whatGasMatch: WhatGasRefrigerantProfile | null = null;
    for (const candidate of candidates) {
        const profile = await fetchWhatGasProfile(candidate);
        if (profile) {
            refrigerantCode = candidate;
            whatGasMatch = profile;
            break;
        }
    }

    // Prefer a known brand; a loose all-caps line is too often just "SCROLL COMPRESSOR", so leave it blank.
    const manufacturerLine = KNOWN_MANUFACTURERS.find((name) => new RegExp(`\\b${name}\\b`, 'i').test(rawText));

    return {
        id: `ocr-${Date.now()}`,
        createdAt: new Date().toISOString(),
        rawText,
        refrigerantCode,
        manufacturer: manufacturerLine,
        model,
        serialNumber,
        chargeKg: extractCharge(rawText)?.kg,
        // Set by the scanner from how well each field was actually read; there is no fixed score here.
        matchConfidence: undefined,
        whatGasMatch,
    };
}

export async function buildSafetyAssistantResponse(query: string, language: AppLanguage): Promise<string> {
    const code = extractRefrigerantCode(query);
    const profile = code ? await fetchWhatGasProfile(code) : null;

    if (!profile) {
        return language === 'fr'
            ? 'Identifiez d’abord le refrigerant, puis confirmez la ventilation, les EPI et la procedure de fuite avant de commencer.'
            : 'Identify the refrigerant first, then confirm ventilation, PPE, and leak-response controls before starting work.';
    }

    const classification = classifySafetyAlert(profile.ashraeSafetyClass);
    const checklist = await buildPreJobChecklist(profile.code);
    const steps = checklist.slice(0, 4).join(language === 'fr' ? ' | ' : ' | ');

    return language === 'fr'
        ? `${profile.code} ${profile.commonName} est classe ${profile.ashraeSafetyClass}. Alerte ${classification.color}. Etapes: ${steps}.`
        : `${profile.code} ${profile.commonName} is class ${profile.ashraeSafetyClass}. ${classification.color} alert. Steps: ${steps}.`;
}
