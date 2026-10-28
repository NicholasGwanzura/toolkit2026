// Matches what the nameplate scanner read against the makers technicians meet on HVAC-R equipment,
// so a misread such as "DAIKlN" becomes "Daikin" and a plate with the brand somewhere in its text
// still gets one. Pure and offline: no network, no key.

import { editDistance } from '@/lib/nameplateScan';

export type BrandCategory =
  | 'air-conditioning'
  | 'refrigeration'
  | 'compressors'
  | 'controls'
  | 'ventilation'
  | 'heating'
  | 'applied'
  | 'components'
  | 'refrigerants';

export interface Brand {
  name: string;
  category: BrandCategory;
  /** The makers technicians meet most often. Suggestions put these first when names are equally close. */
  common?: boolean;
  /** Other ways the maker or its product line is printed on plates. */
  aliases?: string[];
}

// Grouped by category, with the most common makers first inside each group.
export const BRANDS: Brand[] = [
  // Air conditioning: split, multi-split and VRF equipment.
  { name: 'Daikin', category: 'air-conditioning', common: true, aliases: ['Daikin Applied'] },
  { name: 'Mitsubishi', category: 'air-conditioning', common: true, aliases: ['Mitsubishi Electric', 'Mitsubishi Heavy', 'Mitsubishi Heavy Industries'] },
  { name: 'LG', category: 'air-conditioning', common: true, aliases: ['LG Electronics'] },
  { name: 'Samsung', category: 'air-conditioning', common: true, aliases: ['Samsung Electronics'] },
  { name: 'Panasonic', category: 'air-conditioning', common: true, aliases: ['Matsushita', 'Panasonic Electric'] },
  { name: 'Carrier', category: 'air-conditioning', common: true, aliases: ['Carrier Air Conditioning'] },
  { name: 'York', category: 'air-conditioning', common: true, aliases: ['York International'] },
  { name: 'Trane', category: 'air-conditioning', common: true, aliases: ['Trane Technologies'] },
  { name: 'Midea', category: 'air-conditioning', common: true, aliases: ['Midea Group'] },
  { name: 'Gree', category: 'air-conditioning', common: true, aliases: ['Gree Electric'] },
  { name: 'Hisense', category: 'air-conditioning', common: true },
  { name: 'Haier', category: 'air-conditioning', common: true, aliases: ['Haier Group'] },
  { name: 'TCL', category: 'air-conditioning', common: true, aliases: ['TCL Electronics'] },
  { name: 'Toshiba', category: 'air-conditioning', common: true, aliases: ['Toshiba Carrier'] },
  { name: 'Fujitsu', category: 'air-conditioning', common: true, aliases: ['Fujitsu General', 'O General'] },
  { name: 'Hitachi', category: 'air-conditioning', common: true },
  { name: 'Sharp', category: 'air-conditioning', common: true },
  { name: 'Bosch', category: 'air-conditioning', common: true, aliases: ['Bosch Home Comfort'] },
  { name: 'Kelvinator', category: 'air-conditioning', common: true },
  { name: 'Defy', category: 'air-conditioning', common: true },
  { name: 'Lennox', category: 'air-conditioning', common: true },
  { name: 'Rheem', category: 'air-conditioning', common: true, aliases: ['Rheem Manufacturing'] },
  { name: 'Goodman', category: 'air-conditioning', common: true, aliases: ['Goodman Manufacturing'] },
  { name: 'Chigo', category: 'air-conditioning' },
  { name: 'Voltas', category: 'air-conditioning', aliases: ['Voltas Limited'] },
  { name: 'Blue Star', category: 'air-conditioning' },
  { name: 'Acson', category: 'air-conditioning' },
  { name: 'Kelon', category: 'air-conditioning' },
  { name: 'Telefunken', category: 'air-conditioning' },
  { name: 'Bruhm', category: 'air-conditioning' },
  { name: 'Airwell', category: 'air-conditioning' },

  // Commercial and domestic refrigeration, ice machines and display cabinets.
  { name: 'Hussmann', category: 'refrigeration', common: true },
  { name: 'Heatcraft', category: 'refrigeration', common: true },
  { name: 'Hill Phoenix', category: 'refrigeration', common: true },
  { name: 'Dometic', category: 'refrigeration', common: true },
  { name: 'Liebherr', category: 'refrigeration', common: true },
  { name: 'Frigidaire', category: 'refrigeration', common: true },
  { name: 'Whirlpool', category: 'refrigeration', common: true },
  { name: 'Electrolux', category: 'refrigeration', common: true },
  { name: 'Hoshizaki', category: 'refrigeration', common: true },
  { name: 'Bohn', category: 'refrigeration' },
  { name: 'Kysor Warren', category: 'refrigeration', aliases: ['Kysor'] },
  { name: 'Zanotti', category: 'refrigeration' },
  { name: 'Tefcold', category: 'refrigeration' },
  { name: 'Foster', category: 'refrigeration' },
  { name: 'Mondial', category: 'refrigeration' },
  { name: 'Arneg', category: 'refrigeration' },
  { name: 'Epta', category: 'refrigeration' },
  { name: 'Costan', category: 'refrigeration' },
  { name: 'Bonnet Neve', category: 'refrigeration' },
  { name: 'Ugur', category: 'refrigeration' },
  { name: 'Turbo Air', category: 'refrigeration' },
  { name: 'Manitowoc', category: 'refrigeration' },
  { name: 'Scotsman', category: 'refrigeration' },
  { name: 'Ice-O-Matic', category: 'refrigeration' },
  { name: 'Follett', category: 'refrigeration' },
  { name: 'Brema', category: 'refrigeration' },
  { name: 'Koolaire', category: 'refrigeration' },
  { name: 'Caravell', category: 'refrigeration' },
  { name: 'Zero Appliances', category: 'refrigeration' },
  { name: 'Snomaster', category: 'refrigeration' },
  { name: 'Fagor', category: 'refrigeration' },
  { name: 'Infrico', category: 'refrigeration' },
  { name: 'Vestfrost', category: 'refrigeration' },

  // Compressors and the condensing-unit makers that build around them.
  { name: 'Copeland', category: 'compressors', common: true, aliases: ['Emerson Copeland', 'Performer', 'Scroll Copeland'] },
  { name: 'Danfoss', category: 'compressors', common: true, aliases: ['Danfoss Maneurop', 'Maneurop', 'Turbocor'] },
  { name: 'Bitzer', category: 'compressors', common: true },
  { name: 'Emerson', category: 'compressors', common: true },
  { name: 'Tecumseh', category: 'compressors', common: true, aliases: ['Tecumseh Europe', 'L Unite Hermetique'] },
  { name: 'Embraco', category: 'compressors', common: true, aliases: ['Nidec Embraco'] },
  { name: 'Secop', category: 'compressors', common: true },
  { name: 'Sanyo', category: 'compressors', common: true },
  { name: 'GMCC', category: 'compressors', common: true, aliases: ['GMCC Wanbao'] },
  { name: 'Highly', category: 'compressors', common: true },
  { name: 'Bock', category: 'compressors', aliases: ['GEA Bock'] },
  { name: 'Frascold', category: 'compressors' },
  { name: 'Dorin', category: 'compressors' },
  { name: 'Refcomp', category: 'compressors' },
  { name: 'Mycom', category: 'compressors', aliases: ['Mayekawa'] },
  { name: 'Bristol', category: 'compressors', aliases: ['Bristol Compressors'] },
  { name: 'Carlyle', category: 'compressors', aliases: ['Carlyle Compressor'] },
  { name: 'Kulthorn', category: 'compressors', aliases: ['Kulthorn Kirby'] },
  { name: 'Rechi', category: 'compressors', aliases: ['Rechi Precision'] },
  { name: 'Grasso', category: 'compressors', aliases: ['GEA Grasso'] },
  { name: 'Sabroe', category: 'compressors' },
  { name: 'Howden', category: 'compressors' },
  { name: 'Frick', category: 'compressors' },
  { name: 'Vilter', category: 'compressors' },

  // Thermostats, controllers, valves and building controls.
  { name: 'Honeywell', category: 'controls', common: true, aliases: ['Honeywell Home'] },
  { name: 'Johnson Controls', category: 'controls', common: true },
  { name: 'Siemens', category: 'controls', common: true },
  { name: 'Schneider Electric', category: 'controls', common: true, aliases: ['Schneider'] },
  { name: 'Carel', category: 'controls', common: true },
  { name: 'Dixell', category: 'controls', common: true, aliases: ['Emerson Dixell'] },
  { name: 'Sporlan', category: 'controls', common: true, aliases: ['Parker Sporlan'] },
  { name: 'Eliwell', category: 'controls' },
  { name: 'Evco', category: 'controls' },
  { name: 'LAE', category: 'controls', aliases: ['LAE Electronic'] },
  { name: 'Full Gauge', category: 'controls' },
  { name: 'Ranco', category: 'controls' },
  { name: 'Robertshaw', category: 'controls' },
  { name: 'White-Rodgers', category: 'controls' },
  { name: 'Saginomiya', category: 'controls' },
  { name: 'Alco', category: 'controls', aliases: ['Alco Controls'] },
  { name: 'Parker', category: 'controls', aliases: ['Parker Hannifin'] },
  { name: 'Castel', category: 'controls' },
  { name: 'Belimo', category: 'controls' },
  { name: 'Fuji Electric', category: 'controls' },

  // Fans, air handling and ductwork.
  { name: 'ebm-papst', category: 'ventilation', common: true },
  { name: 'Systemair', category: 'ventilation', common: true },
  { name: 'Greenheck', category: 'ventilation', common: true },
  { name: 'Vent-Axia', category: 'ventilation', common: true },
  { name: 'Soler & Palau', category: 'ventilation', common: true },
  { name: 'Ziehl-Abegg', category: 'ventilation' },
  { name: 'Rosenberg', category: 'ventilation' },
  { name: 'Nicotra', category: 'ventilation', aliases: ['Nicotra Gebhardt'] },
  { name: 'Loren Cook', category: 'ventilation' },
  { name: 'Twin City Fan', category: 'ventilation', aliases: ['Twin City'] },
  { name: 'Fantech', category: 'ventilation' },
  { name: 'FlaktGroup', category: 'ventilation' },
  { name: 'Xpelair', category: 'ventilation' },
  { name: 'Nuaire', category: 'ventilation' },
  { name: 'Manrose', category: 'ventilation' },
  { name: 'Zehnder', category: 'ventilation' },
  { name: 'Aldes', category: 'ventilation' },
  { name: 'Swegon', category: 'ventilation' },
  { name: 'Lindab', category: 'ventilation' },
  { name: 'Trox', category: 'ventilation' },
  { name: 'Östberg', category: 'ventilation' },
  { name: 'Blauberg', category: 'ventilation' },
  { name: 'Vortice', category: 'ventilation' },
  { name: 'Titus', category: 'ventilation' },
  { name: 'Krueger', category: 'ventilation' },
  { name: 'Munters', category: 'ventilation' },

  // Boilers, water heaters and heat pumps.
  { name: 'Viessmann', category: 'heating', common: true },
  { name: 'Vaillant', category: 'heating', common: true },
  { name: 'Worcester Bosch', category: 'heating', common: true, aliases: ['Worcester'] },
  { name: 'Rinnai', category: 'heating', common: true },
  { name: 'Baxi', category: 'heating', aliases: ['Potterton'] },
  { name: 'Remeha', category: 'heating' },
  { name: 'Lochinvar', category: 'heating' },
  { name: 'A.O. Smith', category: 'heating' },
  { name: 'Ariston', category: 'heating' },
  { name: 'Stiebel Eltron', category: 'heating' },
  { name: 'Thermann', category: 'heating' },
  { name: 'NIBE', category: 'heating' },
  { name: 'Glen Dimplex', category: 'heating', aliases: ['Dimplex'] },
  { name: 'Ochsner', category: 'heating' },
  { name: 'Alpha Innotec', category: 'heating' },
  { name: 'Buderus', category: 'heating' },
  { name: 'Junkers', category: 'heating' },
  { name: 'Ferroli', category: 'heating' },
  { name: 'Immergas', category: 'heating' },
  { name: 'Riello', category: 'heating' },
  { name: 'Weishaupt', category: 'heating' },

  // Chillers, air handling units and heat rejection.
  { name: 'Aermec', category: 'applied' },
  { name: 'McQuay', category: 'applied' },
  { name: 'Dunham-Bush', category: 'applied' },
  { name: 'Smardt', category: 'applied' },
  { name: 'Climaveneta', category: 'applied' },
  { name: 'Bluebox', category: 'applied' },
  { name: 'Kaltra', category: 'applied' },
  { name: 'Airedale', category: 'applied' },
  { name: 'Multistack', category: 'applied' },
  { name: 'Baltimore Aircoil', category: 'applied' },
  { name: 'Evapco', category: 'applied' },
  { name: 'Marley', category: 'applied', aliases: ['SPX Marley'] },
  { name: 'Brentwood', category: 'applied' },

  // Insulation, filters, pumps and other parts fitted to equipment.
  { name: 'Armacell', category: 'components', common: true },
  { name: 'Camfil', category: 'components', common: true },
  { name: 'Grundfos', category: 'components', common: true },
  { name: 'Mann+Hummel', category: 'components', common: true },
  { name: 'K-Flex', category: 'components' },
  { name: 'Rockwool', category: 'components' },
  { name: 'Isover', category: 'components' },
  { name: 'Kingspan', category: 'components' },
  { name: 'Aeroflex', category: 'components' },
  { name: 'Superlon', category: 'components' },
  { name: 'Kaiflex', category: 'components' },
  { name: 'Donaldson', category: 'components' },
  { name: 'Koch Filter', category: 'components' },
  { name: 'Flanders', category: 'components' },
  { name: 'Purolator', category: 'components' },
  { name: 'Trion', category: 'components' },
  { name: 'Wilo', category: 'components' },
  { name: 'Bell & Gossett', category: 'components' },
  { name: 'Baldor', category: 'components' },
  { name: 'Leeson', category: 'components' },
  { name: 'Nidec', category: 'components' },
  { name: 'Wika', category: 'components' },
  { name: 'Dwyer', category: 'components' },
  { name: 'Mueller', category: 'components' },
  { name: 'Henry Technologies', category: 'components' },

  // Refrigerant makers and their well-known product lines.
  { name: 'Chemours', category: 'refrigerants', common: true, aliases: ['Freon', 'Suva', 'Isceon'] },
  { name: 'Genetron', category: 'refrigerants', common: true, aliases: ['Honeywell Genetron'] },
  { name: 'Klea', category: 'refrigerants', aliases: ['Orbia', 'Mexichem'] },
  { name: 'Forane', category: 'refrigerants', aliases: ['Arkema'] },
  { name: 'Solvay', category: 'refrigerants' },
  { name: 'A-Gas', category: 'refrigerants' },
  { name: 'National Refrigerants', category: 'refrigerants' },
  { name: 'Linde', category: 'refrigerants' },
];

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

interface Key {
  key: string;
  brand: string;
  common: boolean;
  order: number;
}

const KEYS: Key[] = [];
for (const brand of BRANDS) {
  for (const label of [brand.name, ...(brand.aliases ?? [])]) {
    KEYS.push({
      key: normalize(label),
      brand: brand.name,
      common: brand.common === true,
      order: KEYS.length,
    });
  }
}

const KEY_BY_TEXT = new Map<string, Key>();
for (const key of KEYS) {
  if (!KEY_BY_TEXT.has(key.key)) KEY_BY_TEXT.set(key.key, key);
}

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

  const exact = KEY_BY_TEXT.get(key);
  if (exact) return { kind: 'exact', brand: exact.brand, suggestions: [] };

  const ranked = KEYS
    .map((k) => ({ ...k, distance: editDistance(key, k.key) }))
    .sort((a, b) => a.distance - b.distance || Number(b.common) - Number(a.common) || a.order - b.order);
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

  // Longest phrases first, so "Emerson Copeland" resolves to Copeland rather than Emerson, and a
  // three-word name such as "A.O. Smith" or "Ice-O-Matic" is matched as a whole.
  const grams: string[] = [];
  for (let size = Math.min(3, words.length); size >= 1; size--) {
    for (let i = 0; i + size <= words.length; i++) {
      grams.push(words.slice(i, i + size).join(' '));
    }
  }

  for (const gram of grams) {
    const match = KEY_BY_TEXT.get(normalize(gram));
    if (match) return { brand: match.brand, matchedText: gram, corrected: false };
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
