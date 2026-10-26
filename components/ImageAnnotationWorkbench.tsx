'use client';

import { useMemo, useRef, useState } from 'react';
import { ImagePlus, MapPin, Save } from 'lucide-react';
import { createFieldImageRecord, useFieldImageRecords } from '@/lib/api';
import type { ImageRecord } from '@/types/index';

type DraftAnnotation = {
    id: string;
    x: number;
    y: number;
    label: string;
};

export function ImageAnnotationWorkbench() {
    const imageRef = useRef<HTMLDivElement>(null);
    const [imageDataUrl, setImageDataUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [jobId, setJobId] = useState('job-plan-001');
    const [beforeAfter, setBeforeAfter] = useState<ImageRecord['beforeAfter']>('inspection');
    const [gpsTag, setGpsTag] = useState('');
    const [annotations, setAnnotations] = useState<DraftAnnotation[]>([]);
    const [notice, setNotice] = useState('');
    const { data: savedRecords = [], error: savedRecordsError } = useFieldImageRecords(5);

    const markerLabel = useMemo(() => `Issue ${annotations.length + 1}`, [annotations.length]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            setNotice('Choose a JPG, PNG, or WebP image.');
            event.target.value = '';
            return;
        }
        setNotice('Preparing image…');
        const objectUrl = URL.createObjectURL(file);
        try {
            const image = new Image();
            image.src = objectUrl;
            await image.decode();
            if (!image.naturalWidth || !image.naturalHeight) throw new Error('Could not read this image. Choose another file.');
            const scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
            canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
            const context = canvas.getContext('2d');
            if (!context) throw new Error('This browser cannot prepare the image.');
            context.fillStyle = '#fff';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            const prepared = canvas.toDataURL('image/jpeg', 0.78);
            if (prepared.length > 1_200_000) throw new Error('This image is still too large after compression. Choose a smaller image.');
            setImageDataUrl(prepared);
            setAnnotations([]);
            setNotice('Image ready to annotate.');
        } catch (error) {
            setNotice(error instanceof Error ? error.message : 'Could not read this image. Choose another file.');
        } finally {
            URL.revokeObjectURL(objectUrl);
        }
    };

    const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!imageRef.current || !imageDataUrl) {
            return;
        }

        const bounds = imageRef.current.getBoundingClientRect();
        const x = Number((((event.clientX - bounds.left) / bounds.width) * 100).toFixed(2));
        const y = Number((((event.clientY - bounds.top) / bounds.height) * 100).toFixed(2));

        setAnnotations((current) => [
            ...current,
            {
                id: `annotation-${Date.now()}-${current.length}`,
                x,
                y,
                label: markerLabel,
            },
        ]);
    };

    const saveImageRecord = async () => {
        if (!imageDataUrl) {
            setNotice('Upload an image before saving annotations.');
            return;
        }
        if (!jobId.trim()) {
            setNotice('Enter a job ID before saving annotations.');
            return;
        }

        setIsSaving(true);
        setNotice('Saving evidence to your account…');
        try {
            await createFieldImageRecord({
                jobId: jobId.trim(),
                beforeAfter,
                annotationsJson: annotations,
                gpsTag: gpsTag.trim() || undefined,
                imageDataUrl,
            });
            setNotice(`Saved ${annotations.length} annotations for ${jobId.trim()}.`);
        } catch (error) {
            setNotice(error instanceof Error ? `Could not save evidence: ${error.message}` : 'Could not save evidence. Check your connection and try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">Image capture and annotation</p>
                    <h2 className="mt-2 text-xl font-bold text-gray-900">Annotate Field Images</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                        Tag before/after evidence, drop issue markers, and link each image to a job record with optional GPS metadata.
                    </p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">
                    <ImagePlus className="h-4 w-4" />
                    Upload image
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void handleFileChange(event)} className="hidden" />
                </label>
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
                <div
                    ref={imageRef}
                    onClick={handleCanvasClick}
                    className="relative min-h-[320px] overflow-hidden border border-gray-200 bg-gray-50"
                >
                    {imageDataUrl ? (
                        <>
                            <img src={imageDataUrl} alt="Annotation target" className="h-full w-full object-cover" />
                            {annotations.map((annotation, index) => (
                                <button
                                    key={annotation.id}
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setAnnotations((current) => current.filter((item) => item.id !== annotation.id));
                                    }}
                                    className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-[#D97706] text-xs font-bold text-white shadow-lg"
                                    style={{ left: `${annotation.x}%`, top: `${annotation.y}%` }}
                                >
                                    {index + 1}
                                </button>
                            ))}
                        </>
                    ) : (
                        <div className="flex h-full min-h-[320px] items-center justify-center text-sm text-gray-500">
                            Upload an image, then click to place annotation markers.
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-2 text-sm">
                            <span className="font-semibold text-gray-700">Job ID</span>
                            <input
                                value={jobId}
                                onChange={(event) => setJobId(event.target.value)}
                                className="w-full border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#D97706]"
                            />
                        </label>
                        <label className="space-y-2 text-sm">
                            <span className="font-semibold text-gray-700">Tag</span>
                            <select
                                value={beforeAfter}
                                onChange={(event) => setBeforeAfter(event.target.value as ImageRecord['beforeAfter'])}
                                className="w-full border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#D97706]"
                            >
                                <option value="before">Before</option>
                                <option value="after">After</option>
                                <option value="inspection">Inspection</option>
                            </select>
                        </label>
                    </div>

                    <label className="space-y-2 text-sm">
                        <span className="flex items-center gap-2 font-semibold text-gray-700">
                            <MapPin className="h-4 w-4" />
                            GPS tag
                        </span>
                        <input
                            value={gpsTag}
                            onChange={(event) => setGpsTag(event.target.value)}
                            placeholder="-17.8292, 31.0522"
                            className="w-full border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#D97706]"
                        />
                    </label>

                    <div className="border border-gray-200 bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Current markers</p>
                        <div className="mt-3 space-y-2">
                            {annotations.length === 0 ? (
                                <p className="text-sm text-gray-500">No annotations yet.</p>
                            ) : annotations.map((annotation, index) => (
                                <div key={annotation.id} className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
                                    Marker {index + 1}: {annotation.label} at {annotation.x}% / {annotation.y}%
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => void saveImageRecord()}
                        disabled={!imageDataUrl || !jobId.trim() || isSaving}
                        className="inline-flex items-center gap-2 bg-[#1C1917] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#292524] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Save className="h-4 w-4" />
                        {isSaving ? 'Saving…' : 'Save annotated image'}
                    </button>

                    {notice && (
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                            {notice}
                        </div>
                    )}
                </div>
            </div>
            <div className="mt-6 border-t border-gray-200 pt-5">
                <h3 className="text-sm font-semibold text-gray-800">Recently saved evidence</h3>
                {savedRecordsError ? (
                    <p className="mt-2 text-sm text-rose-700">Could not load saved evidence. Check your connection and refresh.</p>
                ) : savedRecords.length === 0 ? (
                    <p className="mt-2 text-sm text-gray-500">Your saved field images will appear here on any signed-in device.</p>
                ) : (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {savedRecords.map((record) => (
                            <article key={record.id} className="flex gap-3 rounded-lg border border-gray-200 p-2">
                                <img src={record.imageDataUrl} alt={`${record.beforeAfter} evidence for ${record.jobId}`} className="h-20 w-24 shrink-0 rounded object-cover" />
                                <div className="min-w-0 py-1 text-sm">
                                    <p className="truncate font-semibold text-gray-800">{record.jobId}</p>
                                    <p className="capitalize text-gray-600">{record.beforeAfter} · {record.annotationsJson.length} markers</p>
                                    <p className="mt-1 text-xs text-gray-500">{new Date(record.createdAt).toLocaleDateString()}</p>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
