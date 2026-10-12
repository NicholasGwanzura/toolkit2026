'use client';

import type { Worker } from 'tesseract.js';

let localAssets: Promise<boolean> | null = null;

/** True when the OCR files copied at build time are being served from this site. */
function hasLocalAssets(): Promise<boolean> {
  localAssets ??= fetch('/ocr/worker.min.js', { method: 'HEAD' }).then((res) => res.ok).catch(() => false);
  return localAssets;
}

/**
 * An OCR worker that loads its files from this site when they are there, so scanning works offline
 * after the first visit, and from the public CDN otherwise.
 */
export async function createOcrWorker(): Promise<Worker> {
  const { createWorker } = await import('tesseract.js');
  if (await hasLocalAssets()) {
    return createWorker('eng', undefined, {
      workerPath: '/ocr/worker.min.js',
      corePath: '/ocr/core',
      langPath: '/ocr/lang',
      gzip: true,
    });
  }
  return createWorker('eng');
}
