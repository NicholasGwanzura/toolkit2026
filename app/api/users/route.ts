import { NextResponse } from 'next/server';
import { MAX_LIST_ROWS } from '@/lib/server/list-limits';
import { db } from '@/db/client';
import { users } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';

export async function GET(req: Request) {
  try {
    await requireRole(req, ['org_admin']);
  } catch (e) {
    return e as Response;
  }

  const rows = await db.select().from(users).limit(MAX_LIST_ROWS);
  return NextResponse.json(rows.map(r => ({
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    region: r.region,
    status: r.status,
    isDemo: r.isDemo,
    createdAt: r.createdAt.toISOString(),
  })));
}
