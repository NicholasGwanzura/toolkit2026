import { NextResponse } from 'next/server';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { gasUsageLogs } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import { REFRIGERANT_REFERENCE } from '@/constants/refrigerants';
import { emissionsAvoidedTonnes, totalKg, type RecoveryRow } from '@/lib/recovery-emissions';

const firstCharges = and(eq(gasUsageLogs.firstCharge, true), eq(gasUsageLogs.actionType, 'Charge'));

/** First-time charges of new systems across the country: the refrigerant newly put into service. */
export async function GET(req: Request) {
  try {
    await requireRole(req, ['org_admin']);
  } catch (e) {
    return e as Response;
  }

  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [byGas, [last30], recent] = await Promise.all([
    db
      .select({
        refrigerant: gasUsageLogs.refrigerantType,
        kg: sql<string>`coalesce(sum(${gasUsageLogs.amount}), 0)`,
        count: sql<number>`count(*)::int`,
        gwp: sql<string | null>`max(${gasUsageLogs.gwp})`,
      })
      .from(gasUsageLogs)
      .where(firstCharges)
      .groupBy(gasUsageLogs.refrigerantType),
    db
      .select({ kg: sql<string>`coalesce(sum(${gasUsageLogs.amount}), 0)`, count: sql<number>`count(*)::int` })
      .from(gasUsageLogs)
      .where(and(firstCharges, gte(gasUsageLogs.timestamp, since30))),
    db
      .select({
        id: gasUsageLogs.id,
        timestamp: gasUsageLogs.timestamp,
        technicianName: gasUsageLogs.technicianName,
        clientName: gasUsageLogs.clientName,
        location: gasUsageLogs.location,
        refrigerantType: gasUsageLogs.refrigerantType,
        amount: gasUsageLogs.amount,
      })
      .from(gasUsageLogs)
      .where(firstCharges)
      .orderBy(desc(gasUsageLogs.timestamp))
      .limit(10),
  ]);

  const rows: RecoveryRow[] = byGas.map((row) => ({ refrigerant: row.refrigerant, kg: Number(row.kg), gwp: row.gwp === null ? null : Number(row.gwp) }));
  return NextResponse.json({
    count: byGas.reduce((sum, row) => sum + row.count, 0),
    kg: totalKg(rows),
    // The climate weight of the gas now in these systems: what a leak or poor end-of-life would release.
    co2eTonnes: emissionsAvoidedTonnes(rows, (name) => REFRIGERANT_REFERENCE[name]?.gwp),
    last30Days: { count: last30?.count ?? 0, kg: Number(last30?.kg ?? 0) },
    byRefrigerant: byGas.map((row) => ({ refrigerant: row.refrigerant, kg: Number(row.kg), count: row.count })).sort((a, b) => b.kg - a.kg),
    recent: recent.map((row) => ({ ...row, amount: Number(row.amount), timestamp: row.timestamp.toISOString() })),
  });
}
