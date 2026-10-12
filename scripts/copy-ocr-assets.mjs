// Copies the OCR engine files into public/ocr so the nameplate scanner loads them from this site
// instead of a public CDN. That is what lets a scan work with poor or no signal after the first visit.
// Safe to run any time: if a source file is missing it warns and the scanner falls back to the CDN.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = process.cwd();
const files = [
  ['node_modules/tesseract.js/dist/worker.min.js', 'public/ocr/worker.min.js'],
  ['node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js', 'public/ocr/core/tesseract-core-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'public/ocr/core/tesseract-core-simd-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js', 'public/ocr/core/tesseract-core-relaxedsimd-lstm.wasm.js'],
  ['node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'public/ocr/lang/eng.traineddata.gz'],
];

let copied = 0;
for (const [from, to] of files) {
  const source = join(root, from);
  if (!existsSync(source)) {
    console.warn(`[ocr-assets] missing ${from}; the scanner will use the CDN for this file`);
    continue;
  }
  mkdirSync(dirname(join(root, to)), { recursive: true });
  copyFileSync(source, join(root, to));
  copied++;
}
console.log(`[ocr-assets] copied ${copied} of ${files.length} files to public/ocr`);
