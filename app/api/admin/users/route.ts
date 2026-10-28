import { NextResponse } from 'next/server';
import { and, count, desc, eq, ilike, or } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { db } from '@/db/client';
import { users, userRoleEnum } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export async function GET(req: Request) {
  try {
    await requireRole(req, ['org_admin']);
  } catch (e) {
    return e as Response;
  }

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim();
  const role = url.searchParams.get('role')?.trim();

  if (role && !userRoleEnum.enumValues.includes(role as (typeof userRoleEnum.enumValues)[number])) {
    return NextResponse.json({ error: 'Unknown role' }, { status: 400 });
  }

  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.parseInt(url.searchParams.get('pageSize') ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
  );

  const conditions: SQL[] = [];
  if (q) {
    const match = or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`));
    if (match) conditions.push(match);
  }
  if (role) {
    conditions.push(eq(users.role, role as (typeof userRoleEnum.enumValues)[number]));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(users).where(where),
  ]);

  const data = rows.map(({ passwordHash: _passwordHash, ...rest }) => rest);
  return NextResponse.json({ data, total: totals[0]?.total ?? 0, page, pageSize });
}
