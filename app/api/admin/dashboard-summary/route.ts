import { NextResponse } from 'next/server';
import { and, count, eq, gte, inArray, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { supplierReorders, technicians } from '@/db/schema/index';
import { ZIMBABWE_PROVINCES } from '@/constants/registry';
import { requireRole } from '@/lib/server/auth';
import { rangeMsFor, type SimpleDateRange } from '@/lib/dateRange';

/** The admin dashboard's headline figures, worked out in the database rather than the browser. */
export async function GET(req: Request) {
  try {
    await requireRole(req, ['org_admin']);
  } catch (e) {
    return e as Response;
  }

  const url = new URL(req.url);
  const rangeParam = url.searchParams.get('range');
  const range: SimpleDateRange = rangeParam === 'week' || rangeParam === 'month' ? rangeParam : 'today';
  const province = url.searchParams.get('province');
  const since = new Date(Date.now() - rangeMsFor(range));
  const inProvince = province && province !== 'all' ? eq(technicians.province, province) : undefined;

  const [byStatus, provinces, pending, volume] = await Promise.all([
    db.select({ status: technicians.status, total: count() }).from(technicians).where(inProvince).groupBy(technicians.status),
    db.selectDistinct({ province: technicians.province }).from(technicians),
    db.select({ total: count() }).from(supplierReorders).where(inArray(supplierReorders.status, ['pending_hevacraz', 'pending_nou'])),
    db
      .select({ kg: sql<string>`coalesce(sum(${supplierReorders.quantityKg}), 0)` })
      .from(supplierReorders)
      .where(and(gte(supplierReorders.createdAt, since))),
  ]);

  const totalTechnicians = byStatus.reduce((sum, row) => sum + Number(row.total), 0);
  const activeTechnicians = byStatus.filter((row) => row.status === 'active').reduce((sum, row) => sum + Number(row.total), 0);
  const knownProvinceNames = new Set(ZIMBABWE_PROVINCES.map(({ name }) => name));
  const provinceCount = provinces.filter(({ province }) => knownProvinceNames.has(province)).length;

  return NextResponse.json({
    range,
    province: province && province !== 'all' ? province : null,
    technicians: { total: totalTechnicians, active: activeTechnicians },
    regionsWithTechnicians: province && province !== 'all'
      ? (totalTechnicians > 0 && knownProvinceNames.has(province) ? 1 : 0)
      : provinceCount,
    reorders: { pendingReviews: Number(pending[0]?.total ?? 0), volumeKgInPeriod: Number(volume[0]?.kg ?? 0) },
  });
}
