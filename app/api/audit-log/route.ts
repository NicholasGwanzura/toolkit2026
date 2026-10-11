import { NextResponse } from 'next/server';
import { and, count, desc, eq, gte, ilike, lte, or } from 'drizzle-orm';
import { escapeLike } from '@/lib/email-log-query';
import { db } from '@/db/client';
import { applicationAuditLog } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import type { AuditLogEntry } from '@/types/index';

function toAuditLogEntry(row: typeof applicationAuditLog.$inferSelect): AuditLogEntry {
  return {
    id: row.id,
    entityType: row.entityType as AuditLogEntry['entityType'],
    entityId: row.entityId,
    action: row.action,
    previousStatus: row.previousStatus ?? undefined,
    newStatus: row.newStatus ?? undefined,
    performedBy: row.performedBy,
    performedByRole: row.performedByRole ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function GET(req: Request) {
  try {
    await requireRole(req, ['org_admin']);
  } catch (e) {
    return e as Response;
  }

  const params = new URL(req.url).searchParams;
  const entityType = params.get('entityType')?.trim();
  const entityId = params.get('entityId')?.trim();
  const search = params.get('q')?.trim().slice(0, 100);
  const page = Math.max(1, Math.min(10_000, Math.floor(Number(params.get('page'))) || 1));
  const pageSize = 50;
  const day = (value: string | null, end: boolean) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
    const d = new Date(`${value}T${end ? '23:59:59.999' : '00:00:00.000'}Z`);
    return Number.isNaN(d.getTime()) ? undefined : d;
  };
  const from = day(params.get('from'), false);
  const to = day(params.get('to'), true);

  const conditions = [];
  if (entityType && /^[a-z_]{1,40}$/.test(entityType)) conditions.push(eq(applicationAuditLog.entityType, entityType));
  if (entityId && /^[0-9a-f-]{36}$/i.test(entityId)) conditions.push(eq(applicationAuditLog.entityId, entityId));
  if (from) conditions.push(gte(applicationAuditLog.createdAt, from));
  if (to) conditions.push(lte(applicationAuditLog.createdAt, to));
  if (search) {
    const like = `%${escapeLike(search)}%`;
    conditions.push(or(
      ilike(applicationAuditLog.performedBy, like),
      ilike(applicationAuditLog.action, like),
      ilike(applicationAuditLog.notes, like),
    ));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // The per-record history panels ask for one record's whole trail as a plain list.
  if (entityId) {
    const history = await db.select().from(applicationAuditLog).where(where).orderBy(desc(applicationAuditLog.createdAt));
    return NextResponse.json(history.map(toAuditLogEntry));
  }

  const [rows, [{ total }], typeRows] = await Promise.all([
    db.select().from(applicationAuditLog).where(where).orderBy(desc(applicationAuditLog.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ total: count() }).from(applicationAuditLog).where(where),
    db.selectDistinct({ entityType: applicationAuditLog.entityType }).from(applicationAuditLog),
  ]);

  return NextResponse.json({
    items: rows.map(toAuditLogEntry),
    total: Number(total),
    page,
    pageSize,
    entityTypes: typeRows.map((r) => r.entityType).sort(),
  });
}
