// The shape and validation rules for the optional AI second read of a nameplate. Pure, so the
// server route, the scanner and the tests share one definition of an acceptable suggestion.

export interface NameplateAiSuggestion {
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  refrigerantCode: string | null;
  chargeKg: number | null;
  note: string | null;
}

/** How much OCR text is sent to the AI service. Plenty for one plate and keeps the request small. */
export const MAX_RAW_TEXT_FOR_AI = 4000;

const MAX_FIELD_LENGTH = 60;
const MAX_NOTE_LENGTH = 200;

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

/** Only refrigerant codes shaped like R-410A or R-1234yf are kept; anything else is dropped. */
export function cleanRefrigerantCode(value: unknown): string | null {
  const code = cleanText(value, 12);
  if (!code) return null;
  const normalised = code.toUpperCase().replace(/\s+/g, '').replace(/^R-?/, 'R-');
  return /^R-\d{2,4}[A-Z]{0,3}$/.test(normalised) ? normalised : null;
}

/** A plausible factory charge in kilograms, grams already converted by the model. */
export function cleanChargeKg(value: unknown): number | null {
  const amount = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number(value.replace(',', '.'))
      : Number.NaN;
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) return null;
  return Math.round(amount * 1000) / 1000;
}

/**
 * Parses the model's reply into a suggestion, tolerating markdown fences around the JSON. Returns
 * null when there is no usable JSON, so the route can tell the technician the check was unavailable.
 */
export function parseNameplateSuggestion(content: string | null | undefined): NameplateAiSuggestion | null {
  if (!content) return null;

  const unfenced = content.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = unfenced.indexOf('{');
  const end = unfenced.lastIndexOf('}');
  if (start === -1 || end <= start) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(unfenced.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

  const record = parsed as Record<string, unknown>;
  return {
    manufacturer: cleanText(record.manufacturer, MAX_FIELD_LENGTH),
    model: cleanText(record.model, MAX_FIELD_LENGTH),
    serialNumber: cleanText(record.serialNumber, MAX_FIELD_LENGTH),
    refrigerantCode: cleanRefrigerantCode(record.refrigerantCode),
    chargeKg: cleanChargeKg(record.chargeKg),
    note: cleanText(record.note, MAX_NOTE_LENGTH),
  };
}
