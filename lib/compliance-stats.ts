// Figures for the admin Compliance Report. Pure, so the period rules can be tested. The API route
// aggregates in the database and reuses these helpers, so the browser never downloads the registry.

export type CompliancePeriod = 'ytd' | '12m' | 'all';

export const PERIOD_LABEL: Record<CompliancePeriod, string> = {
  ytd: 'Year to date',
  '12m': 'Last 12 months',
  all: 'All time',
};

/** Refrigerants treated as natural for the natural-gas share. */
export const NATURAL_REFRIGERANTS: ReadonlySet<string> = new Set(['R-290', 'R-600a', 'R-744', 'R-717', 'R-1270']);

export interface ReorderLike {
  status: string;
  gasType: string;
  quantityKg: number;
  createdAt: string;
}

/** The first moment of the chosen period, or null for all time. */
export function periodStart(period: CompliancePeriod, now: number): number | null {
  const date = new Date(now);
  if (period === 'ytd') return Date.UTC(date.getUTCFullYear(), 0, 1);
  if (period === '12m') return Date.UTC(date.getUTCFullYear() - 1, date.getUTCMonth(), date.getUTCDate());
  return null;
}

export interface ComplianceKpis {
  approvedKg: number;
  gwpImpactTonnes: number;
  naturalSharePct: number;
  /** Reorders waiting for review right now, whatever the period. */
  pendingReviewCount: number;
}

/** One row per (status, gas type) already summed by the database for the selected period. */
export interface ReorderGroupTotal {
  status: string;
  gasType: string;
  quantityKg: number;
}

export function summarizeReorderTotals(
  groups: ReorderGroupTotal[],
  input: {
    pendingReviewCount: number;
    gwpOf: (gasType: string) => number | undefined;
    naturalGases: ReadonlySet<string>;
  },
): ComplianceKpis {
  let approvedKg = 0;
  let gwpImpact = 0;
  let naturalKg = 0;
  for (const group of groups) {
    if (group.status !== 'approved' || !Number.isFinite(group.quantityKg)) continue;
    approvedKg += group.quantityKg;
    gwpImpact += (group.quantityKg * (input.gwpOf(group.gasType) ?? 0)) / 1000;
    if (input.naturalGases.has(group.gasType)) naturalKg += group.quantityKg;
  }
  return {
    approvedKg: Math.round(approvedKg),
    gwpImpactTonnes: Math.round(gwpImpact),
    naturalSharePct: approvedKg > 0 ? Math.round((naturalKg / approvedKg) * 100) : 0,
    pendingReviewCount: input.pendingReviewCount,
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Approved volume per calendar month for the last `months` months, oldest first. */
export function monthlyApprovedKg(reorders: ReorderLike[], months: number, now: number): Array<{ month: string; kg: number }> {
  const current = new Date(now);
  const buckets: Array<{ key: string; month: string; kg: number }> = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - i, 1));
    buckets.push({ key: `${d.getUTCFullYear()}-${d.getUTCMonth()}`, month: months > 6 ? `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}` : MONTHS[d.getUTCMonth()], kg: 0 });
  }
  for (const reorder of reorders) {
    if (reorder.status !== 'approved') continue;
    const created = new Date(reorder.createdAt);
    if (Number.isNaN(created.getTime())) continue;
    const bucket = buckets.find((b) => b.key === `${created.getUTCFullYear()}-${created.getUTCMonth()}`);
    if (bucket) bucket.kg += reorder.quantityKg;
  }
  return buckets.map(({ month, kg }) => ({ month, kg: Math.round(kg) }));
}

export interface ExpiringCertificate {
  technicianId: string;
  technicianName: string;
  certificate: string;
  expiryDate: string;
  daysLeft: number;
}

/** Certificates expiring within `withinDays` (or already expired), soonest first. */
export function expiringCertificates(
  technicians: Array<{ id: string; name: string; status?: string; certifications: Array<{ name: string; expiryDate?: string | null }> }>,
  now: number,
  withinDays = 90,
  limit = 6,
): ExpiringCertificate[] {
  const DAY = 86_400_000;
  const rows: ExpiringCertificate[] = [];
  for (const technician of technicians) {
    if (technician.status && technician.status !== 'active') continue;
    for (const cert of technician.certifications) {
      const expiry = cert.expiryDate ? new Date(cert.expiryDate).getTime() : Number.NaN;
      if (!Number.isFinite(expiry)) continue;
      const daysLeft = Math.ceil((expiry - now) / DAY);
      if (daysLeft <= withinDays) {
        rows.push({ technicianId: technician.id, technicianName: technician.name, certificate: cert.name, expiryDate: cert.expiryDate as string, daysLeft });
      }
    }
  }
  return rows.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, limit);
}

export interface LeakRepairAlert {
  id: string;
  technicianName: string;
  clientName: string;
  refrigerantType: string;
  amountKg: number;
  timestamp: string;
}

export interface ComplianceSummary {
  period: CompliancePeriod;
  kpis: ComplianceKpis & { activeTechnicians: number; validCertificates: number };
  monthlyVolume: Array<{ month: string; kg: number }>;
  expiringCertificates: ExpiringCertificate[];
  leakRepairs: { total: number; alerts: LeakRepairAlert[] };
}
