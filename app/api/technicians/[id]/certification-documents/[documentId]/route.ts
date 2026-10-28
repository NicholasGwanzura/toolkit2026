import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/server/auth';
import { getTechnicianDocumentFile } from '@/lib/server/technician-documents';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Reviewers: download one certification document. Always sent as a download, never rendered inline. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  try {
    await requireRole(req, ['trainer', 'lecturer', 'org_admin']);
  } catch (e) {
    return e as Response;
  }

  const { id, documentId } = await params;
  if (!UUID.test(id) || !UUID.test(documentId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const file = await getTechnicianDocumentFile(id, documentId);
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const asciiName = file.fileName.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '');
  return new Response(new Uint8Array(file.data), {
    headers: {
      'Content-Type': file.fileType,
      'Content-Length': String(file.data.length),
      'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  });
}
