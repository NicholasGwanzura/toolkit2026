// Server-side checks for records that were saved on a device and sent later.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = 24 * 60 * 60 * 1000;
/** Work saved offline can wait this long for a signal; older times are not trusted. */
export const MAX_OFFLINE_AGE_DAYS = 90;

export const validClientRef = (value: unknown): string | null => (typeof value === 'string' && UUID.test(value) ? value : null);

/** The time the work was saved on the device, if believable; otherwise now. */
export function recordedTime(value: unknown, now: Date): Date {
  if (typeof value !== 'string') return now;
  const at = Date.parse(value);
  if (!Number.isFinite(at) || at > now.getTime() + DAY || at < now.getTime() - MAX_OFFLINE_AGE_DAYS * DAY) return now;
  return new Date(at);
}
