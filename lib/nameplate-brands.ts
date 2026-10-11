// Matches what the nameplate scanner read against the makers technicians meet in Zimbabwe, so a
// misread such as "DAIKlN" becomes "Daikin" and a plate with the brand somewhere in its text still
// gets one. Pure and offline: no network, no key.

import { editDistance } from '@/lib/nameplateScan';

export interface Brand {
  name: string;
  /** Other ways the maker or its product line is printed on plates. */
  aliases?: string[];
}

export const BRANDS: Brand[] = [
  // Compressors and components
  { name: 'Copeland', aliases: ['Emerson Copeland', 'Performer', 'Scroll Copeland'] },
  { name: 'Emerson' },
  { name: 'Danfoss', aliases: ['Danfoss Maneurop', 'Maneurop'] },
  { name: 'Bitzer' },
  { name: 'Bock', aliases: ['GEA Bock'] },
  { name: 'Frascold' },
  { name: 'Dorin' },
  { name: 'Tecumseh', aliases: ['Tecumseh Europe', 'L Unite Hermetique'] },
  { name: 'Embraco', aliases: ['Nidec Embraco'] },
  { name: 'Secop' },
  { name: 'Refcomp' },
  { name: 'Mycom' },
  { name: 'Sanyo' },
  { name: 'GMCC' },
  { name: 'Highly' },
  // Air conditioning
  { name: 'Daikin' },
  { name: 'Mitsubishi', aliases: ['Mitsubishi Electric', 'Mitsubishi Heavy', 'Mitsubishi Heavy Industries'] },
  { name: 'Panasonic' },
  { name: 'LG', aliases: ['LG Electronics'] },
  { name: 'Samsung' },
  { name: 'Midea' },
  { name: 'Gree' },
  { name: 'Hisense' },
  { name: 'Haier' },
  { name: 'TCL' },
  { name: 'Toshiba' },
  { name: 'Fujitsu', aliases: ['Fujitsu General'] },
  { name: 'Hitachi' },
  { name: 'Sharp' },
  { name: 'Carrier' },
  { name: 'York' },
  { name: 'Trane' },
  { name: 'Lennox' },
  { name: 'Rheem' },
  { name: 'Goodman' },
  { name: 'McQuay' },
  { name: 'Aermec' },
  { name: 'Airwell' },
  { name: 'Kelvinator' },
  { name: 'Defy' },
  { name: 'Bosch' },
  // Commercial refrigeration
  { name: 'Hussmann' },
  { name: 'Hill Phoenix' },
  { name: 'Heatcraft' },
  { name: 'Bohn' },
  { name: 'Kysor Warren', aliases: ['Kysor'] },
  { name: 'Zanotti' },
  { name: 'Dometic' },
  { name: 'Frigidaire' },
  { name: 'Whirlpool' },
  { name: 'Electrolux' },
  { name: 'Liebherr' },
  { name: 'Tefcold' },
  { name: 'Foster' },
  { name: 'Mondial' },
];

const normalize = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');

interface Key { key: string; brand: string }

const KEYS: Key[] = BRANDS.flatMap((brand) =>
  [brand.name, ...(brand.aliases ?? [])].map((label) => ({ key: normalize(label), brand: brand.name })),
);

export type BrandMatchKind = 'exact' | 'close' | 'none';

export interface BrandMatch {
  kind: BrandMatchKind;
  brand?: string;
  /** Up to three nearby brands to offer when nothing matched confidently. */
  suggestions: string[];
}

/** How many letters may differ for a key of this length. Short names must match exactly. */
function allowedDistance(length: number): number {
  if (length <= 4) return 0;
  if (length <= 7) return 1;
  return 2;
}

/** Matches one detected manufacturer string to a known brand, correcting small misreads. */
export function matchBrand(raw: string | null | undefined): BrandMatch {
  const key = normalize(raw ?? '');
  if (!key) return { kind: 'none', suggestions: [] };

  const exact = KEYS.find((k) => k.key === key);
  if (exact) return { kind: 'exact', brand: exact.brand, suggestions: [] };

  const ranked = KEYS
    .map((k) => ({ ...k, distance: editDistance(key, k.key) }))
    .sort((a, b) => a.distance - b.distance);
  const best = ranked[0];
  const limit = allowedDistance(best.key.length);
  // A tie between two different brands is not a confident correction.
  const rival = ranked.find((k) => k.brand !== best.brand && k.distance === best.distance);
  if (best.distance <= limit && !rival && key.length >= 4) {
    return { kind: 'close', brand: best.brand, suggestions: [] };
  }

  // Near in spelling, or the read text contains a whole brand name (for example "Daikinn Ltd").
  const suggestions = [...new Set(
    ranked
      .filter((k) => k.distance <= Math.max(2, Math.ceil(k.key.length / 3)) || (k.key.length >= 4 && key.includes(k.key)))
      .map((k) => k.brand),
  )].slice(0, 3);
  return { kind: 'none', suggestions };
}

/** Looks through the whole plate text for a known brand, trying exact matches before corrections. */
export function findBrandInText(text: string | null | undefined): { brand: string; matchedText: string; corrected: boolean } | undefined {
  if (!text) return undefined;
  const words = text.split(/[^A-Za-z0-9]+/).filter(Boolean);
  // Single words and neighbouring pairs, so "Hill Phoenix" and "Kysor Warren" can be found.
  const grams = [...words, ...words.slice(0, -1).map((w, i) => `${w} ${words[i + 1]}`)];

  for (const gram of grams) {
    const key = normalize(gram);
    const exact = KEYS.find((k) => k.key === key);
    if (exact) return { brand: exact.brand, matchedText: gram, corrected: false };
  }
  for (const gram of grams) {
    const key = normalize(gram);
    // Corrections only for longer words that are close in length, so ordinary plate words
    // such as GREEN or YORKSHIRE are not mistaken for Gree or York.
    if (key.length < 5) continue;
    const near = KEYS.filter((k) => k.key.length >= 5 && Math.abs(k.key.length - key.length) <= 1 && editDistance(key, k.key) <= allowedDistance(k.key.length));
    const brands = new Set(near.map((k) => k.brand));
    if (brands.size === 1) return { brand: near[0].brand, matchedText: gram, corrected: true };
  }
  return undefined;
}

export type ManufacturerSource = 'detected' | 'corrected' | 'found' | 'unrecognised' | 'none';

export interface ManufacturerResolution {
  value: string | undefined;
  source: ManufacturerSource;
  /** The text the scanner originally read, when it was changed or found. */
  from?: string;
  suggestions: string[];
}

/** The manufacturer to show for a scan: the detected one tidied up, or one found in the plate text. */
export function resolveManufacturer(detected: string | null | undefined, rawText: string | null | undefined): ManufacturerResolution {
  const text = detected?.trim();
  if (text) {
    const match = matchBrand(text);
    if (match.kind === 'exact') return { value: match.brand, source: 'detected', suggestions: [] };
    if (match.kind === 'close') return { value: match.brand, source: 'corrected', from: text, suggestions: [] };
  }
  const found = findBrandInText(rawText);
  if (found) return { value: found.brand, source: 'found', from: found.matchedText, suggestions: [] };
  if (text) return { value: text, source: 'unrecognised', suggestions: matchBrand(text).suggestions };
  return { value: undefined, source: 'none', suggestions: [] };
}
