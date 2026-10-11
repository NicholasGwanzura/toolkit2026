import { publicLookupLimit } from '@/lib/server/rate-limit';
import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { tradePermits } from '@/db/schema/index';

// Public permit verification lookup — only ever returns approved permits, and only the
// fields relevant to confirming legitimacy (no applicant email, no internal review notes).
export async function GET(req: Request) {
  const limited = publicLookupLimit(req, 'permits');
  if (limited) return limited;
  const url = new URL(req.url);
  const q = url.searchParams.get('q');
  const token = url.searchParams.get('token');

  if (!q || !token || q.length > 100 || token.length > 200) {
    return NextResponse.json({ error: 'Permit number and verification token are required' }, { status: 400 });
  }

  const conditions = [eq(tradePermits.status, 'approved')];
  conditions.push(eq(tradePermits.permitNumber, q.trim().toUpperCase()));
  conditions.push(eq(tradePermits.verificationToken, token));

  const [row] = await db.select().from(tradePermits).where(and(...conditions)).limit(1);

  if (!row) {
    return NextResponse.json({ error: 'No approved permit matches that reference.' }, { status: 404 });
  }

  return NextResponse.json({
    permitNumber: row.permitNumber,
    permitType: row.permitType,
    refrigerantLabel: row.refrigerantLabel,
    status: row.status,
    issuedDate: row.issuedDate,
    expiryDate: row.expiryDate,
  });
}
