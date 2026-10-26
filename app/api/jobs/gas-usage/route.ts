import { and, eq, gte, lte } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { gasUsageLogs } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import { JobType, JobTypeLabels, GasUsageByJobTypeEntry, GasUsageByJobTypeResponse } from '@/types/index';
import { isFieldWorkerRole } from '@/lib/field-worker';

export async function GET(req: Request) {
  let session;
  try {
    session = await requireRole(req, ['technician', 'contractor', 'org_admin']);
  } catch (e) {
    return e as Response;
  }

  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  const fromDate = from ? new Date(from) : undefined;
  const toDate = to ? new Date(to) : undefined;
  if ((fromDate && Number.isNaN(fromDate.getTime())) || (toDate && Number.isNaN(toDate.getTime()))) {
    return NextResponse.json({ error: 'Invalid date filter' }, { status: 400 });
  }
  if (fromDate && toDate && fromDate > toDate) {
    return NextResponse.json({ error: 'from must be before or equal to to' }, { status: 400 });
  }

  const conditions = [];
  if (isFieldWorkerRole(session.role)) conditions.push(eq(gasUsageLogs.technicianId, session.id));
  if (fromDate) conditions.push(gte(gasUsageLogs.timestamp, fromDate));
  if (toDate) conditions.push(lte(gasUsageLogs.timestamp, toDate));
  const rows = await db.select().from(gasUsageLogs)
    .where(conditions.length ? and(...conditions) : undefined);

  // Aggregate by job type
  const byJobType = new Map<JobType, {
    totalKg: number;
    chargeKg: number;
    recoveryKg: number;
    leakRepairKg: number;
    count: number;
    refrigerants: Set<string>;
  }>();

  for (const log of rows) {
    const jt = log.jobType as JobType;
    if (!byJobType.has(jt)) {
      byJobType.set(jt, {
        totalKg: 0,
        chargeKg: 0,
        recoveryKg: 0,
        leakRepairKg: 0,
        count: 0,
        refrigerants: new Set(),
      });
    }
    const entry = byJobType.get(jt)!;
    const amount = Number(log.amount);
    entry.totalKg += amount;
    entry.count += 1;
    entry.refrigerants.add(log.refrigerantType);
    if (log.actionType === 'Charge') entry.chargeKg += amount;
    else if (log.actionType === 'Recovery') entry.recoveryKg += amount;
    else if (log.actionType === 'Leak Repair') entry.leakRepairKg += amount;
  }

  const entries: GasUsageByJobTypeEntry[] = Array.from(byJobType.entries())
    .sort(([a], [b]) => JobTypeLabels[a].localeCompare(JobTypeLabels[b]))
    .map(([jobType, data]) => ({
      jobType,
      label: JobTypeLabels[jobType] ?? jobType,
      totalKg: Math.round(data.totalKg * 100) / 100,
      chargeKg: Math.round(data.chargeKg * 100) / 100,
      recoveryKg: Math.round(data.recoveryKg * 100) / 100,
      leakRepairKg: Math.round(data.leakRepairKg * 100) / 100,
      count: data.count,
      refrigerants: Array.from(data.refrigerants).sort(),
    }));

  const totalKg = Math.round(entries.reduce((sum, e) => sum + e.totalKg, 0) * 100) / 100;
  const totalEntries = rows.length;

  const response: GasUsageByJobTypeResponse = { entries, totalKg, totalEntries };

  return NextResponse.json(response);
}
