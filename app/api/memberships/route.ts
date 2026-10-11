import { NextResponse } from 'next/server';
import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { db } from '@/db/client';
import { memberships, technicians } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import { generateMembershipNumber } from '@/lib/server/membership-number';
import { recordAuditEvent } from '@/lib/server/audit';
import { sendMembershipConfirmationEmail } from '@/lib/server/email';
import { issueActivationInvite } from '@/lib/server/activation-invite';
import type { Membership } from '@/types/index';

function toMembership(row: typeof memberships.$inferSelect): Membership {
  return {
    id: row.id,
    technicianId: row.technicianId,
    applicationId: row.applicationId ?? undefined,
    membershipNumber: row.membershipNumber,
    membershipType: row.membershipType,
    province: row.province,
    status: row.status as Membership['status'],
    startDate: row.startDate,
    expiryDate: row.expiryDate,
    approvedBy: row.approvedBy ?? undefined,
    approvedAt: row.approvedAt?.toISOString() ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(req: Request) {
  try {
    await requireRole(req, ['org_admin']);
  } catch (e) {
    return e as Response;
  }

  const url = new URL(req.url);
  const province = url.searchParams.get('province');
  const status = url.searchParams.get('status');
  const q = url.searchParams.get('q');

  const conditions = [];
  if (province) conditions.push(eq(memberships.province, province));
  if (status) conditions.push(eq(memberships.status, status as Membership['status']));
  if (q) conditions.push(or(ilike(memberships.membershipNumber, `%${q}%`)));

  const rows = await db
    .select()
    .from(memberships)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(memberships.createdAt));

  return NextResponse.json(rows.map(toMembership));
}

/**
 * Manual membership creation for a technician who already exists in the registry but has no
 * membership yet (e.g. the census-imported technicians, who have no technician_applications
 * row to approve). If the technician has no users account, this sends a secure activation
 * link (reusing the existing invites/accept-invite flow) instead of ever emailing a password.
 */
export async function POST(req: Request) {
  let session;
  try {
    session = await requireRole(req, ['org_admin']);
  } catch (e) {
    return e as Response;
  }

  const body = await req.json().catch(() => ({})) as {
    technicianId?: string;
    membershipType?: string;
  };

  if (!body.technicianId) {
    return NextResponse.json({ error: 'technicianId is required' }, { status: 400 });
  }

  const [technician] = await db
    .select()
    .from(technicians)
    .where(eq(technicians.id, body.technicianId))
    .limit(1);
  if (!technician) return NextResponse.json({ error: 'Technician not found' }, { status: 404 });

  const [existingMembership] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.technicianId, technician.id), eq(memberships.status, 'active')))
    .limit(1);
  if (existingMembership) {
    return NextResponse.json({ error: 'This technician already has an active membership' }, { status: 409 });
  }

  const membershipNumber = await generateMembershipNumber();
  const today = new Date();
  const expiryDate = `${today.getFullYear()}-12-31`;

  const [created] = await db
    .insert(memberships)
    .values({
      technicianId: technician.id,
      membershipNumber,
      membershipType: body.membershipType ?? 'standard',
      province: technician.province,
      status: 'active',
      startDate: today.toISOString().split('T')[0],
      expiryDate,
      approvedBy: session.name,
      approvedAt: today,
    })
    .returning();

  recordAuditEvent({
    entityType: 'membership',
    entityId: created.id,
    action: 'membership_created',
    newStatus: 'active',
    performedBy: session.name,
    performedByRole: session.role,
    notes: 'Manually created from Memberships admin page',
  }).catch(() => {});

  if (!technician.email) {
    // No email on file at all — nothing to send, membership still created.
    return NextResponse.json(toMembership(created), { status: 201 });
  }

  // No login yet: send a secure activation link instead of ever emailing a password.
  await issueActivationInvite({
    email: technician.email,
    region: technician.region,
    invitedBy: session.email,
    invitedByName: session.name,
    log: { entityType: 'membership', entityId: created.id, label: technician.name },
  });

  await sendMembershipConfirmationEmail({
    email: technician.email,
    name: technician.name,
    membershipNumber,
    expiryDate,
    log: { entityType: 'membership', entityId: created.id, label: technician.name },
  });

  return NextResponse.json(toMembership(created), { status: 201 });
}
