import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/server/auth';
import { findTechnicianForUser, removeTechnicianDocument } from '@/lib/server/technician-documents';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A technician removes one of their own documents. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireRole(req, ['technician']);
  } catch (e) {
    return e as Response;
  }

  if (!checkRateLimit(`certification-document-remove:${getClientIp(req)}`, 30, 15 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
  }

  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const technician = await findTechnicianForUser(session.email);
  if (!technician) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const removed = await removeTechnicianDocument(technician.id, id);
  if (!removed) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
