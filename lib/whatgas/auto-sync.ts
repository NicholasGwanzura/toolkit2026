import { whatGasSyncDue } from './freshness';
import { getLastSuccessfulSync, listSyncLogs } from './repository';
import { runWhatGasSync } from './sync';

const CHECK_EVERY_MS = 60 * 60 * 1000;
const FIRST_CHECK_AFTER_MS = 60 * 1000;

async function syncIfDue() {
  try {
    const [lastSuccess, [lastAttempt]] = await Promise.all([getLastSuccessfulSync(), listSyncLogs(1)]);
    if (!whatGasSyncDue(lastSuccess?.finishedAt, lastAttempt?.startedAt, new Date())) return;
    const result = await runWhatGasSync('daily-incremental', 'auto-sync');
    console.log(`[whatgas/auto-sync] ${result.status}: ${result.totalRecords} records`);
  } catch (err) {
    console.error('[whatgas/auto-sync] check failed', err instanceof Error ? err.message : err);
  }
}

/**
 * Keeps the catalogue fresh from inside the app, so it does not depend on an outside scheduler.
 * Safe alongside one: every check first looks at the sync log, so a recent run from anywhere counts.
 */
export function startWhatGasAutoSync() {
  setTimeout(() => void syncIfDue(), FIRST_CHECK_AFTER_MS).unref();
  setInterval(() => void syncIfDue(), CHECK_EVERY_MS).unref();
}
