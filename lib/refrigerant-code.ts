// Reading refrigerant codes and charge weights from nameplate text. Pure, so it can be tested.
//
// Codes are returned as "R-" plus digits plus any letter suffix, upper case: R-134A, R-410A, R-1234YF.
// A code is never shortened: reading R-1234yf as R-123 would point at a different, toxic refrigerant.

/** A refrigerant code: 2 to 4 digits and up to 2 letters. The look-around stops it matching inside a longer word or number. */
const CODE = /(?<![A-Za-z0-9])R[-\s]?([0-9OolI]{2,4}[A-Za-z]{0,2})(?![A-Za-z0-9])/gi;

/** Words that sit next to the refrigerant on a plate, in English and French. */
const NEAR_KEYWORD = /(refrigerant|refrigerante?|réfrigérant|type|gas|gaz|fluide)/i;

/** Fix common OCR confusions inside the digit part (letter O for 0, l or I for 1), but only when digits remain digits. */
function repairDigits(raw: string): string {
  const match = raw.match(/^([0-9OolI]{2,4})([A-Za-z]{0,2})$/);
  if (!match) return raw;
  const digits = match[1].replace(/[Oo]/g, '0').replace(/[lI]/g, '1');
  return /^\d{2,4}$/.test(digits) ? `${digits}${match[2]}` : raw;
}

export function normaliseRefrigerantCode(code: string): string {
  return `R-${repairDigits(code.replace(/^R[-\s]?/i, '')).toUpperCase()}`;
}

/**
 * Every refrigerant code in the text, most likely first. A code that sits next to the word
 * "refrigerant" or "type" comes before one found elsewhere, and the order of appearance breaks ties.
 */
export function extractRefrigerantCandidates(text: string): string[] {
  const found: Array<{ code: string; near: boolean; index: number }> = [];
  for (const match of text.matchAll(CODE)) {
    const index = match.index ?? 0;
    const code = normaliseRefrigerantCode(match[0]);
    // A bare two-digit code such as "R 12" inside ordinary text is rarely a refrigerant unless a keyword is close by.
    const window = text.slice(Math.max(0, index - 40), index + match[0].length + 20);
    found.push({ code, near: NEAR_KEYWORD.test(window), index });
  }
  const ordered = [...found].sort((a, b) => Number(b.near) - Number(a.near) || a.index - b.index);
  return [...new Set(ordered.map((item) => item.code))];
}

export function extractRefrigerantCode(text: string): string | undefined {
  return extractRefrigerantCandidates(text)[0];
}

export interface ChargeReading {
  kg: number;
  /** How the weight was written on the plate, for showing back to the user. */
  text: string;
}

/**
 * The factory refrigerant charge, from lines such as "AMOUNT 0.90 ± 0.05 kg", "Charge: 450 g" or
 * "Refrigerant 1.2kg". Grams are converted. Returns nothing when no weight sits near a charge word.
 */
export function extractCharge(text: string): ChargeReading | undefined {
  const pattern = /(?:amount|charge|quantity|qty|poids|quantite|quantité)[^0-9\n]{0,24}(\d{1,4}(?:[.,]\d{1,3})?)\s*(?:±\s*\d+(?:[.,]\d+)?\s*)?(kg|g)\b/i;
  const match = text.match(pattern);
  if (!match) return undefined;
  const value = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0) return undefined;
  const kg = match[2].toLowerCase() === 'g' ? value / 1000 : value;
  if (kg > 10000) return undefined;
  return { kg: Math.round(kg * 1000) / 1000, text: `${match[1]} ${match[2].toLowerCase()}` };
}
