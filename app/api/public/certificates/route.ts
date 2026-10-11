import { publicLookupLimit } from '@/lib/server/rate-limit';
import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { trainerCertificateRequests } from '@/db/schema/index';
import type { CertificateRecord } from '@/types/index';

function toCertificateRecord(row: typeof trainerCertificateRequests.$inferSelect): CertificateRecord | null {
  if (!row.certificateNumber || !row.verificationToken || !row.issuedAt) return null;

  const expiry = new Date(row.issuedAt);
  expiry.setFullYear(expiry.getFullYear() + 2);

  return {
    id: row.id,
    technicianId: row.technicianId,
    technicianName: row.technicianName,
    certificateNumber: row.certificateNumber,
    certificateType: row.courseTitle,
    issuingBody: 'HEVACRAZ',
    issueDate: row.issuedAt.toISOString(),
    expiryDate: expiry.toISOString(),
    verificationToken: row.verificationToken,
    verificationUrl: `/verify-technician?mode=certificate&q=${encodeURIComponent(row.certificateNumber)}&token=${row.verificationToken}`,
    status: expiry.getTime() < Date.now() ? 'expired' : 'valid',
  };
}

// Public certificate verification lookup — only ever returns issued certificates.
export async function GET(req: Request) {
  const limited = publicLookupLimit(req, 'certificates');
  if (limited) return limited;
  const url = new URL(req.url);
  const q = url.searchParams.get('q');
  const token = url.searchParams.get('token');

  if (!q || !token || q.length > 100 || token.length > 200) {
    return NextResponse.json({ error: 'An exact certificate number and verification token are required' }, { status: 400 });
  }

  const conditions = [
    eq(trainerCertificateRequests.status, 'issued'),
    eq(trainerCertificateRequests.certificateNumber, q.trim().toUpperCase()),
    eq(trainerCertificateRequests.verificationToken, token),
  ];

  const rows = await db
    .select()
    .from(trainerCertificateRequests)
    .where(and(...conditions))
    .limit(1);

  return NextResponse.json(rows.map(toCertificateRecord).filter((r): r is CertificateRecord => r !== null));
}
