import { and, desc, eq, gte, isNull, or, sql } from 'drizzle-orm';
import type { db } from '@/db/client';
import { gasUsageLogs, plannerJobs, refrigerants } from '@/db/schema/index';
import { isSameCharge, numericReference, plannerChargeLogId, SAME_CHARGE_WINDOW_MS } from '@/lib/planner-charge';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type PlannerJobRow = typeof plannerJobs.$inferSelect;

/** One charge check at a time per technician, so a job and a hand-written log cannot both slip through. */
export const lockTechnicianCharges = (tx: Tx, technicianId: string) =>
  tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`gas-charge:${technicianId}`}))`);

/**
 * Counts a completed new system in the gas records, exactly once:
 * a log already linked to the job is the record; an identical unlinked log becomes the record;
 * otherwise the job writes its own log, which completing again updates rather than repeats.
 * Returns how the charge was counted. The caller holds the technician lock.
 */
export async function recordNewSystemCharge(tx: Tx, job: PlannerJobRow, now: Date): Promise<'linked' | 'adopted' | 'written'> {
  const logId = plannerChargeLogId(job.id);
  const refrigerantType = job.refrigerantType!;
  const amount = job.amount!;

  const candidates = await tx
    .select()
    .from(gasUsageLogs)
    .where(and(
      eq(gasUsageLogs.technicianId, job.technicianId),
      eq(gasUsageLogs.actionType, 'Charge'),
      or(eq(gasUsageLogs.plannerJobId, job.id), and(isNull(gasUsageLogs.plannerJobId), gte(gasUsageLogs.timestamp, new Date(now.getTime() - SAME_CHARGE_WINDOW_MS)))),
    ))
    .orderBy(desc(gasUsageLogs.timestamp));
  const byHand = candidates.filter((log) => log.clientLogId !== logId);

  if (byHand.some((log) => log.plannerJobId === job.id)) return 'linked';

  const facts = { clientName: job.clientName, refrigerantType, amount, timestamp: now };
  const identical = byHand.find((log) => isSameCharge(log, facts));
  if (identical) {
    await tx.update(gasUsageLogs).set({ plannerJobId: job.id }).where(eq(gasUsageLogs.id, identical.id));
    return 'adopted';
  }

  const [refrigerant] = job.refrigerantId
    ? await tx.select().from(refrigerants).where(eq(refrigerants.id, job.refrigerantId)).limit(1)
    : [];
  const values = {
    refrigerantId: job.refrigerantId,
    refrigerantType,
    refrigerantClass: refrigerant?.ashraeSafetyGroup ?? job.refrigerantClass,
    amount,
    odp: numericReference(refrigerant?.odp),
    gwp: numericReference(refrigerant?.gwp),
    ashraeSafetyClass: refrigerant?.ashraeSafetyGroup ?? null,
  };
  await tx
    .insert(gasUsageLogs)
    .values({
      ...values,
      clientLogId: logId,
      technicianId: job.technicianId,
      technicianName: job.technicianName,
      clientName: job.clientName,
      location: job.location,
      plannerJobId: job.id,
      jobType: job.jobType,
      actionType: 'Charge',
      timestamp: now,
    })
    .onConflictDoUpdate({ target: gasUsageLogs.clientLogId, set: values });
  return 'written';
}

/** A cancelled job installed nothing, so the charge it wrote comes back out. Hand-written logs stay. */
export const removeNewSystemCharge = (tx: Tx, jobId: string) =>
  tx.delete(gasUsageLogs).where(eq(gasUsageLogs.clientLogId, plannerChargeLogId(jobId)));
