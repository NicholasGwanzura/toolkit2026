// Which registrations and memberships are due a renewal reminder, and which reminders were already sent.
// Pure, so the rules can be tested without a database or email.

export type ReminderKind = 'registration' | 'membership';
export type ReminderStage = '30-days' | '7-days' | 'expired';

export interface ExpiryItem {
  kind: ReminderKind;
  id: string;
  technicianId: string;
  name: string;
  email: string | null;
  /** YYYY-MM-DD, as stored. */
  expiryDate: string;
}

export interface Reminder extends ExpiryItem {
  stage: ReminderStage;
  /** Unique per record, stage and expiry date, so a renewal that moves the date starts a fresh cycle. */
  key: string;
  daysLeft: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** Reminders stop this many days after the expiry date. */
export const EXPIRED_REMINDER_WINDOW_DAYS = 30;

/** Whole days from today (UTC) to the date, negative once it has passed. Null for anything that is not a date. */
export function daysUntil(dateText: string, now: Date): number | null {
  if (!/^\d{4}-\d{2}-\d{2}/.test(dateText)) return null;
  const target = Date.parse(`${dateText.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(target)) return null;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((target - today) / DAY_MS);
}

export function stageFor(daysLeft: number): ReminderStage | null {
  if (daysLeft < 0) return daysLeft >= -EXPIRED_REMINDER_WINDOW_DAYS ? 'expired' : null;
  if (daysLeft <= 7) return '7-days';
  if (daysLeft <= 30) return '30-days';
  return null;
}

export const reminderKey = (item: Pick<ExpiryItem, 'kind' | 'id' | 'expiryDate'>, stage: ReminderStage) =>
  `${item.kind}:${item.id}:${stage}:${item.expiryDate.slice(0, 10)}`;

/** Reminders to send now: at most one per record (its most urgent stage), skipping any already sent or with no email. */
export function dueReminders(items: ExpiryItem[], now: Date, alreadySent: Set<string>): Reminder[] {
  const out: Reminder[] = [];
  for (const item of items) {
    if (!item.email) continue;
    const daysLeft = daysUntil(item.expiryDate, now);
    if (daysLeft === null) continue;
    const stage = stageFor(daysLeft);
    if (!stage) continue;
    const key = reminderKey(item, stage);
    if (alreadySent.has(key)) continue;
    out.push({ ...item, stage, key, daysLeft });
  }
  return out;
}

export function describeReminder(reminder: Pick<Reminder, 'kind' | 'stage' | 'daysLeft' | 'expiryDate'>): { subject: string; headline: string; detail: string } {
  const what = reminder.kind === 'registration' ? 'registration' : 'membership';
  const date = reminder.expiryDate.slice(0, 10);
  if (reminder.stage === 'expired') {
    return {
      subject: `Your HEVACRAZ ${what} has expired`,
      headline: `Your ${what} expired on ${date}`,
      detail: `Renew as soon as you can. Until then your ${what} may not be accepted as valid when your details are verified.`,
    };
  }
  const days = reminder.daysLeft === 0 ? 'today' : reminder.daysLeft === 1 ? 'tomorrow' : `in ${reminder.daysLeft} days`;
  return {
    subject: `Your HEVACRAZ ${what} expires ${days}`,
    headline: `Your ${what} expires ${days} (${date})`,
    detail: 'Contact HEVACRAZ to renew before then so there is no gap in your status.',
  };
}
