import { NextResponse } from 'next/server';
import { checkDocumentFile, MAX_DOCUMENT_BYTES } from '@/lib/application-documents';
import { requireRole } from '@/lib/server/auth';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';
import {
  MAX_CERTIFICATION_DOCUMENTS,
  addTechnicianDocument,
  findTechnicianForUser,
  listTechnicianDocuments,
} from '@/lib/server/technician-documents';
import { CERTIFICATION_DOCUMENT_HINT } from '@/lib/technician-documents';

/** A signed-in technician's own certification documents. */
export async function GET(req: Request) {
  let session;
  try {
    session = await requireRole(req, ['technician']);
  } catch (e) {
    return e as Response;
  }

  const technician = await findTechnicianForUser(session.email);
  if (!technician) {
    return NextResponse.json(
      { error: 'No technician registry record matches your account email. Contact HEVACRAZ to have it linked.' },
      { status: 404 },
    );
  }

  return NextResponse.json({
    documents: await listTechnicianDocuments(technician.id),
    limit: MAX_CERTIFICATION_DOCUMENTS,
    hint: CERTIFICATION_DOCUMENT_HINT,
  });
}

/** Upload one document. Uploads stop once the per-technician limit is reached. */
export async function POST(req: Request) {
  let session;
  try {
    session = await requireRole(req, ['technician']);
  } catch (e) {
    return e as Response;
  }

  if (!checkRateLimit(`certification-document:${getClientIp(req)}`, 20, 15 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many uploads. Please wait a few minutes and try again.' }, { status: 429 });
  }

  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > MAX_DOCUMENT_BYTES + 512 * 1024) {
    return NextResponse.json({ error: `Each file must be ${MAX_DOCUMENT_BYTES / 1024 / 1024} MB or smaller.` }, { status: 413 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Choose a file to upload.' }, { status: 400 });
  }

  const problem = checkDocumentFile({ name: file.name, type: file.type, size: file.size });
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const technician = await findTechnicianForUser(session.email);
  if (!technician) {
    return NextResponse.json(
      { error: 'No technician registry record matches your account email. Contact HEVACRAZ to have it linked.' },
      { status: 404 },
    );
  }

  const stored = await addTechnicianDocument(technician.id, session.id, {
    name: file.name,
    type: file.type,
    data: Buffer.from(await file.arrayBuffer()),
  });
  if ('error' in stored) return NextResponse.json({ error: stored.error }, { status: stored.status });
  return NextResponse.json(stored.document, { status: 201 });
}
