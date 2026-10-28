import { NextResponse } from 'next/server';
import { inArray, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { users } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import { recordAuditEventSafe } from '@/lib/server/audit';

const MAX_BULK = 200;
// Bulk actions are limited to suspending and reactivating; other statuses keep their own flow.
const BULK_STATUSES = ['active', 'suspended'] as const;
type BulkStatus = (typeof BULK_STATUSES)[number];

export async function POST(req: Request) {
  let session;
  try {
    session = await requireRole(req, ['org_admin']);
  } catch (e) {
    return e as Response;
  }

  const body = await req.json().catch(() => ({})) as { ids?: unknown; status?: unknown };

  if (!Array.isArray(body.ids) || body.ids.length === 0 || body.ids.length > MAX_BULK) {
    return NextResponse.json({ error: `Select between 1 and ${MAX_BULK} accounts` }, { status: 400 });
  }
  if (typeof body.status !== 'string' || !BULK_STATUSES.includes(body.status as BulkStatus)) {
    return NextResponse.json({ error: 'Status must be active or suspended' }, { status: 400 });
  }

  const status = body.status as BulkStatus;
  const ids = [...new Set(body.ids.filter((id): id is string => typeof id === 'string' && id.length > 0))];
  if (ids.length === 0) {
    return NextResponse.json({ error: 'No accounts selected' }, { status: 400 });
  }

  const existing = await db
    .select({ id: users.id, status: users.status, role: users.role })
    .from(users)
    .where(inArray(users.id, ids));

  // Skip the caller (no self-lockout) and administrators (their status is changed deliberately, one at a time).
  const targets = existing.filter((user) => user.id !== session.id && user.role !== 'org_admin' && user.status !== status);
  const skipped = ids.length - targets.length;

  if (targets.length > 0) {
    await db
      .update(users)
      .set({
        status,
        updatedAt: new Date(),
        sessionVersion: sql`${users.sessionVersion} + 1`,
      })
      .where(inArray(users.id, targets.map((user) => user.id)));

    await Promise.all(
      targets.map((user) =>
        recordAuditEventSafe({
          entityType: 'user',
          entityId: user.id,
          action: 'status-changed',
          previousStatus: user.status,
          newStatus: status,
          performedBy: session.name,
          performedByRole: session.role,
          notes: `Bulk action: status ${user.status} → ${status}`,
        }),
      ),
    );
  }

  return NextResponse.json({ updated: targets.length, skipped });
}
