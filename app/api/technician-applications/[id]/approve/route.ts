import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { and, eq, or } from 'drizzle-orm';
import { db } from '@/db/client';
import { technicianApplications, technicians, memberships, users } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import { sendMembershipConfirmationEmail } from '@/lib/server/email';
import { afterApplicationApproved, reviewBlockedReason } from '@/lib/server/application-flow';
import { recordAuditEvent } from '@/lib/server/audit';
import { generateMembershipNumber } from '@/lib/server/membership-number';
import { provisionUserFromApplication, ProvisionConflictError } from '@/lib/server/provision-user';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireRole(req, ['org_admin']);
  } catch (e) {
    return e as Response;
  }

  const { id } = await params;
  const [app] = await db
    .select()
    .from(technicianApplications)
    .where(eq(technicianApplications.id, id))
    .limit(1);
  if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (app.status === 'approved' && app.approvedTechnicianId) {
    return NextResponse.json({
      id: app.id,
      status: app.status,
      approvedTechnicianId: app.approvedTechnicianId,
    });
  }
  if (app.status !== 'submitted' && app.status !== 'under-review') {
    return NextResponse.json({ error: `A ${app.status} application cannot be approved. Create a new application if this technician needs to reapply.` }, { status: 409 });
  }

  const blocked = await reviewBlockedReason('technician_application', app.id, app.status, 'approve');
  if (blocked) return NextResponse.json({ error: blocked }, { status: 409 });

  const body = await req.json().catch(() => ({})) as { linkToExisting?: unknown };
  const [existingTechnician] = await db.select({ id: technicians.id, registrationNumber: technicians.registrationNumber, name: technicians.name, email: technicians.email })
    .from(technicians)
    .where(or(eq(technicians.email, app.email), eq(technicians.nationalId, app.nationalId), eq(technicians.registrationNumber, app.registrationNumber)))
    .limit(1);
  if (existingTechnician) {
    // The same person, already on the registry (for example from the census import), applied again.
    // The applicant's confirmed email matching the record is what proves it is the same person.
    const sameEmail = !!existingTechnician.email && existingTechnician.email.trim().toLowerCase() === app.email.trim().toLowerCase();
    if (body.linkToExisting === true && sameEmail) {
      return linkToExistingRecord({ app, existing: existingTechnician, reviewer: { name: session.name, role: session.role } });
    }
    return NextResponse.json({
      error: `${existingTechnician.name} is already on the registry as ${existingTechnician.registrationNumber}. ${sameEmail
        ? 'Approve and link this application to that record, so no duplicate is created.'
        : 'The email on that record is different, so it cannot be linked automatically. Check the details, then update the registry record.'}`,
      code: sameEmail ? 'registry-match' : 'registry-conflict',
      existing: { id: existingTechnician.id, registrationNumber: existingTechnician.registrationNumber, name: existingTechnician.name },
    }, { status: 409 });
  }

  const [existingUser] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.email, app.email)).limit(1);
  if (existingUser) {
    return NextResponse.json({ error: `A ${existingUser.role} user account already exists for this email.` }, { status: 409 });
  }

  const today = new Date();
  const expiry = new Date(today);
  expiry.setFullYear(today.getFullYear() + 2);

  const technicianId = randomUUID();
  const membershipId = randomUUID();
  const userId = randomUUID();
  const membershipNumber = await generateMembershipNumber();
  const membershipExpiry = `${today.getFullYear()}-12-31`;

  // Keep the account, registry record, application state, and membership atomic.
  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id: userId, name: app.name, email: app.email, passwordHash: app.passwordHash,
      role: 'technician', region: app.region, status: 'active', isDemo: false,
    });
    await tx.insert(technicians).values({
      id: technicianId,
      name: app.name,
      nationalId: app.nationalId,
      registrationNumber: app.registrationNumber,
      region: app.region,
      province: app.province,
      district: app.district,
      contactNumber: app.contactNumber,
      email: app.email,
      specialization: app.specialization,
      certifications: app.certifications ?? [],
      trainingHistory: [],
      employmentStatus: app.employmentStatus as 'employed' | 'self-employed' | 'unemployed',
      employer: app.employer,
      refrigerantsHandled: (app.refrigerantsHandled as string[]) ?? [],
      surveyData: app.surveyData ?? null,
      registrationDate: today.toISOString().split('T')[0],
      expiryDate: expiry.toISOString().split('T')[0],
      status: 'active',
    });
    await tx.update(technicianApplications).set({
      status: 'approved',
      reviewedBy: session.name,
      reviewedAt: new Date(),
      approvedTechnicianId: technicianId,
    }).where(eq(technicianApplications.id, id));
    await tx.insert(memberships).values({
      id: membershipId,
      technicianId,
      applicationId: app.id,
      membershipNumber,
      membershipType: 'standard',
      province: app.province,
      status: 'active',
      startDate: today.toISOString().split('T')[0],
      expiryDate: membershipExpiry,
      approvedBy: session.name,
      approvedAt: today,
    });
  });

  recordAuditEvent({
    entityType: 'membership',
    entityId: membershipId,
    action: 'membership_created',
    newStatus: 'active',
    performedBy: session.name,
    performedByRole: session.role,
    notes: `Created on approval of application ${app.id}`,
  }).catch(() => {});

  // Email the technician and record the decision — best-effort, never blocks approval
  await afterApplicationApproved(
    { entityType: 'technician_application', entityId: app.id, role: 'technician', name: app.name, email: app.email },
    { name: session.name, role: session.role },
    app.status,
  );

  await sendMembershipConfirmationEmail({
    email: app.email,
    name: app.name,
    membershipNumber,
    expiryDate: membershipExpiry,
    log: { entityType: 'membership', entityId: membershipId, label: app.name },
  });

  return NextResponse.json({
    id: app.id,
    status: 'approved',
    approvedTechnicianId: technicianId,
    reviewedAt: today.toISOString(),
    reviewedBy: session.name,
    membershipId,
    membershipNumber,
    membershipExpiryDate: membershipExpiry,
  });
}

/**
 * Approves an application for someone who is already on the registry: their login is created with the
 * password they chose, the application is linked to the existing record, and an active membership is
 * added if they have none. The registry record itself is left as it is, so no duplicate appears.
 */
async function linkToExistingRecord(input: {
  app: typeof technicianApplications.$inferSelect;
  existing: { id: string; registrationNumber: string; name: string };
  reviewer: { name: string; role: string };
}): Promise<Response> {
  const { app, existing, reviewer } = input;
  try {
    await provisionUserFromApplication({ name: app.name, email: app.email, passwordHash: app.passwordHash, role: 'technician', region: app.region });
  } catch (error) {
    if (error instanceof ProvisionConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    throw error;
  }

  const today = new Date();
  const [activeMembership] = await db.select({ id: memberships.id }).from(memberships)
    .where(and(eq(memberships.technicianId, existing.id), eq(memberships.status, 'active'))).limit(1);
  let membershipNumber: string | undefined;
  const membershipExpiry = `${today.getFullYear()}-12-31`;
  if (!activeMembership) membershipNumber = await generateMembershipNumber();

  await db.transaction(async (tx) => {
    await tx.update(technicianApplications).set({
      status: 'approved',
      reviewedBy: reviewer.name,
      reviewedAt: today,
      approvedTechnicianId: existing.id,
    }).where(eq(technicianApplications.id, app.id));
    if (membershipNumber) {
      await tx.insert(memberships).values({
        technicianId: existing.id,
        applicationId: app.id,
        membershipNumber,
        membershipType: 'standard',
        province: app.province,
        status: 'active',
        startDate: today.toISOString().split('T')[0],
        expiryDate: membershipExpiry,
        approvedBy: reviewer.name,
        approvedAt: today,
      });
    }
  });

  await recordAuditEvent({
    entityType: 'technician_application',
    entityId: app.id,
    action: 'linked_to_registry_record',
    previousStatus: app.status,
    newStatus: 'approved',
    performedBy: reviewer.name,
    performedByRole: reviewer.role,
    notes: `Linked to existing registry record ${existing.registrationNumber}`,
  }).catch(() => {});

  await afterApplicationApproved(
    { entityType: 'technician_application', entityId: app.id, role: 'technician', name: app.name, email: app.email },
    reviewer,
    app.status,
  );
  if (membershipNumber) {
    await sendMembershipConfirmationEmail({
      email: app.email, name: app.name, membershipNumber, expiryDate: membershipExpiry,
      log: { entityType: 'technician_application', entityId: app.id, label: app.name },
    });
  }

  return NextResponse.json({
    id: app.id,
    status: 'approved',
    approvedTechnicianId: existing.id,
    linkedExisting: true,
    registrationNumber: existing.registrationNumber,
    reviewedAt: today.toISOString(),
    reviewedBy: reviewer.name,
  });
}
