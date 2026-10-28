import { describe, expect, it } from 'vitest';
import { BRANDS, findBrandInText, matchBrand, resolveManufacturer } from './nameplate-brands';

describe('matchBrand', () => {
  it('recognises exact names and aliases whatever the case or spacing', () => {
    expect(matchBrand('daikin')).toMatchObject({ kind: 'exact', brand: 'Daikin' });
    expect(matchBrand(' LG  Electronics ')).toMatchObject({ kind: 'exact', brand: 'LG' });
    expect(matchBrand('Mitsubishi Heavy')).toMatchObject({ kind: 'exact', brand: 'Mitsubishi' });
    expect(matchBrand('Performer')).toMatchObject({ kind: 'exact', brand: 'Copeland' });
    expect(matchBrand('Hill-Phoenix')).toMatchObject({ kind: 'exact', brand: 'Hill Phoenix' });
  });

  it('corrects small misreads of longer names', () => {
    expect(matchBrand('DAIKlN')).toMatchObject({ kind: 'close', brand: 'Daikin' });
    expect(matchBrand('CARRIEA')).toMatchObject({ kind: 'close', brand: 'Carrier' });
    expect(matchBrand('Hisence')).toMatchObject({ kind: 'close', brand: 'Hisense' });
    expect(matchBrand('Mitsubishl')).toMatchObject({ kind: 'close', brand: 'Mitsubishi' });
  });

  it('never "corrects" short names', () => {
    expect(matchBrand('LX').kind).toBe('none');
    expect(matchBrand('GREEN').kind).not.toBe('close');
    expect(matchBrand('YORKS').kind).not.toBe('close');
  });

  it('does not guess between two brands', () => {
    // One letter from both Bitzer and Bock-like names would be a tie; unknown names stay unknown.
    expect(matchBrand('Zzzzzz').kind).toBe('none');
    expect(matchBrand('').kind).toBe('none');
    expect(matchBrand(undefined).kind).toBe('none');
  });

  it('offers suggestions when nothing matched confidently', () => {
    const result = matchBrand('Daikinn Ltd');
    expect(result.kind).toBe('none');
    expect(result.suggestions).toContain('Daikin');
  });
});

describe('findBrandInText', () => {
  const plate = (extra: string) => `SCROLL COMPRESSOR\nMODEL: SZ185S4CC\n${extra}\nSERIAL: QL11 4980907\nR-410A`;

  it('finds an exact brand anywhere in the text', () => {
    expect(findBrandInText(plate('Made by Danfoss in Denmark'))).toMatchObject({ brand: 'Danfoss', corrected: false });
  });
  it('finds two-word brands', () => {
    expect(findBrandInText('Kysor Warren condensing unit')).toMatchObject({ brand: 'Kysor Warren' });
  });
  it('finds a slightly misread brand', () => {
    expect(findBrandInText(plate('HlSENSE air conditioner'))).toMatchObject({ brand: 'Hisense', corrected: true });
    expect(findBrandInText(plate('DAIKlN INDUSTRIES'))).toMatchObject({ brand: 'Daikin', corrected: true });
  });
  it('does not mistake ordinary plate words for brands', () => {
    expect(findBrandInText('GREEN LABEL VOLTAGE 230V REFRIGERANT CHARGE COMPRESSOR TESTED YORKSHIRE')).toBeUndefined();
    expect(findBrandInText('')).toBeUndefined();
    expect(findBrandInText(null)).toBeUndefined();
  });
  it('prefers an exact brand over a correction elsewhere in the text', () => {
    expect(findBrandInText('DAIKlN parts fitted to a Bitzer unit')).toMatchObject({ brand: 'Bitzer', corrected: false });
  });
});

describe('resolveManufacturer', () => {
  it('tidies a detected name', () => {
    expect(resolveManufacturer('DAIKlN', '')).toMatchObject({ value: 'Daikin', source: 'corrected', from: 'DAIKlN' });
    expect(resolveManufacturer('daikin', '')).toMatchObject({ value: 'Daikin', source: 'detected' });
  });
  it('finds a brand when none was detected', () => {
    expect(resolveManufacturer(undefined, 'Hisense Zimbabwe\nModel AS-12')).toMatchObject({ value: 'Hisense', source: 'found' });
  });
  it('keeps an unknown name as read and offers suggestions', () => {
    const r = resolveManufacturer('Daikinn Ltd', '');
    expect(r).toMatchObject({ value: 'Daikinn Ltd', source: 'unrecognised' });
    expect(r.suggestions).toContain('Daikin');
  });
  it('is empty when there is nothing to go on', () => {
    expect(resolveManufacturer(undefined, 'MODEL ABC123 SERIAL 99')).toMatchObject({ value: undefined, source: 'none' });
  });
});

describe('BRANDS', () => {
  it('has no duplicate names', () => {
    const names = BRANDS.map((b) => b.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it('keeps every name and alias pointing at its own brand', () => {
    for (const brand of BRANDS) {
      for (const label of [brand.name, ...(brand.aliases ?? [])]) {
        expect(matchBrand(label), label).toMatchObject({ kind: 'exact', brand: brand.name });
      }
    }
  });

  it('covers equipment, components and refrigerants', () => {
    const categories = new Set(BRANDS.map((b) => b.category));
    expect(categories.size).toBe(9);
    expect(BRANDS.length).toBeGreaterThanOrEqual(180);
  });
});

describe('expanded brand coverage', () => {
  it('recognises common equipment and part makers', () => {
    expect(matchBrand('Midea')).toMatchObject({ kind: 'exact', brand: 'Midea' });
    expect(matchBrand('Chigo')).toMatchObject({ kind: 'exact', brand: 'Chigo' });
    expect(matchBrand('Honeywell')).toMatchObject({ kind: 'exact', brand: 'Honeywell' });
    expect(matchBrand('Carel')).toMatchObject({ kind: 'exact', brand: 'Carel' });
    expect(matchBrand('Armacell')).toMatchObject({ kind: 'exact', brand: 'Armacell' });
    expect(matchBrand('Genetron')).toMatchObject({ kind: 'exact', brand: 'Genetron' });
  });

  it('handles accents and punctuation printed on plates', () => {
    expect(matchBrand('Östberg')).toMatchObject({ kind: 'exact', brand: 'Östberg' });
    expect(findBrandInText('FLÄKTGROUP AHU')).toMatchObject({ brand: 'FlaktGroup' });
    expect(findBrandInText('A.O. SMITH water heater')).toMatchObject({ brand: 'A.O. Smith' });
    expect(findBrandInText('ICE-O-MATIC icemaker')).toMatchObject({ brand: 'Ice-O-Matic' });
  });

  it('prefers a longer exact name when the plate carries several words', () => {
    expect(findBrandInText('EMERSON COPELAND scroll')).toMatchObject({ brand: 'Copeland' });
    expect(findBrandInText('GEA BOCK compressor')).toMatchObject({ brand: 'Bock' });
  });

  it('puts common makers first when suggestions are equally close', () => {
    const { suggestions } = matchBrand('Yock');
    expect(suggestions).toContain('York');
    expect(suggestions).toContain('Bock');
    expect(suggestions.indexOf('York')).toBeLessThan(suggestions.indexOf('Bock'));
  });
});
