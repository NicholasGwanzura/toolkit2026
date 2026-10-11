import { describe, expect, it } from 'vitest';
import { validateLedgerEntry } from './ledger-validation';

const NOW = new Date('2026-10-11T10:00:00Z');
const good = { direction: 'sale', counterpartyName: 'Sam Moyo', counterpartyType: 'technician', refrigerant: 'R-290', quantityKg: 25, unitPriceUsd: 12.5, invoiceNumber: 'INV-1', transactionDate: '2026-10-10T12:00:00.000Z' };

describe('validateLedgerEntry', () => {
  it('accepts a good entry and computes the total itself', () => {
    const r = validateLedgerEntry({ ...good, totalValueUsd: 1 }, NOW);
    expect(r.ok && r.value.totalValueUsd).toBe(312.5);
    expect(r.ok && r.value.referenceMonth).toBe('2026-10');
  });
  it('rejects non-positive or non-numeric quantity', () => {
    for (const q of [0, -5, 'abc', undefined, 2_000_000]) expect(validateLedgerEntry({ ...good, quantityKg: q }, NOW).ok).toBe(false);
  });
  it('rejects bad direction, missing invoice and bad dates', () => {
    expect(validateLedgerEntry({ ...good, direction: 'gift' }, NOW).ok).toBe(false);
    expect(validateLedgerEntry({ ...good, invoiceNumber: '  ' }, NOW).ok).toBe(false);
    expect(validateLedgerEntry({ ...good, transactionDate: 'not a date' }, NOW).ok).toBe(false);
    expect(validateLedgerEntry({ ...good, transactionDate: '2027-01-01T00:00:00Z' }, NOW).ok).toBe(false);
  });
  it('rejects negative price and ignores a client-sent month', () => {
    expect(validateLedgerEntry({ ...good, unitPriceUsd: -1 }, NOW).ok).toBe(false);
    const r = validateLedgerEntry({ ...good, referenceMonth: '1999-01' }, NOW);
    expect(r.ok && r.value.referenceMonth).toBe('2026-10');
  });
  it('rejects a non-object', () => {
    expect(validateLedgerEntry(null, NOW).ok).toBe(false);
  });
});
