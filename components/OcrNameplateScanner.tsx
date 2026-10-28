'use client';

import { useMemo, useRef, useState } from 'react';
import {
    Camera,
    Check,
    CheckCircle2,
    Clock,
    ImagePlus,
    Lightbulb,
    LoaderCircle,
    RotateCcw,
    RotateCw,
    ScanText,
    ShieldCheck,
    Sparkles,
    Wrench,
} from 'lucide-react';
import { extractNameplateData, fetchWhatGasProfile } from '@/lib/refrigerantIntelligence';
import { ApiError, checkNameplateWithAi, createOcrScan, useOcrScans } from '@/lib/api';
import { RefrigerantRiskBadge } from '@/components/RefrigerantRiskBadge';
import { binariseForOcr, cropImage, enhanceForOcr, readBarcodes, rotateImage, type CropRect } from '@/lib/nameplateImage';
import { createOcrWorker } from '@/lib/ocr-engine';
import { hasAnyDetails, overallConfidence, scanScore } from '@/lib/nameplate-quality';
import { normaliseRefrigerantCode } from '@/lib/refrigerant-code';
import { LOW_CONFIDENCE, fieldConfidence, flattenWords, reconcileSerial, type FieldConfidence, type FieldKey } from '@/lib/nameplateScan';
import { resolveManufacturer } from '@/lib/nameplate-brands';
import type { NameplateAiSuggestion } from '@/lib/nameplate-ai';
import type { OcrScanRecord } from '@/types/index';

function formatScanDate(iso: string) {
    return new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

type AiChangeField = 'manufacturer' | 'model' | 'serialNumber' | 'refrigerantCode' | 'chargeKg';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

interface OcrNameplateScannerProps {
    /** Called when the technician chooses to carry a scanned refrigerant code into the Field Toolkit gas register. */
    onUseRefrigerant?: (refrigerantCode: string, extra?: { amountKg?: number }) => void;
}

export function OcrNameplateScanner({ onUseRefrigerant }: OcrNameplateScannerProps = {}) {
    const [preview, setPreview] = useState<string>('');
    const [source, setSource] = useState<Blob | null>(null);
    const [crop, setCrop] = useState<CropRect | null>(null);
    const [confidence, setConfidence] = useState<FieldConfidence>({});
    const [serialSuggestions, setSerialSuggestions] = useState<string[]>([]);
    const [serialNote, setSerialNote] = useState('');
    const [brandNote, setBrandNote] = useState('');
    const [brandSuggestions, setBrandSuggestions] = useState<string[]>([]);
    const dragStart = useRef<{ x: number; y: number } | null>(null);
    const [result, setResult] = useState<OcrScanRecord | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const [error, setError] = useState('');
    const [aiSuggestion, setAiSuggestion] = useState<NameplateAiSuggestion | null>(null);
    const [aiBusy, setAiBusy] = useState(false);
    const [aiError, setAiError] = useState('');
    const [aiApplied, setAiApplied] = useState(false);
    const { data: historyData } = useOcrScans();
    const history = historyData?.data ?? [];

    const risk = useMemo(() => {
        if (!result?.whatGasMatch) {
            return null;
        }

        return {
            color: result.whatGasMatch.riskColor,
            label: `${result.whatGasMatch.riskColor} / ${result.whatGasMatch.ashraeSafetyClass}`,
        };
    }, [result]);

    // What the AI check would change, so the technician sees a diff before anything is applied.
    const aiChanges = useMemo(() => {
        if (!aiSuggestion || !result) return [];
        const changes: Array<{ field: AiChangeField; label: string; from: string; to: string }> = [];
        const compare = (field: AiChangeField, label: string, current: string | undefined, suggested: string | null) => {
            const next = suggested?.trim();
            if (!next) return;
            if ((current ?? '').trim().toLowerCase() === next.toLowerCase()) return;
            changes.push({ field, label, from: current?.trim() || 'Not detected', to: next });
        };

        compare('manufacturer', 'Manufacturer', result.manufacturer, aiSuggestion.manufacturer);
        compare('model', 'Model', result.model, aiSuggestion.model);
        compare('serialNumber', 'Serial', result.serialNumber, aiSuggestion.serialNumber);
        compare('refrigerantCode', 'Refrigerant', result.refrigerantCode, aiSuggestion.refrigerantCode);
        if (aiSuggestion.chargeKg != null && aiSuggestion.chargeKg !== result.chargeKg) {
            changes.push({
                field: 'chargeKg',
                label: 'Factory charge',
                from: result.chargeKg !== undefined ? `${result.chargeKg} kg` : 'Not detected',
                to: `${aiSuggestion.chargeKg} kg`,
            });
        }
        return changes;
    }, [aiSuggestion, result]);

    const suggestionCount = brandSuggestions.length + serialSuggestions.length + aiChanges.length;
    const step = confirmed ? 3 : result ? 2 : preview ? 1 : 0;

    const resetAiCheck = () => {
        setAiSuggestion(null);
        setAiError('');
        setAiApplied(false);
    };

    const stageImage = (blob: Blob) => {
        setSource(blob);
        setCrop(null);
        setPreview((previous) => {
            if (previous) URL.revokeObjectURL(previous);
            return URL.createObjectURL(blob);
        });
    };

    const acceptFile = (file: File) => {
        setError('');
        setResult(null);
        setConfirmed(false);
        resetAiCheck();

        if (!file.type.startsWith('image/')) {
            setError('Choose an image file for the nameplate scan.');
            return;
        }
        if (file.size > MAX_IMAGE_BYTES) {
            setError('Use an image smaller than 10 MB. Crop the nameplate and try again.');
            return;
        }
        stageImage(file);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) acceptFile(file);
    };

    const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        const file = event.dataTransfer.files?.[0];
        if (file) acceptFile(file);
    };

    const rotate = async (turns: 1 | -1) => {
        if (!source || isScanning) return;
        stageImage(await rotateImage(source, turns));
        setResult(null);
        resetAiCheck();
    };

    const pointerFraction = (event: React.PointerEvent<HTMLDivElement>) => {
        const box = event.currentTarget.getBoundingClientRect();
        return {
            x: Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)),
            y: Math.min(1, Math.max(0, (event.clientY - box.top) / box.height)),
        };
    };

    const onCropDown = (event: React.PointerEvent<HTMLDivElement>) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        dragStart.current = pointerFraction(event);
        setCrop(null);
    };

    const onCropMove = (event: React.PointerEvent<HTMLDivElement>) => {
        const start = dragStart.current;
        if (!start) return;
        const now = pointerFraction(event);
        setCrop({ x: Math.min(start.x, now.x), y: Math.min(start.y, now.y), w: Math.abs(now.x - start.x), h: Math.abs(now.y - start.y) });
    };

    const onCropUp = () => {
        dragStart.current = null;
        // A click or tiny drag means "no crop".
        setCrop((current) => (current && current.w > 0.05 && current.h > 0.05 ? current : null));
    };

    const runScan = async () => {
        if (!source) return;
        setError('');
        setIsScanning(true);
        setResult(null);
        setConfirmed(false);
        setConfidence({});
        setSerialSuggestions([]);
        setSerialNote('');
        setBrandNote('');
        setBrandSuggestions([]);
        resetAiCheck();

        try {
            const region = await cropImage(source, crop);
            const worker = await createOcrWorker();
            let best: { parsed: OcrScanRecord; blocks: unknown; score: number } | null = null;
            try {
                // First attempt: greyscale and contrast. If it finds neither a refrigerant nor a model, try a
                // black-and-white version, which copes better with coloured, glossy or unevenly lit plates.
                const attempts: Array<() => Promise<Blob>> = [() => enhanceForOcr(region), () => binariseForOcr(region)];
                for (const prepare of attempts) {
                    const scan = await worker.recognize(await prepare(), {}, { text: true, blocks: true });
                    const parsed = await extractNameplateData(scan.data.text);
                    const score = scanScore(parsed, scan.data.confidence ?? 0);
                    if (!best || score > best.score) best = { parsed, blocks: scan.data.blocks, score };
                    if (best.parsed.refrigerantCode || best.parsed.model) break;
                }
            } finally {
                await worker.terminate();
            }
            if (!best) throw new Error('No OCR attempt completed');

            const parsed = best.parsed;
            const words = flattenWords(best.blocks);

            // Tidy the maker against the brands technicians meet, or find one elsewhere on the plate.
            const brand = resolveManufacturer(parsed.manufacturer, parsed.rawText);
            if (brand.value) parsed.manufacturer = brand.value;
            setBrandSuggestions(brand.suggestions);
            setBrandNote(
                brand.source === 'corrected' || brand.source === 'found'
                    ? `Manufacturer matched to ${brand.value}${brand.from ? ` (read as "${brand.from}")` : ''}. Check it against the plate.`
                    : brand.source === 'unrecognised'
                        ? 'This manufacturer is not one we recognise. Check the spelling against the plate.'
                        : '',
            );

            // Barcodes are far more reliable than OCR for serials; use them to confirm or fix the OCR value.
            const barcodes = await readBarcodes(region);
            const decision = reconcileSerial(parsed.serialNumber, parsed.model, barcodes);
            if (decision.source === 'barcode') {
                parsed.serialNumber = decision.serial;
                setSerialNote('Serial read from the barcode.');
            }
            setSerialSuggestions(decision.suggestions);

            const next: FieldConfidence = {
                manufacturer: fieldConfidence(brand.from ?? parsed.manufacturer, words),
                model: fieldConfidence(parsed.model, words),
                serialNumber: decision.source === 'barcode' ? 100 : fieldConfidence(parsed.serialNumber, words),
                refrigerantCode: fieldConfidence(parsed.refrigerantCode, words),
            };
            setConfidence(next);
            parsed.matchConfidence = overallConfidence(parsed, next);
            setResult(parsed);
            if (!hasAnyDetails(parsed)) {
                setError('I could not read this plate. Photograph it straight on in even light, crop to the plate, or type the details in below.');
            }
        } catch (scanError) {
            console.error(scanError);
            setError('OCR scan failed. Try a clearer image or use a higher-contrast photo.');
        } finally {
            setIsScanning(false);
        }
    };

    const updateResult = (key: FieldKey, value: string) => {
        // A hand-edited value is one the user vouches for.
        setConfidence((current) => ({ ...current, [key]: 100 }));
        setSerialNote('');
        if (key === 'manufacturer') {
            setBrandNote('');
            setBrandSuggestions([]);
        }
        setResult((current) => current ? {
            ...current,
            [key]: value || undefined,
            ...(key === 'refrigerantCode' ? { whatGasMatch: undefined } : {}),
        } : current);
        setAiApplied(false);
        setConfirmed(false);
    };

    const runAiCheck = async () => {
        const rawText = result?.rawText?.trim();
        if (!rawText) return;
        setAiBusy(true);
        setAiError('');
        setAiSuggestion(null);
        setAiApplied(false);
        try {
            setAiSuggestion(await checkNameplateWithAi(rawText));
        } catch (checkError) {
            setAiError(
                checkError instanceof ApiError && checkError.status >= 500
                    ? 'The AI check is not available right now. Use the extracted fields below.'
                    : checkError instanceof Error ? checkError.message : 'The AI check could not be completed. Try again later.',
            );
        } finally {
            setAiBusy(false);
        }
    };

    const applyAiSuggestions = async () => {
        if (!result || !aiSuggestion || aiChanges.length === 0) return;
        const next: OcrScanRecord = { ...result };
        // Values the AI supplied have not been read by the OCR engine, so they are marked for checking.
        const nextConfidence: FieldConfidence = { ...confidence };

        for (const change of aiChanges) {
            switch (change.field) {
                case 'manufacturer':
                    next.manufacturer = resolveManufacturer(aiSuggestion.manufacturer, result.rawText).value ?? undefined;
                    nextConfidence.manufacturer = undefined;
                    break;
                case 'model':
                    next.model = aiSuggestion.model ?? undefined;
                    nextConfidence.model = undefined;
                    break;
                case 'serialNumber':
                    next.serialNumber = aiSuggestion.serialNumber ?? undefined;
                    nextConfidence.serialNumber = undefined;
                    break;
                case 'refrigerantCode':
                    next.refrigerantCode = aiSuggestion.refrigerantCode ?? undefined;
                    nextConfidence.refrigerantCode = undefined;
                    next.whatGasMatch = await fetchWhatGasProfile(next.refrigerantCode);
                    break;
                case 'chargeKg':
                    next.chargeKg = aiSuggestion.chargeKg ?? undefined;
                    break;
            }
        }

        next.matchConfidence = overallConfidence(next, nextConfidence);
        setResult(next);
        setConfidence(nextConfidence);
        setSerialNote('');
        setBrandNote('');
        setBrandSuggestions([]);
        setAiApplied(true);
        setConfirmed(false);
    };

    const confirmScan = async () => {
        if (!result) return;
        setIsSaving(true);
        setError('');
        try {
            await createOcrScan({
                rawText: result.rawText,
                refrigerantCode: result.refrigerantCode,
                manufacturer: result.manufacturer,
                model: result.model,
                serialNumber: result.serialNumber,
                matchConfidence: result.matchConfidence,
                whatGasRefrigerantId: result.whatGasMatch?.id,
            });
            setConfirmed(true);
        } catch (saveError) {
            const message = saveError instanceof Error ? saveError.message : '';
            setError(message.endsWith('401') ? 'Your session expired. Sign in again, then re-confirm the scan.' : message || 'Could not save the confirmed scan.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <section className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">OCR nameplate scanning</p>
                    <h2 className="mt-1.5 text-xl font-bold text-stone-900">Scan a nameplate</h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-600">
                        Read the model, serial, refrigerant and factory charge from a photo. Recognition runs on this device.
                    </p>
                </div>
                <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 bg-[#D97706] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#b45309]">
                    <Camera className="h-4 w-4" />
                    Upload or use camera
                    <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
                </label>
            </div>

            <ol className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold">
                {['Capture', 'Review', 'Confirm'].map((label, index) => {
                    const done = step > index;
                    const active = step === index;
                    return (
                        <li key={label} className="flex items-center gap-2">
                            <span
                                className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] ${
                                    done
                                        ? 'border-stone-900 bg-stone-900 text-white'
                                        : active
                                            ? 'border-[#D97706] bg-amber-50 text-[#b45309]'
                                            : 'border-stone-200 bg-white text-stone-400'
                                }`}
                                aria-hidden="true"
                            >
                                {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                            </span>
                            <span className={done || active ? 'text-stone-800' : 'text-stone-400'}>{label}</span>
                            {index < 2 && <span className="h-px w-6 bg-stone-200" aria-hidden="true" />}
                        </li>
                    );
                })}
            </ol>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                <div className="border border-stone-200 bg-stone-50">
                    {preview ? (
                        <div className="space-y-3 p-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <button type="button" onClick={() => rotate(-1)} disabled={isScanning} className="inline-flex min-h-9 items-center gap-1.5 border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-50">
                                    <RotateCcw className="h-3.5 w-3.5" /> Rotate left
                                </button>
                                <button type="button" onClick={() => rotate(1)} disabled={isScanning} className="inline-flex min-h-9 items-center gap-1.5 border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-50">
                                    <RotateCw className="h-3.5 w-3.5" /> Rotate right
                                </button>
                                {crop && (
                                    <button type="button" onClick={() => setCrop(null)} className="min-h-9 border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100">
                                        Clear crop
                                    </button>
                                )}
                                <button type="button" onClick={runScan} disabled={isScanning} className="ml-auto inline-flex min-h-9 items-center gap-2 bg-[#D97706] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#b45309] disabled:opacity-60">
                                    {isScanning ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ScanText className="h-3.5 w-3.5" />}
                                    {isScanning ? 'Reading plate…' : result ? 'Scan again' : 'Scan nameplate'}
                                </button>
                            </div>
                            <p className="text-xs text-stone-500">
                                {crop ? 'Cropped to the plate. Scan when the text sits straight and in focus.' : 'Drag on the photo to crop to the plate — this gives the best read.'}
                            </p>
                            <div
                                className="relative inline-block max-w-full cursor-crosshair touch-none select-none"
                                onPointerDown={onCropDown}
                                onPointerMove={onCropMove}
                                onPointerUp={onCropUp}
                            >
                                <img src={preview} alt="Nameplate preview" draggable={false} className="block h-auto max-h-[520px] w-auto max-w-full" />
                                {crop && (
                                    <div
                                        className="pointer-events-none absolute border-2 border-[#D97706] bg-[#D97706]/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
                                        style={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.w * 100}%`, height: `${crop.h * 100}%` }}
                                    />
                                )}
                            </div>
                        </div>
                    ) : (
                        <label
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={handleDrop}
                            className="flex min-h-[320px] cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed border-stone-300 bg-white p-8 text-center transition hover:border-[#D97706] hover:bg-amber-50/40"
                        >
                            <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-[#b45309]">
                                <ImagePlus className="h-6 w-6" />
                            </span>
                            <div>
                                <p className="text-sm font-semibold text-stone-800">Drop a nameplate photo here</p>
                                <p className="mt-1 text-xs text-stone-500">or click to upload or take a photo. JPG or PNG, up to 10 MB.</p>
                            </div>
                            <ul className="mt-1 space-y-1 text-left text-xs text-stone-500">
                                <li>Stand square to the plate so the text is level.</li>
                                <li>Shade it from glare and fill the frame.</li>
                                <li>Crop tightly to the plate before scanning.</li>
                            </ul>
                        </label>
                    )}
                </div>

                <div className="space-y-4">
                    {error && (
                        <div role="alert" className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
                            {error}
                        </div>
                    )}

                    <div className="border border-stone-200 bg-white">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 px-4 py-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-stone-800">
                                <ScanText className="h-4 w-4 text-stone-400" />
                                Plate details
                            </div>
                            <ReadQuality value={result?.matchConfidence} />
                        </div>

                        <div className="space-y-3 p-4" aria-live="polite">
                            {isScanning ? (
                                <div className="space-y-3 py-4">
                                    <div className="flex items-center gap-2 text-sm font-medium text-[#b45309]">
                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                        Reading the plate…
                                    </div>
                                    <div className="space-y-2" aria-hidden="true">
                                        <div className="h-9 animate-pulse rounded bg-stone-100" />
                                        <div className="h-9 animate-pulse rounded bg-stone-100" />
                                        <div className="h-9 animate-pulse rounded bg-stone-100" />
                                    </div>
                                    <p className="text-xs text-stone-500">Enhancing the image, finding text, then matching the refrigerant.</p>
                                </div>
                            ) : result ? (
                                <>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        <EditableDetail label="Manufacturer" confidence={confidence.manufacturer} value={result.manufacturer ?? ''} onChange={(value) => updateResult('manufacturer', value)} />
                                        <EditableDetail label="Model" confidence={confidence.model} value={result.model ?? ''} onChange={(value) => updateResult('model', value)} />
                                        <EditableDetail label="Serial" confidence={confidence.serialNumber} value={result.serialNumber ?? ''} onChange={(value) => updateResult('serialNumber', value)} />
                                        <EditableDetail label="Refrigerant" confidence={confidence.refrigerantCode} value={result.refrigerantCode ?? ''} onChange={(value) => updateResult('refrigerantCode', /^r[-\s]?\d/i.test(value.trim()) ? normaliseRefrigerantCode(value.trim()) : value.toUpperCase())} />
                                    </div>

                                    {result.refrigerantCode && !result.whatGasMatch && (
                                        <p className="text-xs text-amber-800">
                                            This refrigerant is not in the registry, so no safety class is attached. Check the code against the plate.
                                        </p>
                                    )}

                                    {result.chargeKg !== undefined && (
                                        <div className="flex items-center justify-between gap-3 border border-stone-200 bg-stone-50 px-3 py-2.5">
                                            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">Factory charge</span>
                                            <span className="text-sm font-semibold text-stone-900">{result.chargeKg} kg <span className="font-normal text-stone-500">· fills the gas register</span></span>
                                        </div>
                                    )}

                                    {result && !hasAnyDetails(result) && (
                                        <ul className="list-inside list-disc space-y-1 text-xs text-stone-500">
                                            <li>Stand square to the plate so the text is not at an angle.</li>
                                            <li>Avoid glare from the flash or a window. Shade the plate with your body.</li>
                                            <li>Fill the frame with the plate, then drag a box around it before scanning.</li>
                                        </ul>
                                    )}

                                    <div className="border border-amber-200 bg-amber-50/50">
                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-100 px-3 py-2.5">
                                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                                                <Lightbulb className="h-4 w-4" />
                                                Suggestions
                                                {suggestionCount > 0 && (
                                                    <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-bold normal-case tracking-normal text-amber-900">{suggestionCount}</span>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={runAiCheck}
                                                disabled={aiBusy || isSaving || !result.rawText.trim()}
                                                className="inline-flex min-h-8 items-center gap-1.5 border border-[#D97706] bg-white px-2.5 py-1 text-xs font-semibold text-[#b45309] transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {aiBusy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                                                {aiBusy ? 'Checking…' : aiSuggestion ? 'Check again' : 'Check with AI'}
                                            </button>
                                        </div>

                                        <div className="space-y-3 px-3 py-3 text-xs">
                                            {brandNote && <p className="text-amber-900">{brandNote}</p>}
                                            {brandSuggestions.length > 0 && (
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-stone-600">Did you mean:</span>
                                                    {brandSuggestions.map((name) => (
                                                        <button key={name} type="button" onClick={() => updateResult('manufacturer', name)} className="min-h-8 border border-stone-300 bg-white px-2 py-1 font-semibold text-stone-800 hover:bg-stone-50">
                                                            {name}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {serialNote && <p className="text-emerald-700">{serialNote}</p>}
                                            {serialSuggestions.length > 0 && (
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-stone-600">Barcodes found:</span>
                                                    {serialSuggestions.map((code) => (
                                                        <button key={code} type="button" onClick={() => updateResult('serialNumber', code)} className="min-h-8 border border-stone-300 bg-white px-2 py-1 font-mono text-stone-800 hover:bg-stone-50">
                                                            Use {code}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {aiError && <p role="alert" className="font-medium text-rose-700">{aiError}</p>}
                                            {aiSuggestion && (
                                                <div className="space-y-2">
                                                    {aiChanges.length > 0 ? (
                                                        <>
                                                            <ul className="space-y-1.5">
                                                                {aiChanges.map((change) => (
                                                                    <li key={change.field} className="text-stone-700">
                                                                        <span className="font-semibold text-stone-500">{change.label}:</span>{' '}
                                                                        <span className="text-stone-400 line-through">{change.from}</span>{' '}
                                                                        <span className="font-semibold text-stone-900">→ {change.to}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                            <button
                                                                type="button"
                                                                onClick={applyAiSuggestions}
                                                                disabled={aiApplied}
                                                                className="inline-flex min-h-8 items-center gap-1.5 bg-stone-900 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                                                            >
                                                                {aiApplied ? 'Applied — check the fields' : 'Apply AI suggestions'}
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <p className="text-stone-600">
                                                            {aiApplied ? 'AI suggestions applied. Check the fields against the plate.' : 'The AI found nothing to change in the extracted text.'}
                                                        </p>
                                                    )}
                                                    {aiSuggestion.note && <p className="text-amber-900">AI note: {aiSuggestion.note}</p>}
                                                </div>
                                            )}

                                            <p className="flex items-start gap-1.5 text-[11px] leading-5 text-stone-500">
                                                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" />
                                                AI check sends the extracted text only — never the photo. It is optional and every value still needs checking against the plate.
                                            </p>
                                        </div>
                                    </div>

                                    {confirmed && (
                                        <div className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800">
                                            <CheckCircle2 className="h-4 w-4" />
                                            Saved to scan history.
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-2 border-t border-stone-100 pt-3">
                                        <button
                                            type="button"
                                            onClick={confirmScan}
                                            disabled={isSaving || confirmed || !hasAnyDetails(result)}
                                            title={hasAnyDetails(result) ? undefined : 'Enter at least one detail from the plate before saving'}
                                            className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 bg-[#D97706] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#b45309] disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                            {isSaving ? 'Saving…' : confirmed ? 'Confirmed' : 'Confirm and save'}
                                        </button>
                                        {result.refrigerantCode && onUseRefrigerant && (
                                            <button
                                                type="button"
                                                onClick={() => onUseRefrigerant(result.refrigerantCode!, { amountKg: result.chargeKg })}
                                                className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 bg-[#1C1917] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#292524]"
                                            >
                                                <Wrench className="h-4 w-4" />
                                                Use in Field Toolkit
                                            </button>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-3 py-2">
                                    <p className="text-sm font-medium text-stone-700">Nothing scanned yet</p>
                                    <p className="text-xs leading-5 text-stone-500">
                                        Upload a photo, crop to the plate, then scan. The scanner looks for the manufacturer, model, serial, refrigerant code and factory charge.
                                    </p>
                                    <ul className="space-y-1.5 text-xs text-stone-500">
                                        <li className="flex items-start gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /> Two image passes to cope with glare and colour</li>
                                        <li className="flex items-start gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /> Barcode read for a reliable serial</li>
                                        <li className="flex items-start gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /> Instant ASHRAE safety class for the refrigerant</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>

                    {result?.whatGasMatch && risk && (
                        <div className="border border-stone-200 bg-white p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">Matched refrigerant</p>
                                    <p className="mt-1 text-base font-bold text-stone-900">{result.whatGasMatch.code}</p>
                                    <p className="text-sm text-stone-600">{result.whatGasMatch.commonName}</p>
                                </div>
                                <RefrigerantRiskBadge color={risk.color} label={risk.label} />
                            </div>
                            <p className="mt-3 text-sm leading-6 text-stone-600">{result.whatGasMatch.typicalUse}</p>
                        </div>
                    )}
                </div>
            </div>

            {history.length > 0 && (
                <div className="border-t border-stone-200 pt-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="flex items-center gap-2 text-sm font-semibold text-stone-700">
                            <Clock className="h-4 w-4 text-stone-400" />
                            Recent scans
                        </p>
                        <span className="text-xs text-stone-400">{history.length} saved</span>
                    </div>
                    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                        {history.map((scan) => (
                            <li key={scan.id} className="flex items-center justify-between gap-3 border border-stone-200 bg-white px-3 py-2.5">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-stone-900">
                                        {scan.manufacturer || 'Unknown manufacturer'}{scan.model ? ` · ${scan.model}` : ''}
                                    </p>
                                    <p className="text-xs text-stone-400">{formatScanDate(scan.createdAt)}</p>
                                </div>
                                {scan.refrigerantCode ? (
                                    <span className="shrink-0 border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900">{scan.refrigerantCode}</span>
                                ) : (
                                    <span className="shrink-0 text-xs text-stone-400">No refrigerant</span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}

function ReadQuality({ value }: { value?: number }) {
    if (typeof value !== 'number') return null;
    const percent = Math.round(value * 100);
    const tone = percent >= 75
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : percent >= 45
            ? 'border-amber-200 bg-amber-50 text-amber-800'
            : 'border-rose-200 bg-rose-50 text-rose-700';
    return <span className={`border px-2 py-1 text-[11px] font-semibold ${tone}`}>{percent}% read quality</span>;
}

function EditableDetail({ label, value, confidence, onChange }: { label: string; value: string; confidence?: number; onChange: (value: string) => void }) {
    // Only flag fields that have a value; "Not detected" already says it all for empty ones.
    const unsure = value !== '' && (confidence === undefined || confidence < LOW_CONFIDENCE);
    const chip = value === ''
        ? null
        : confidence === undefined || confidence < LOW_CONFIDENCE
            ? { label: 'Check', tone: 'bg-amber-100 text-amber-800' }
            : confidence >= 85
                ? { label: 'High', tone: 'bg-emerald-100 text-emerald-700' }
                : { label: 'Medium', tone: 'bg-stone-100 text-stone-600' };

    return (
        <label className={`block border px-3 py-2 ${unsure ? 'border-amber-300 bg-amber-50/60' : 'border-stone-200 bg-white'}`}>
            <span className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">{label}</span>
                {chip && <span className={`px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${chip.tone}`}>{chip.label}</span>}
            </span>
            <input
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder="Not detected"
                className="mt-1 w-full min-w-0 bg-transparent text-sm font-medium text-stone-900 outline-none placeholder:font-normal placeholder:text-stone-400 focus:ring-1 focus:ring-[#D97706]"
            />
        </label>
    );
}
