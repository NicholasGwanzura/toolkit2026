export type UsageRow = { refrigerant: string; totalKg: number; count: number };

/**
 * One display name per refrigerant so "R410A", "r-410a" and "410A" are counted together.
 * Names that are not an R-number (for example "Propane") are only tidied, not renamed.
 */
export function normalizeRefrigerantName(raw: string | null | undefined): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return 'Unspecified';
  const compact = trimmed.replace(/[\s_-]+/g, '').toUpperCase();
  const match = /^R?(\d{2,4}[A-Z]?)$/.exec(compact);
  if (match) return `R-${match[1]}`;
  const blend = /^R?(\d{3})([A-Z])$/.exec(compact);
  if (blend) return `R-${blend[1]}${blend[2]}`;
  return trimmed;
}

/** Merge rows that share a normalised name, sort by the chosen measure and keep the top few. */
export function mergeUsage(rows: UsageRow[], limit: number, sortBy: 'totalKg' | 'count' = 'totalKg'): UsageRow[] {
  const merged = new Map<string, UsageRow>();
  for (const row of rows) {
    const name = normalizeRefrigerantName(row.refrigerant);
    const current = merged.get(name) ?? { refrigerant: name, totalKg: 0, count: 0 };
    current.totalKg += row.totalKg;
    current.count += row.count;
    merged.set(name, current);
  }
  return [...merged.values()]
    .sort((a, b) => b[sortBy] - a[sortBy] || a.refrigerant.localeCompare(b.refrigerant))
    .slice(0, limit)
    .map((r) => ({ ...r, totalKg: Math.round(r.totalKg * 100) / 100 }));
}

/** The last `months` calendar months ending at `now`, with zero for months that have no rows. */
export function fillMonths(rows: { month: string; totalKg: number }[], now: Date, months = 6): { month: string; totalKg: number }[] {
  const byMonth = new Map(rows.map((r) => [r.month, r.totalKg]));
  const out: { month: string; totalKg: number }[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    out.push({ month: key, totalKg: Math.round((byMonth.get(key) ?? 0) * 100) / 100 });
  }
  return out;
}
