import { NextResponse } from 'next/server';
import { MAX_LIST_ROWS } from '@/lib/server/list-limits';
import { desc, ilike, or } from 'drizzle-orm';
import { db } from '@/db/client';
import { users } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';

export async function GET(req: Request) {
  try {
    await requireRole(req, ['org_admin']);
  } catch (e) {
    return e as Response;
  }

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim();

  const rows = await db
    .select()
    .from(users)
    .where(q ? or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`)) : undefined)
    .orderBy(desc(users.createdAt))
    .limit(MAX_LIST_ROWS);

  const data = rows.map(({ passwordHash: _passwordHash, ...rest }) => rest);
  return NextResponse.json({ data });
}
