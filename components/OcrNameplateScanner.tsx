'use client';

import { useMemo, useRef, useState } from 'react';
import { Camera, Clock, LoaderCircle, RotateCcw, RotateCw, ScanText, Wrench } from 'lucide-react';
import { extractNameplateData } from '@/lib/refrigerantIntelligence';
import { createOcrScan, useOcrScans } from '@/lib/api';
import { RefrigerantRiskBadge } from '@/components/RefrigerantRiskBadge';
import { binariseForOcr, cropImage, enhanceForOcr, readBarcodes, rotateImage, type CropRect } from '@/lib/nameplateImage';
import { createOcrWorker } from '@/lib/ocr-engine';
import { hasAnyDetails, overallConfidence, scanScore } from '@/lib/nameplate-quality';
import { normaliseRefrigerantCode } from '@/lib/refrigerant-code';
import { LOW_CONFIDENCE, fieldConfidence, flattenWords, reconcileSerial, type FieldConfidence, type FieldKey } from '@/lib/nameplateScan';
import { resolveManufacturer } from '@/lib/nameplate-brands';
import type { OcrScanRecord } from '@/types/index';

function formatScanDate(iso: string) {
    return new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

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

    const stageImage = (blob: Blob) => {
        setSource(blob);
        setCrop(null);
        setPreview((previous) => {
            if (previous) URL.revokeObjectURL(previous);
            return URL.createObjectURL(blob);
        });
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file) {
            return;
        }
        if (!file.type.startsWith('image/')) {
            setError('Choose an image file for the nameplate scan.');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setError('Use an image smaller than 10 MB. Crop the nameplate and try again.');
            return;
        }

        setError('');
        setResult(null);
        setConfirmed(false);
        stageImage(file);
    };

    const rotate = async (turns: 1 | -1) => {
        if (!source || isScanning) return;
        stageImage(await rotateImage(source, turns));
        setResult(null);
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
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">OCR nameplate scanning</p>
                    <h2 className="mt-2 text-xl font-bold text-gray-900">Scan Equipment Nameplates</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                        Capture a nameplate image, extract refrigerant details with Tesseract.js, and immediately classify safety risk.
                    </p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 bg-[#D97706] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#b45309]">
                    <Camera className="h-4 w-4" />
                    Upload or use camera
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </label>
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="overflow-hidden border border-gray-200 bg-gray-50">
                    {preview ? (
                        <div className="p-3">
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                                <button type="button" onClick={() => rotate(-1)} disabled={isScanning} className="inline-flex items-center gap-1.5 border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50">
                                    <RotateCcw className="h-3.5 w-3.5" /> Rotate left
                                </button>
                                <button type="button" onClick={() => rotate(1)} disabled={isScanning} className="inline-flex items-center gap-1.5 border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50">
                                    <RotateCw className="h-3.5 w-3.5" /> Rotate right
                                </button>
                                {crop && (
                                    <button type="button" onClick={() => setCrop(null)} className="border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100">
                                        Clear crop
                                    </button>
                                )}
                                <button type="button" onClick={runScan} disabled={isScanning} className="ml-auto inline-flex items-center gap-2 bg-[#D97706] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#b45309] disabled:opacity-60">
                                    {isScanning ? 'Scanning…' : result ? 'Scan again' : 'Scan nameplate'}
                                </button>
                            </div>
                            <p className="mb-2 text-xs text-gray-500">Drag on the image to crop to the plate (recommended), and rotate it upright first.</p>
                            <div
                                className="relative inline-block max-w-full cursor-crosshair touch-none select-none"
                                onPointerDown={onCropDown}
                                onPointerMove={onCropMove}
                                onPointerUp={onCropUp}
                            >
                                <img src={preview} alt="Nameplate preview" draggable={false} className="block h-auto max-h-[480px] w-auto max-w-full" />
                                {crop && (
                                    <div
                                        className="pointer-events-none absolute border-2 border-[#D97706] bg-[#D97706]/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
                                        style={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.w * 100}%`, height: `${crop.h * 100}%` }}
                                    />
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex min-h-[280px] items-center justify-center text-sm text-gray-500">
                            Awaiting a nameplate image. Upload one, then crop and scan.
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                        <strong>Upload a clear image for best results.</strong> Photograph the plate straight on, in good light, with no glare, and crop to the plate. Photos of screens or blurry shots often misread the model and serial. Always check the fields before confirming.
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <ScanText className="h-4 w-4" />
                            OCR status
                        </div>
                        <div className="mt-3">
                            {isScanning ? (
                                <div className="flex items-center gap-2 text-sm text-[#D97706]">
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                    Extracting text from the uploaded image...
                                </div>
                            ) : result || error ? (
                                <div className="space-y-3 text-sm text-gray-700">
                                    {error && <p role="alert" className="text-sm font-medium text-rose-700">{error}</p>}
                                    {result && !hasAnyDetails(result) && (
                                        <ul className="list-inside list-disc text-xs text-gray-600">
                                            <li>Stand square to the plate so the text is not at an angle.</li>
                                            <li>Avoid glare from the flash or a window. Shade the plate with your body.</li>
                                            <li>Fill the frame with the plate, then drag a box around it before scanning.</li>
                                        </ul>
                                    )}
                                    {result && (<>
                                    <EditableDetail label="Manufacturer" confidence={confidence.manufacturer} value={result.manufacturer ?? ''} onChange={(value) => updateResult('manufacturer', value)} />
                                    {brandNote && <p className="text-xs text-amber-800">{brandNote}</p>}
                                    {brandSuggestions.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                                            Did you mean:
                                            {brandSuggestions.map((name) => (
                                                <button key={name} type="button" onClick={() => updateResult('manufacturer', name)} className="min-h-9 border border-gray-300 bg-white px-2 py-1 font-semibold hover:bg-gray-50">
                                                    {name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <EditableDetail label="Model" confidence={confidence.model} value={result.model ?? ''} onChange={(value) => updateResult('model', value)} />
                                    <EditableDetail label="Serial" confidence={confidence.serialNumber} value={result.serialNumber ?? ''} onChange={(value) => updateResult('serialNumber', value)} />
                                    {serialNote && <p className="text-xs text-emerald-700">{serialNote}</p>}
                                    {serialSuggestions.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                                            Barcodes found:
                                            {serialSuggestions.map((code) => (
                                                <button key={code} type="button" onClick={() => updateResult('serialNumber', code)} className="border border-gray-300 bg-white px-2 py-1 font-mono hover:bg-gray-100">
                                                    Use {code} as serial
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {result.chargeKg !== undefined && (
                                        <p className="text-xs text-gray-600">Factory charge on the plate: <strong>{result.chargeKg} kg</strong>. It will fill the amount in the gas register. Check it against the plate.</p>
                                    )}
                                    <EditableDetail label="Refrigerant" confidence={confidence.refrigerantCode} value={result.refrigerantCode ?? ''} onChange={(value) => updateResult('refrigerantCode', /^r[-\s]?\d/i.test(value.trim()) ? normaliseRefrigerantCode(value.trim()) : value.toUpperCase())} />
                                    <button type="button" onClick={confirmScan} disabled={isSaving || confirmed || !hasAnyDetails(result)} title={hasAnyDetails(result) ? undefined : 'Enter at least one detail from the plate before saving'} className="inline-flex items-center gap-2 bg-[#D97706] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#b45309] disabled:cursor-not-allowed disabled:opacity-60">
                                        {isSaving ? 'Saving confirmed scan…' : confirmed ? 'Scan confirmed and saved' : 'Confirm and save scan'}
                                    </button>
                                    {result.refrigerantCode && onUseRefrigerant && (
                                        <button
                                            type="button"
                                            onClick={() => onUseRefrigerant(result.refrigerantCode!, { amountKg: result.chargeKg })}
                                            className="inline-flex items-center gap-2 bg-[#1C1917] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#292524]"
                                        >
                                            <Wrench className="h-4 w-4" />
                                            Use in Field Toolkit
                                        </button>
                                    )}
                                    </>)}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">No scan has been processed yet.</p>
                            )}
                        </div>
                    </div>

                    {result?.whatGasMatch && risk && (
                        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-gray-500">Matched refrigerant</p>
                                    <h3 className="mt-1 text-lg font-bold text-gray-900">
                                        {result.whatGasMatch.code} · {result.whatGasMatch.commonName}
                                    </h3>
                                </div>
                                <RefrigerantRiskBadge color={risk.color} label={risk.label} />
                            </div>
                            <p className="mt-3 text-sm text-gray-600">
                                {result.whatGasMatch.typicalUse}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {history.length > 0 && (
                <div className="mt-6 border-t border-gray-100 pt-5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <Clock className="h-4 w-4" />
                        Recent scans
                    </div>
                    <div className="mt-3 divide-y divide-gray-100 border border-gray-200">
                        {history.map((scan) => (
                            <div key={scan.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                                <div className="min-w-0">
                                    <p className="truncate font-medium text-gray-900">
                                        {scan.manufacturer || 'Unknown manufacturer'} {scan.model ? `· ${scan.model}` : ''}
                                    </p>
                                    <p className="text-xs text-gray-400">{formatScanDate(scan.createdAt)}</p>
                                </div>
                                <span className="shrink-0 text-xs font-semibold text-gray-500">
                                    {scan.refrigerantCode || 'No refrigerant detected'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}

function EditableDetail({ label, value, confidence, onChange }: { label: string; value: string; confidence?: number; onChange: (value: string) => void }) {
    // Only flag fields that have a value; "Not detected" already says it all for empty ones.
    const unsure = value !== '' && (confidence === undefined || confidence < LOW_CONFIDENCE);
    return (
        <div className={`flex items-center justify-between gap-3 border px-4 py-3 ${unsure ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white'}`}>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                {label}
                {unsure && <span className="ml-2 normal-case tracking-normal text-amber-700">check this</span>}
            </span>
            <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Not detected" className="min-w-0 flex-1 bg-transparent text-right text-sm font-medium text-gray-900 outline-none focus:ring-1 focus:ring-[#D97706]" />
        </div>
    );
}
