// Browser-only image helpers for the nameplate scanner: rotate, crop, OCR cleanup, barcode reading.

export interface CropRect {
    /** Fractions (0-1) of the displayed image. */
    x: number;
    y: number;
    w: number;
    h: number;
}

const toBlob = (canvas: HTMLCanvasElement, fallback: Blob) =>
    new Promise<Blob>((resolve) => canvas.toBlob((blob) => resolve(blob ?? fallback), 'image/png'));

/** Rotate by a multiple of 90 degrees. */
export async function rotateImage(source: Blob, quarterTurns: 1 | -1): Promise<Blob> {
    const bitmap = await createImageBitmap(source);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.height;
    canvas.height = bitmap.width;
    const ctx = canvas.getContext('2d');
    if (!ctx) return source;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((quarterTurns * Math.PI) / 2);
    ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
    return toBlob(canvas, source);
}

export async function cropImage(source: Blob, crop: CropRect | null): Promise<Blob> {
    if (!crop) return source;
    const bitmap = await createImageBitmap(source);
    const sx = Math.round(crop.x * bitmap.width);
    const sy = Math.round(crop.y * bitmap.height);
    const sw = Math.max(1, Math.round(crop.w * bitmap.width));
    const sh = Math.max(1, Math.round(crop.h * bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return source;
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);
    return toBlob(canvas, source);
}

/** Greyscale + contrast stretch + upscale small images; falls back to the original on failure. */
export async function enhanceForOcr(file: Blob): Promise<Blob> {
    try {
        const bitmap = await createImageBitmap(file);
        const scale = bitmap.width < 1600 ? 2 : 1;
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width * scale;
        canvas.height = bitmap.height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) return file;
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = img.data;
        let min = 255;
        let max = 0;
        for (let i = 0; i < d.length; i += 4) {
            const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            d[i] = d[i + 1] = d[i + 2] = g;
            if (g < min) min = g;
            if (g > max) max = g;
        }
        const range = Math.max(1, max - min);
        for (let i = 0; i < d.length; i += 4) {
            const v = ((d[i] - min) / range) * 255;
            d[i] = d[i + 1] = d[i + 2] = v;
        }
        ctx.putImageData(img, 0, 0);
        return await toBlob(canvas, file);
    } catch {
        return file;
    }
}

interface DetectedBarcode { rawValue: string }
interface BarcodeDetectorLike { detect(image: ImageBitmapSource): Promise<DetectedBarcode[]> }
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

/**
 * Decode every barcode on the plate. Uses the native BarcodeDetector where the browser has it
 * (Chrome, Android) and falls back to ZXing elsewhere (Safari, Firefox). Never throws.
 */
export async function readBarcodes(source: Blob): Promise<string[]> {
    const found = new Set<string>();

    try {
        const Detector = (globalThis as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
        if (Detector) {
            const bitmap = await createImageBitmap(source);
            const results = await new Detector().detect(bitmap);
            results.forEach((item) => item.rawValue && found.add(item.rawValue));
        }
    } catch {
        // fall through to ZXing
    }

    if (found.size === 0) {
        const url = URL.createObjectURL(source);
        try {
            const { BrowserMultiFormatReader } = await import('@zxing/library');
            const reader = new BrowserMultiFormatReader();
            const result = await reader.decodeFromImageUrl(url);
            if (result?.getText()) found.add(result.getText());
            reader.reset();
        } catch {
            // no barcode found or unreadable: not an error for the scan
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    return [...found];
}

/**
 * A black-and-white version for plates the normal cleanup cannot read (coloured, glossy or uneven light).
 * Otsu's method picks the cut-off from the picture itself, and the image is doubled in size first.
 */
export async function binariseForOcr(file: Blob): Promise<Blob> {
    try {
        const bitmap = await createImageBitmap(file);
        const scale = bitmap.width < 1600 ? 2 : 1;
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width * scale;
        canvas.height = bitmap.height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) return file;
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = img.data;
        const histogram = new Array<number>(256).fill(0);
        for (let i = 0; i < d.length; i += 4) {
            const g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
            d[i] = g;
            histogram[g]++;
        }
        const total = d.length / 4;
        let sumAll = 0;
        for (let t = 0; t < 256; t++) sumAll += t * histogram[t];
        let sumBack = 0;
        let weightBack = 0;
        let best = 0;
        let threshold = 128;
        for (let t = 0; t < 256; t++) {
            weightBack += histogram[t];
            if (weightBack === 0) continue;
            const weightFront = total - weightBack;
            if (weightFront === 0) break;
            sumBack += t * histogram[t];
            const meanBack = sumBack / weightBack;
            const meanFront = (sumAll - sumBack) / weightFront;
            const between = weightBack * weightFront * (meanBack - meanFront) ** 2;
            if (between > best) { best = between; threshold = t; }
        }
        for (let i = 0; i < d.length; i += 4) {
            const v = d[i] > threshold ? 255 : 0;
            d[i] = d[i + 1] = d[i + 2] = v;
            d[i + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
        return await toBlob(canvas, file);
    } catch {
        return file;
    }
}
