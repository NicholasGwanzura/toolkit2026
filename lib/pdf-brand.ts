// Shared HEVACRAZ document furniture so every field export looks like the same piece of stationery.
import type { jsPDF } from 'jspdf';
import { SITE_URL } from '@/lib/site-url';

export const BRAND = {
  charcoal: [28, 25, 23] as [number, number, number],
  terracotta: [217, 119, 6] as [number, number, number],
  sage: [90, 125, 90] as [number, number, number],
  stone: [120, 113, 108] as [number, number, number],
  muted: [168, 162, 158] as [number, number, number],
  paper: [250, 250, 249] as [number, number, number],
  border: [231, 229, 228] as [number, number, number],
  amberSurface: [255, 251, 235] as [number, number, number],
  amberBorder: [253, 230, 138] as [number, number, number],
};

export type DocWithTable = jsPDF & { lastAutoTable?: { finalY: number } };

const LOGO_PATH = '/logos/hevacraz-logo.jpeg';

export async function loadLogo(): Promise<string | null> {
  try {
    const response = await fetch(LOGO_PATH);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('logo-unreadable'));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function formatWhen(value: string) {
  return new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium' }).format(new Date(value));
}

export type AutoTable = typeof import('jspdf-autotable').default;

export interface DocumentMeta {
  title: string;
  subject: string;
  /** Second masthead line, e.g. "Field Service Log · Refrigerant record". */
  kicker: string;
}

export function newDocument(
  JsPdf: typeof jsPDF,
  meta: DocumentMeta,
  logo: string | null,
  fact: MastheadFact,
) {
  const doc = new JsPdf({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setProperties({
    title: meta.title,
    subject: meta.subject,
    author: 'HEVACRAZ Field Toolkit',
    creator: 'HEVACRAZ Field Toolkit',
  });
  drawMasthead(doc, logo, meta);
  drawMastheadFacts(doc, fact);
  return doc;
}

function drawMasthead(doc: jsPDF, logo: string | null, meta: DocumentMeta) {
  doc.setFillColor(...BRAND.charcoal);
  doc.rect(0, 0, 210, 34, 'F');
  if (logo) {
    doc.setFillColor(255, 255, 255);
    doc.circle(22, 17, 8.6, 'F');
    doc.addImage(logo, 'JPEG', 14.2, 9.2, 15.6, 15.6);
  } else {
    doc.setTextColor(...BRAND.terracotta);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('H', 22, 20, { align: 'center' });
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('HEVACRAZ', 34, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(214, 211, 209);
  doc.text(meta.kicker, 34, 20.5);
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.muted);
  doc.text('National RAC Technician Verification & Competency Registry', 34, 25.5);

  doc.setFillColor(...BRAND.terracotta);
  doc.rect(0, 34, 210, 1.8, 'F');
  doc.setFillColor(...BRAND.sage);
  doc.rect(0, 35.8, 62, 0.6, 'F');
  return doc;
}

export interface MastheadFact {
  label: string;
  value: string;
  lines: string[];
}

export function drawMastheadFacts(doc: jsPDF, fact: MastheadFact) {
  doc.setTextColor(...BRAND.muted);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(fact.label, 190, 12, { align: 'right' });
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(fact.value, 190, 17.5, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(214, 211, 209);
  fact.lines.forEach((line, index) => {
    doc.text(line, 190, 23 + index * 4.5, { align: 'right' });
  });
}

export interface StripCell {
  label: string;
  value: string;
  detail?: string;
  x: number;
  maxWidth?: number;
}

/** The three-up headline figures sitting under the masthead. Returns the next content y. */
export function drawIdentityStrip(doc: jsPDF, y: number, cells: StripCell[]) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.stone);
  cells.forEach(cell => doc.text(cell.label, cell.x, y));
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...BRAND.charcoal);
  cells.forEach(cell => doc.text(doc.splitTextToSize(cell.value, cell.maxWidth ?? 60)[0], cell.x, y + 6));
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.stone);
  cells.forEach(cell => {
    if (cell.detail) doc.text(cell.detail, cell.x, y + 11.5, { maxWidth: cell.maxWidth });
  });
  return y + 22;
}

export function sectionHeading(doc: jsPDF, label: string, y: number) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.terracotta);
  doc.text(label.toUpperCase(), 20, y);
  doc.setDrawColor(...BRAND.border);
  doc.setLineWidth(0.2);
  doc.line(20, y + 2.2, 190, y + 2.2);
}

/** Two-column key/value table with the brand's paper-tinted label column. Returns the next content y. */
export function drawKeyTable(doc: jsPDF, autoTable: AutoTable, y: number, heading: string, rows: Array<[string, string]>) {
  sectionHeading(doc, heading, y);
  autoTable(doc, {
    startY: y + 5,
    theme: 'grid',
    body: rows,
    styles: {
      font: 'helvetica',
      fontSize: 9.5,
      cellPadding: 3,
      lineColor: BRAND.border,
      lineWidth: 0.2,
      textColor: BRAND.charcoal,
    },
    columnStyles: {
      0: { cellWidth: 46, fontStyle: 'bold', fillColor: BRAND.paper, textColor: BRAND.stone },
      1: { cellWidth: 118 },
    },
    margin: { left: 20, right: 20 },
  });
  return ((doc as DocWithTable).lastAutoTable?.finalY ?? y + 50) + 10;
}

export function drawAmberNote(doc: jsPDF, y: number, heading: string, body: string) {
  const lines = doc.splitTextToSize(body, 160) as string[];
  const height = 12 + lines.length * 4;
  doc.setFillColor(...BRAND.amberSurface);
  doc.setDrawColor(...BRAND.amberBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(20, y, 170, height, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(146, 64, 14);
  doc.text(heading, 24, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(120, 53, 15);
  doc.text(lines, 24, y + 11);
  return y + height + 14;
}

/** Declaration paragraph plus the technician and client signature rules. Returns the next content y. */
export function drawSignatures(doc: jsPDF, y: number, declaration: string, technicianName: string) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.charcoal);
  doc.text('DECLARATION', 20, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.stone);
  doc.text(doc.splitTextToSize(declaration, 170) as string[], 20, y + 5);

  y += 20;
  doc.setDrawColor(...BRAND.charcoal);
  doc.setLineWidth(0.3);
  doc.line(20, y, 90, y);
  doc.line(115, y, 190, y);
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.stone);
  doc.text('Technician signature', 20, y + 4.5);
  doc.text('Client / site representative', 115, y + 4.5);
  doc.text(technicianName, 20, y + 9);
  doc.text('Date', 115, y + 9);
  return y + 9;
}

export function drawFooters(doc: jsPDF, generatedBy: string) {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...BRAND.border);
    doc.setLineWidth(0.2);
    doc.line(20, 282, 190, 282);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.muted);
    doc.text(generatedBy, 20, 287);
    doc.text(SITE_URL.replace(/^https?:\/\//, ''), 105, 287, { align: 'center' });
    doc.text(`Page ${page} of ${pages}`, 190, 287, { align: 'right' });
  }
}
