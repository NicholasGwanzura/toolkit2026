import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { technicians } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import { MAX_CERTIFICATION_DOCUMENTS, listTechnicianDocuments } from '@/lib/server/technician-documents';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Reviewers: the certification documents a technician has uploaded (details only, not the files). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(req, ['trainer', 'lecturer', 'org_admin']);
  } catch (e) {
    return e as Response;
  }

  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [technician] = await db.select({ id: technicians.id }).from(technicians).where(eq(technicians.id, id)).limit(1);
  if (!technician) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    documents: await listTechnicianDocuments(technician.id),
    limit: MAX_CERTIFICATION_DOCUMENTS,
  });
}
