// How fresh the WhatGas catalogue must stay. Pure, so the scheduler and the admin page agree.
const HOUR = 3_600_000;

/** Sync once a day. */
export const SYNC_EVERY_MS = 24 * HOUR;
/** After a failed or stuck attempt, wait this long rather than hammering WhatGas. */
export const RETRY_AFTER_MS = HOUR;
/** Beyond this, tell an administrator: a day has been missed. */
export const STALE_AFTER_MS = 36 * HOUR;

type When = Date | string | null | undefined;
const time = (value: When) => (value ? new Date(value).getTime() : null);

export function whatGasSyncDue(lastSuccessAt: When, lastAttemptAt: When, now: Date): boolean {
  const success = time(lastSuccessAt);
  if (success !== null && now.getTime() - success < SYNC_EVERY_MS) return false;
  const attempt = time(lastAttemptAt);
  return attempt === null || now.getTime() - attempt >= RETRY_AFTER_MS;
}

export function whatGasCatalogueStale(lastSuccessAt: When, now: Date): boolean {
  const success = time(lastSuccessAt);
  return success === null || now.getTime() - success > STALE_AFTER_MS;
}
