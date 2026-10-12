import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { gasUsageLogs, plannerJobs, refrigerants, supplierApplications } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import type { RefrigerantLog } from '@/types/index';
import { isFieldWorkerRole } from '@/lib/field-worker';

const gasLogSchema = z.object({
  id: z.uuid(),
  clientName: z.string().trim().min(1).max(200),
  location: z.string().trim().max(300).optional().default(''),
  plannerJobId: z.uuid().optional(),
  jobType: z.enum(['C40_FREEZER', 'C60_FREEZER', 'C90_FREEZER', 'COLD_ROOM', 'FREEZER_ROOM']),
  refrigerantId: z.number().int().positive().optional(),
  refrigerantType: z.string().trim().min(1).max(120),
  amount: z.number().finite().positive().max(10000),
  actionType: z.enum(['Charge', 'Recovery', 'Leak Repair']),
  timestamp: z.iso.datetime().transform((value) => new Date(value)),
  approvedSupplierId: z.uuid().optional(),
  pesepayTransactionId: z.string().trim().max(200).optional(),
});
const gasLogBatchSchema = z.object({ logs: z.array(gasLogSchema).min(1).max(100) });

function numericReference(value: string | null | undefined): string | null {
  if (!value || !/^-?\d+(?:\.\d+)?$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed.toString() : null;
}

function toRefrigerantLog(row: typeof gasUsageLogs.$inferSelect): RefrigerantLog {
  return {
    id: row.id,
    technicianId: row.technicianId,
    technicianName: row.technicianName,
    clientName: row.clientName,
    location: row.location,
    plannerJobId: row.plannerJobId ?? undefined,
    jobType: row.jobType as RefrigerantLog['jobType'],
    refrigerantId: row.refrigerantId ?? undefined,
    refrigerantType: row.refrigerantType,
    refrigerantClass: (row.refrigerantClass ?? undefined) as RefrigerantLog['refrigerantClass'],
    amount: Number(row.amount),
    actionType: row.actionType as RefrigerantLog['actionType'],
    timestamp: row.timestamp.toISOString(),
    approvedSupplierId: row.approvedSupplierId ?? undefined,
    approvedSupplierName: row.approvedSupplierName ?? undefined,
    supplierVerified: row.supplierVerified ?? undefined,
    pesepayTransactionId: row.pesepayTransactionId ?? undefined,
    odp: row.odp ? Number(row.odp) : undefined,
    gwp: row.gwp ? Number(row.gwp) : undefined,
    co2EqEmissions: row.co2EqEmissions ? Number(row.co2EqEmissions) : undefined,
    ashraeSafetyClass: (row.ashraeSafetyClass ?? undefined) as RefrigerantLog['ashraeSafetyClass'],
    supplierId: row.supplierId ?? undefined,
    purchaseTransactionId: row.purchaseTransactionId ?? undefined,
  };
}

export async function POST(req: Request) {
  let session;
  try {
    session = await requireRole(req, ['technician', 'contractor']);
  } catch (e) {
    return e as Response;
  }

  let logs: z.infer<typeof gasLogBatchSchema>['logs'];
  try {
    const parsed = gasLogBatchSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid gas log batch', details: parsed.error.issues }, { status: 400 });
    logs = parsed.data.logs;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (logs.some((log) => log.timestamp.getTime() > Date.now() + 24 * 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Log timestamps cannot be more than 24 hours in the future' }, { status: 400 });
  }
  const refrigerantIds = [...new Set(logs.flatMap((log) => log.refrigerantId ? [log.refrigerantId] : []))];
  const refrigerantRows = refrigerantIds.length
    ? await db.select().from(refrigerants).where(sql`${refrigerants.id} in (${sql.join(refrigerantIds.map((id) => sql`${id}`), sql`, `)})`)
    : [];
  const refrigerantById = new Map(refrigerantRows.map((row) => [row.id, row]));
  if (logs.some((log) => log.refrigerantId && !refrigerantById.has(log.refrigerantId))) {
    return NextResponse.json({ error: 'One or more refrigerant IDs do not exist' }, { status: 400 });
  }
  // A log can only be linked to a planner job that belongs to the person logging it.
  const jobIds = [...new Set(logs.flatMap((log) => log.plannerJobId ? [log.plannerJobId] : []))];
  if (jobIds.length > 0) {
    const ownJobs = await db.select({ id: plannerJobs.id }).from(plannerJobs).where(and(
      sql`${plannerJobs.id} in (${sql.join(jobIds.map((id) => sql`${id}`), sql`, `)})`,
      eq(plannerJobs.technicianId, session.id),
    ));
    const ownIds = new Set(ownJobs.map((job) => job.id));
    if (jobIds.some((id) => !ownIds.has(id))) {
      return NextResponse.json({ error: 'A linked planner job was not found among your jobs' }, { status: 400 });
    }
  }
  const supplierIds = [...new Set(logs.flatMap((log) => log.approvedSupplierId ? [log.approvedSupplierId] : []))];
  const supplierRows = supplierIds.length
    ? await db.select().from(supplierApplications).where(and(
        sql`${supplierApplications.id} in (${sql.join(supplierIds.map((id) => sql`${id}`), sql`, `)})`,
        eq(supplierApplications.status, 'approved'),
      ))
    : [];
  const suppliersById = new Map(supplierRows.map((row) => [row.id, row]));
  if (supplierIds.some((id) => !suppliersById.has(id))) {
    return NextResponse.json({ error: 'Supplier must be an approved supplier' }, { status: 400 });
  }

  const inserted = await db
    .insert(gasUsageLogs)
    .values(
      logs.map((log) => ({
        clientLogId: log.id,
        technicianId: session.id,
        technicianName: session.name,
        clientName: log.clientName,
        location: log.location ?? '',
        plannerJobId: log.plannerJobId ?? null,
        jobType: log.jobType,
        refrigerantId: log.refrigerantId ?? null,
        refrigerantType: log.refrigerantId
          ? (refrigerantById.get(log.refrigerantId)?.ashraeCode || refrigerantById.get(log.refrigerantId)?.odsName || log.refrigerantType)
          : log.refrigerantType,
        refrigerantClass: log.refrigerantId ? refrigerantById.get(log.refrigerantId)?.ashraeSafetyGroup ?? null : null,
        amount: log.amount.toString(),
        actionType: log.actionType,
        timestamp: new Date(log.timestamp),
        approvedSupplierId: log.approvedSupplierId ?? null,
        approvedSupplierName: log.approvedSupplierId ? suppliersById.get(log.approvedSupplierId)?.companyName ?? null : null,
        supplierVerified: Boolean(log.approvedSupplierId),
        pesepayTransactionId: log.pesepayTransactionId ?? null,
        odp: log.refrigerantId ? numericReference(refrigerantById.get(log.refrigerantId)?.odp) : null,
        gwp: log.refrigerantId ? numericReference(refrigerantById.get(log.refrigerantId)?.gwp) : null,
        co2EqEmissions: null,
        ashraeSafetyClass: log.refrigerantId ? refrigerantById.get(log.refrigerantId)?.ashraeSafetyGroup ?? null : null,
        supplierId: log.approvedSupplierId ?? null,
        purchaseTransactionId: null,
      }))
    )
    .onConflictDoNothing({ target: gasUsageLogs.clientLogId })
    .returning();

  return NextResponse.json(inserted.map(toRefrigerantLog), { status: 201 });
}

export async function GET(req: Request) {
  let session;
  try {
    session = await requireRole(req, ['technician', 'contractor', 'trainer', 'lecturer', 'org_admin']);
  } catch (e) {
    return e as Response;
  }

  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const requestedLimit = Number(url.searchParams.get('limit') ?? 100);
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1) {
    return NextResponse.json({ error: 'limit must be a positive integer' }, { status: 400 });
  }
  const limit = Math.min(requestedLimit, 500);

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
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(sql`${gasUsageLogs.timestamp} DESC`)
    .limit(limit);

  return NextResponse.json(rows.map(toRefrigerantLog));
}
