// Runs once when the server starts.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.WHATGAS_AUTO_SYNC === 'off') return;
  const { startWhatGasAutoSync } = await import('@/lib/whatgas/auto-sync');
  startWhatGasAutoSync();
}
