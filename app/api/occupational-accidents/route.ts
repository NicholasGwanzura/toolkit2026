import { NextResponse } from 'next/server';
import { MAX_LIST_ROWS } from '@/lib/server/list-limits';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { occupationalAccidents } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import type { OccupationalAccident } from '@/types/index';

const REPORTER_ROLES = ['technician', 'contractor', 'trainer', 'lecturer', 'student', 'org_admin'];
const VALID_SEVERITIES = ['Critical', 'High', 'Medium', 'Low'] as const;

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function toOccupationalAccident(row: typeof occupationalAccidents.$inferSelect): OccupationalAccident {
  return {
    id: row.id,
    technicianId: row.technicianId,
    date: row.date,
    jobSite: row.jobSite,
    clientName: row.clientName,
    severity: row.severity,
    description: row.description,
    technicianName: row.technicianName,
    refrigerantInvolved: row.refrigerantInvolved ?? undefined,
    nearMissFlag: row.nearMissFlag,
    nouNotified: row.nouNotified,
    rootCause: row.rootCause ?? undefined,
    investigationDate: row.investigationDate ?? undefined,
    investigatorName: row.investigatorName ?? undefined,
    correctiveActions: row.correctiveActions ?? undefined,
    preventiveMeasures: row.preventiveMeasures ?? undefined,
    status: row.status,
  };
}

export async function GET(req: Request) {
  let session;
  try {
    session = await requireRole(req, REPORTER_ROLES);
  } catch (e) {
    return e as Response;
  }

  const rows =
    session.role === 'org_admin'
      ? await db.select().from(occupationalAccidents).orderBy(desc(occupationalAccidents.date)).limit(MAX_LIST_ROWS)
      : await db
          .select()
          .from(occupationalAccidents)
          .where(eq(occupationalAccidents.technicianId, session.id))
          .orderBy(desc(occupationalAccidents.date))
          .limit(MAX_LIST_ROWS);

  return NextResponse.json(rows.map(toOccupationalAccident));
}

export async function POST(req: Request) {
  let session;
  try {
    session = await requireRole(req, REPORTER_ROLES);
  } catch (e) {
    return e as Response;
  }

  const body = await req.json().catch(() => ({})) as Partial<OccupationalAccident>;

  const date = cleanText(body.date);
  const jobSite = cleanText(body.jobSite);
  const clientName = cleanText(body.clientName);
  const description = cleanText(body.description);
  const refrigerantInvolved = cleanText(body.refrigerantInvolved);

  if (!date || !jobSite || !clientName || !body.severity || !description) {
    return NextResponse.json(
      { error: 'date, jobSite, clientName, severity, and description are required' },
      { status: 400 }
    );
  }
  if (!VALID_SEVERITIES.includes(body.severity)) {
    return NextResponse.json({ error: 'Invalid accident severity' }, { status: 400 });
  }
  if (description.length < 20) {
    return NextResponse.json({ error: 'Description must include at least 20 characters' }, { status: 400 });
  }

  const [inserted] = await db
    .insert(occupationalAccidents)
    .values({
      technicianId: session.id,
      technicianName: session.name,
      date,
      jobSite,
      clientName,
      severity: body.severity as typeof occupationalAccidents.$inferInsert['severity'],
      description,
      refrigerantInvolved: refrigerantInvolved || null,
      nearMissFlag: body.nearMissFlag ?? false,
      nouNotified: body.nouNotified ?? false,
    })
    .returning();

  return NextResponse.json(toOccupationalAccident(inserted), { status: 201 });
}
