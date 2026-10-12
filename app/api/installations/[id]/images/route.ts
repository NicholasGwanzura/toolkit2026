import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { installations } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import { isFieldWorkerRole } from '@/lib/field-worker';

/** The evidence photos for one installation. Only its owner or an administrator may see them. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireRole(req, ['technician', 'contractor', 'org_admin']);
  } catch (e) {
    return e as Response;
  }

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid installation id' }, { status: 400 });
  }
  const [row] = await db
    .select({ technicianId: installations.technicianId, images: installations.images })
    .from(installations)
    .where(eq(installations.id, id))
    .limit(1);
  if (!row) return NextResponse.json({ error: 'Installation not found' }, { status: 404 });
  if (isFieldWorkerRole(session.role) && row.technicianId !== session.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }
  return NextResponse.json({ images: row.images }, { headers: { 'Cache-Control': 'private, max-age=300' } });
}
