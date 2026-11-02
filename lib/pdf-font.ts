import type { jsPDF } from 'jspdf';

export const PDF_FONT = 'HONORSans';
const FILES = [
  { file: 'HONORSans-Regular.ttf', style: 'normal' },
  { file: 'HONORSans-Bold.ttf', style: 'bold' },
] as const;

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/**
 * Puts the platform's font, HONOR Sans, into a PDF. Returns the family to use with setFont.
 * If the font cannot be fetched (for example offline and not yet cached) the report still
 * downloads, in the standard PDF font.
 */
export async function loadPdfFont(doc: jsPDF): Promise<string> {
  try {
    const fonts = await Promise.all(FILES.map(async ({ file, style }) => {
      const res = await fetch(`/fonts/honor-sans/${file}`);
      if (!res.ok) throw new Error(`${file} ${res.status}`);
      return { file, style, data: toBase64(await res.arrayBuffer()) };
    }));
    for (const { file, style, data } of fonts) {
      doc.addFileToVFS(file, data);
      doc.addFont(file, PDF_FONT, style);
    }
    return PDF_FONT;
  } catch {
    return 'helvetica';
  }
}
