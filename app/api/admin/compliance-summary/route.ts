import { NextResponse } from 'next/server';
import { and, count, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { gasUsageLogs, supplierReorders, technicians } from '@/db/schema/index';
import { REFRIGERANT_REFERENCE } from '@/constants/refrigerants';
import { requireRole } from '@/lib/server/auth';
import {
  expiringCertificates,
  monthlyApprovedKg,
  NATURAL_REFRIGERANTS,
  periodStart,
  summarizeReorderTotals,
  type CompliancePeriod,
  type ComplianceSummary,
} from '@/lib/compliance-stats';

const LEAK_LOOKBACK_DAYS = 30;
const LEAK_ALERT_LIMIT = 5;

/** Compliance Report figures, aggregated in the database so the browser never downloads the registry. */
export async function GET(req: Request) {
  try {
    await requireRole(req, ['org_admin']);
  } catch (e) {
    return e as Response;
  }

  const url = new URL(req.url);
  const requested = url.searchParams.get('period');
  const period: CompliancePeriod = requested === '12m' || requested === 'all' ? requested : 'ytd';
  const now = Date.now();
  const start = periodStart(period, now);
  const since = start === null ? undefined : new Date(start);
  const months = period === 'ytd' ? new Date(now).getUTCMonth() + 1 : 12;
  const monthlyStart = new Date(Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth() - (months - 1), 1));
  const leakFrom = new Date(now - LEAK_LOOKBACK_DAYS * 86_400_000);

  try {
    const [approvedGroups, pending, monthlyRows, techRows, leakRows, leakTotal] = await Promise.all([
      db
        .select({
          status: supplierReorders.status,
          gasType: supplierReorders.gasType,
          quantityKg: sql<string>`coalesce(sum(${supplierReorders.quantityKg}), 0)`,
        })
        .from(supplierReorders)
        .where(and(eq(supplierReorders.status, 'approved'), since ? gte(supplierReorders.createdAt, since) : undefined))
        .groupBy(supplierReorders.status, supplierReorders.gasType),
      db
        .select({ total: count() })
        .from(supplierReorders)
        .where(inArray(supplierReorders.status, ['pending_hevacraz', 'pending_nou'])),
      db
        .select({
          month: sql<string>`to_char(date_trunc('month', ${supplierReorders.createdAt} AT TIME ZONE 'UTC'), 'YYYY-MM-DD')`,
          kg: sql<string>`coalesce(sum(${supplierReorders.quantityKg}), 0)`,
        })
        .from(supplierReorders)
        .where(and(eq(supplierReorders.status, 'approved'), gte(supplierReorders.createdAt, monthlyStart)))
        .groupBy(sql`date_trunc('month', ${supplierReorders.createdAt} AT TIME ZONE 'UTC')`),
      db
        .select({ id: technicians.id, name: technicians.name, certifications: technicians.certifications })
        .from(technicians)
        .where(eq(technicians.status, 'active')),
      db
        .select({
          id: gasUsageLogs.id,
          technicianName: gasUsageLogs.technicianName,
          clientName: gasUsageLogs.clientName,
          refrigerantType: gasUsageLogs.refrigerantType,
          amount: gasUsageLogs.amount,
          timestamp: gasUsageLogs.timestamp,
        })
        .from(gasUsageLogs)
        .where(and(eq(gasUsageLogs.actionType, 'Leak Repair'), gte(gasUsageLogs.timestamp, leakFrom)))
        .orderBy(desc(gasUsageLogs.timestamp))
        .limit(LEAK_ALERT_LIMIT),
      db
        .select({ total: count() })
        .from(gasUsageLogs)
        .where(and(eq(gasUsageLogs.actionType, 'Leak Repair'), gte(gasUsageLogs.timestamp, leakFrom))),
    ]);

    const techniciansWithCerts = techRows.map((row) => ({
      id: row.id,
      name: row.name,
      certifications: (row.certifications ?? []) as Array<{ name: string; status?: string; expiryDate?: string | null }>,
    }));

    const kpis = summarizeReorderTotals(
      approvedGroups.map((group) => ({ status: group.status, gasType: group.gasType, quantityKg: Number(group.quantityKg) })),
      {
        pendingReviewCount: Number(pending[0]?.total ?? 0),
        gwpOf: (gasType) => REFRIGERANT_REFERENCE[gasType]?.gwp,
        naturalGases: NATURAL_REFRIGERANTS,
      },
    );

    const summary: ComplianceSummary = {
      period,
      kpis: {
        ...kpis,
        activeTechnicians: techniciansWithCerts.length,
        validCertificates: techniciansWithCerts.reduce(
          (total, technician) => total + technician.certifications.filter((cert) => cert.status === 'valid').length,
          0,
        ),
      },
      // monthlyApprovedKg buckets by month, so one pre-summed row per month is enough.
      monthlyVolume: monthlyApprovedKg(
        monthlyRows.map((row) => ({ status: 'approved', gasType: '', quantityKg: Number(row.kg), createdAt: `${row.month}T00:00:00Z` })),
        months,
        now,
      ),
      expiringCertificates: expiringCertificates(techniciansWithCerts, now),
      leakRepairs: {
        total: Number(leakTotal[0]?.total ?? 0),
        alerts: leakRows.map((row) => ({
          id: row.id,
          technicianName: row.technicianName,
          clientName: row.clientName,
          refrigerantType: row.refrigerantType,
          amountKg: Number(row.amount),
          timestamp: row.timestamp.toISOString(),
        })),
      },
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Compliance summary failed', error);
    return NextResponse.json({ error: 'Could not load the compliance report.' }, { status: 500 });
  }
}
