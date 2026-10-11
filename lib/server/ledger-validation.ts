// Validation for supplier ledger entries. Ledger sales feed quota and NOU reporting, so the
// server never trusts the quantity, the total or the date a client sends.

export const LEDGER_DIRECTIONS = ['purchase', 'sale'] as const;
export const COUNTERPARTY_TYPES = ['importer', 'distributor', 'technician', 'contractor', 'retailer', 'cold-chain-client'] as const;

export const MAX_LEDGER_KG = 1_000_000;
export const MAX_UNIT_PRICE_USD = 100_000;

export interface LedgerEntryValue {
  direction: (typeof LEDGER_DIRECTIONS)[number];
  counterpartyName: string;
  counterpartyCompany?: string;
  counterpartyType: (typeof COUNTERPARTY_TYPES)[number];
  province: string;
  refrigerant: string;
  quantityKg: number;
  unitPriceUsd: number;
  totalValueUsd: number;
  invoiceNumber: string;
  transactionDate: Date;
  referenceMonth: string;
  reportedToNou: boolean;
  clientReported: boolean;
  notes?: string;
}

type Result = { ok: true; value: LedgerEntryValue } | { ok: false; error: string };

const text = (value: unknown, max: number): string => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const num = (value: unknown): number => (typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : Number.NaN);

export function validateLedgerEntry(input: unknown, now: Date = new Date()): Result {
  if (!input || typeof input !== 'object') return { ok: false, error: 'A ledger entry is required.' };
  const body = input as Record<string, unknown>;

  const direction = body.direction;
  if (!LEDGER_DIRECTIONS.includes(direction as never)) return { ok: false, error: 'direction must be "purchase" or "sale".' };

  const counterpartyName = text(body.counterpartyName, 120);
  if (!counterpartyName) return { ok: false, error: 'counterpartyName is required.' };

  const refrigerant = text(body.refrigerant, 30);
  if (!refrigerant) return { ok: false, error: 'refrigerant is required.' };

  const counterpartyType = body.counterpartyType === undefined ? 'distributor' : body.counterpartyType;
  if (!COUNTERPARTY_TYPES.includes(counterpartyType as never)) return { ok: false, error: 'counterpartyType is not a recognised type.' };

  const quantityKg = num(body.quantityKg);
  if (!Number.isFinite(quantityKg) || quantityKg <= 0) return { ok: false, error: 'quantityKg must be greater than zero.' };
  if (quantityKg > MAX_LEDGER_KG) return { ok: false, error: `quantityKg cannot exceed ${MAX_LEDGER_KG.toLocaleString()} kg.` };

  const unitPriceUsd = num(body.unitPriceUsd);
  if (!Number.isFinite(unitPriceUsd) || unitPriceUsd < 0) return { ok: false, error: 'unitPriceUsd must be zero or more.' };
  if (unitPriceUsd > MAX_UNIT_PRICE_USD) return { ok: false, error: 'unitPriceUsd is not a plausible price per kg.' };

  const invoiceNumber = text(body.invoiceNumber, 60);
  if (!invoiceNumber) return { ok: false, error: 'invoiceNumber is required.' };

  const transactionDate = body.transactionDate === undefined || body.transactionDate === '' ? now : new Date(String(body.transactionDate));
  if (Number.isNaN(transactionDate.getTime())) return { ok: false, error: 'transactionDate is not a valid date.' };
  if (transactionDate.getTime() > now.getTime() + 24 * 60 * 60 * 1000) return { ok: false, error: 'transactionDate cannot be in the future.' };

  // The reporting month always follows the transaction date; a client-sent month is not trusted.
  const referenceMonth = transactionDate.toISOString().slice(0, 7);

  return {
    ok: true,
    value: {
      direction: direction as LedgerEntryValue['direction'],
      counterpartyName,
      counterpartyCompany: text(body.counterpartyCompany, 120) || undefined,
      counterpartyType: counterpartyType as LedgerEntryValue['counterpartyType'],
      province: text(body.province, 60),
      refrigerant,
      quantityKg: Math.round(quantityKg * 1000) / 1000,
      unitPriceUsd: Math.round(unitPriceUsd * 100) / 100,
      totalValueUsd: Math.round(quantityKg * unitPriceUsd * 100) / 100,
      invoiceNumber,
      transactionDate,
      referenceMonth,
      reportedToNou: body.reportedToNou === true,
      clientReported: body.clientReported === true,
      notes: text(body.notes, 1000) || undefined,
    },
  };
}
