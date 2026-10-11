import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { users } from '@/db/schema/index';
import { readSessionFromRequest } from '@/lib/server/auth';
import { computeTechnicianRewardSummary, computeVendorRewardSummary } from '@/lib/server/rewards';
import { isFieldWorkerRole } from '@/lib/field-worker';

export async function GET(req: Request) {
  const session = await readSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const requestedTechnicianId = url.searchParams.get('technicianId');

  if (isFieldWorkerRole(session.role)) {
    const summary = await computeTechnicianRewardSummary(session.id);
    return NextResponse.json(summary);
  }

  if (session.role === 'vendor') {
    const summary = await computeVendorRewardSummary(session.id, session.email);
    return NextResponse.json(summary);
  }

  if (session.role === 'org_admin') {
    if (!requestedTechnicianId) {
      return NextResponse.json({ error: 'technicianId is required for admin lookups' }, { status: 400 });
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedTechnicianId)) {
      return NextResponse.json({ error: 'technicianId must be a valid user id' }, { status: 400 });
    }
    // Work out what kind of account this is, so a vendor's earnings are not scored as a technician's.
    const [target] = await db
      .select({ id: users.id, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.id, requestedTechnicianId))
      .limit(1);
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const summary = target.role === 'vendor'
      ? await computeVendorRewardSummary(target.id, target.email)
      : await computeTechnicianRewardSummary(target.id);
    return NextResponse.json(summary);
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
