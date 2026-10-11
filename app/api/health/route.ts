import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/db/client';

// Used by the host's health check and by uptime monitors. It reports only whether the app and its
// database answer, and never anything about configuration or data.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await Promise.race([
      db.execute(sql`SELECT 1`),
      new Promise((_, reject) => setTimeout(() => reject(new Error('database timeout')), 5000)),
    ]);
    return NextResponse.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[health] database check failed', error instanceof Error ? error.message : error);
    return NextResponse.json({ status: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
