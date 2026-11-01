// Counting a new system's charge exactly once. A completed new-system job writes a Charge log, and a
// technician may also log the same charge by hand, so the two have to recognise each other.

/** Fixed per job, so completing a job again updates its log instead of adding another. */
export const plannerChargeLogId = (jobId: string) => `planner-job-charge:${jobId}`;
export const PLANNER_CHARGE_LOG_PREFIX = 'planner-job-charge:';

/** How far apart a job's charge and a hand-written log can be and still be the same charge. */
export const SAME_CHARGE_WINDOW_DAYS = 7;
export const SAME_CHARGE_WINDOW_MS = SAME_CHARGE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export interface ChargeFacts {
  clientName: string;
  refrigerantType: string;
  amount: number | string;
  timestamp: Date;
}

const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
/** R-32, r32 and R 32 are the same gas. */
const gasCode = (value: string) => value.replace(/[\s-]/g, '').toUpperCase();
const grams = (value: number | string) => Math.round(Number(value) * 1000);

/** Same client, gas and kg within the window. Used only for logs not already linked to a job. */
export function isSameCharge(a: ChargeFacts, b: ChargeFacts): boolean {
  return sameText(a.clientName, b.clientName)
    && gasCode(a.refrigerantType) === gasCode(b.refrigerantType)
    && grams(a.amount) === grams(b.amount)
    && Math.abs(a.timestamp.getTime() - b.timestamp.getTime()) <= SAME_CHARGE_WINDOW_MS;
}

export interface IncomingCharge extends ChargeFacts {
  actionType: string;
  plannerJobId?: string | null;
}

/** Is a hand-written log a repeat of a charge that a completed job already recorded? */
export function repeatsJobCharge(log: IncomingCharge, jobCharges: Array<ChargeFacts & { plannerJobId: string | null }>): boolean {
  if (log.actionType !== 'Charge') return false;
  return jobCharges.some((charge) => (log.plannerJobId ? charge.plannerJobId === log.plannerJobId : isSameCharge(log, charge)));
}

/** Keeps a plain, non-negative number from the refrigerant catalogue, or nothing. */
export function numericReference(value: string | null | undefined): string | null {
  if (!value || !/^-?\d+(?:\.\d+)?$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed.toString() : null;
}
