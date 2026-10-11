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
});
