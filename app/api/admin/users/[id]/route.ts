import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { users, userStatusEnum } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import { recordAuditEventSafe } from '@/lib/server/audit';
import { VALID_ROLES } from '@/lib/roles';
import { sql } from 'drizzle-orm';

const VALID_STATUSES = userStatusEnum.enumValues;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireRole(req, ['org_admin']);
  } catch (e) {
    return e as Response;
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({})) as {
    role?: string;
    status?: string;
    region?: string;
    name?: string;
  };

  const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const isSelf = existing.id === session.id;
  if (isSelf && body.role && body.role !== 'org_admin') {
    return NextResponse.json({ error: 'You cannot change your own role away from org_admin' }, { status: 400 });
  }
  if (isSelf && body.status && body.status !== 'active') {
    return NextResponse.json({ error: 'You cannot deactivate your own account' }, { status: 400 });
  }

  const update: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };

  if (body.role !== undefined) {
    if (!VALID_ROLES.includes(body.role as (typeof VALID_ROLES)[number])) {
      return NextResponse.json({ error: 'Unknown role' }, { status: 400 });
    }
    if (body.role === 'org_admin' && existing.role !== 'org_admin') {
      return NextResponse.json({ error: 'Org admin access cannot be granted from this screen' }, { status: 403 });
    }
    if ((body.role === 'vendor' || body.role === 'technician') && existing.role !== body.role) {
      return NextResponse.json({ error: body.role === 'vendor'
        ? 'Supplier access can only be created through Supplier Management invitations.'
        : 'Technician access can only be created through an approved application or registry membership.' }, { status: 403 });
    }
    update.role = body.role as (typeof VALID_ROLES)[number];
  }
  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status as (typeof VALID_STATUSES)[number])) {
      return NextResponse.json({ error: 'Unknown status' }, { status: 400 });
    }
    update.status = body.status as (typeof VALID_STATUSES)[number];
  }
  if (body.region !== undefined) {
    if (!body.region.trim()) {
      return NextResponse.json({ error: 'Region cannot be empty' }, { status: 400 });
    }
    update.region = body.region.trim();
  }
  if (body.name !== undefined) {
    if (!body.name.trim()) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    }
    update.name = body.name.trim();
  }

  const revokeSessions = (body.role !== undefined && body.role !== existing.role) ||
    (body.status !== undefined && body.status !== existing.status);

  const [updated] = await db.update(users).set(revokeSessions
    ? { ...update, sessionVersion: sql`${users.sessionVersion} + 1` }
    : update).where(eq(users.id, id)).returning();

  const changes = [
    body.role !== undefined && body.role !== existing.role ? `role ${existing.role} → ${body.role}` : null,
    body.status !== undefined && body.status !== existing.status ? `status ${existing.status} → ${body.status}` : null,
    body.region !== undefined && body.region !== existing.region ? `region ${existing.region} → ${body.region}` : null,
    body.name !== undefined && body.name !== existing.name ? 'name changed' : null,
  ].filter((entry): entry is string => entry !== null);

  if (changes.length > 0) {
    await recordAuditEventSafe({
      entityType: 'user',
      entityId: updated.id,
      action: body.status !== undefined && body.status !== existing.status ? 'status-changed' : 'updated',
      previousStatus: body.status !== undefined ? existing.status : undefined,
      newStatus: body.status !== undefined ? updated.status : undefined,
      performedBy: session.name,
      performedByRole: session.role,
      notes: changes.join('; '),
    });
  }

  const { passwordHash: _passwordHash, ...rest } = updated;
  return NextResponse.json(rest);
}
