import { NextResponse } from 'next/server';
import { runWhatGasSync, type SyncType } from '@/lib/whatgas/sync';
import { isAuthorizedCronRequest } from '@/lib/server/cron-auth';

/**
 * Trigger endpoint for scheduled syncs. This app has no built-in cron like Vercel — point
 * an external scheduler (Dokploy scheduled task, GitHub Actions scheduled workflow,
 * cron-job.org, etc.) at this route with:
 *   Authorization: Bearer <CRON_SECRET>
 *   POST /api/cron/whatgas-sync?type=daily-incremental   (suggested: daily)
 *   POST /api/cron/whatgas-sync?type=weekly-full          (suggested: weekly)
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 500 });
  }

  const auth = req.headers.get('authorization');
  if (!isAuthorizedCronRequest(auth, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const typeParam = url.searchParams.get('type');
  const syncType: SyncType =
    typeParam === 'weekly-full' || typeParam === 'daily-incremental' ? typeParam : 'daily-incremental';

  const result = await runWhatGasSync(syncType, 'scheduled');
  return NextResponse.json(result, { status: result.status === 'failed' ? 502 : 200 });
}
