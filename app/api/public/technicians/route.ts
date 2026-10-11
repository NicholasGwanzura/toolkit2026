import { publicLookupLimit } from '@/lib/server/rate-limit';
import { NextResponse } from 'next/server';
import { eq, ilike, or, asc } from 'drizzle-orm';
import { db } from '@/db/client';
import { technicians } from '@/db/schema/index';
import type { Technician } from '@/types/index';

const MAX_RESULTS = 20;

// Public verification never returns direct contact details. IDs are deliberately available
// in search results, so returning contacts for an exact ID would still enable enumeration.
function toPublicTechnician(row: typeof technicians.$inferSelect): Technician {
  return {
    id: row.id,
    name: row.name,
    nationalId: '',
    registrationNumber: row.registrationNumber,
    region: row.region,
    province: row.province,
    district: row.district,
    contactNumber: '',
    email: undefined,
    specialization: row.specialization,
    certifications: row.certifications as Technician['certifications'],
    trainingHistory: [],
    employmentStatus: row.employmentStatus as Technician['employmentStatus'],
    employer: row.employer ?? undefined,
    refrigerantsHandled: row.refrigerantsHandled as string[],
    registrationDate: row.registrationDate,
    expiryDate: row.expiryDate,
    status: row.status as Technician['status'],
    lastRenewalDate: row.lastRenewalDate ?? undefined,
    nextRenewalDate: row.nextRenewalDate ?? undefined,
  };
}

export async function GET(req: Request) {
  const limited = publicLookupLimit(req, 'technicians');
  if (limited) return limited;
  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim();
  if (!q || q.length < 2 || q.length > 100) {
    return NextResponse.json({ error: 'Enter at least two characters to search the registry' }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(technicians)
    .where(or(eq(technicians.registrationNumber, q.toUpperCase()), ilike(technicians.name, `${q}%`)))
    .orderBy(asc(technicians.registrationNumber))
    .limit(MAX_RESULTS);
  return NextResponse.json(rows.map(toPublicTechnician));
}
