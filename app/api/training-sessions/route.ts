import { NextResponse } from 'next/server';
import { MAX_LIST_ROWS } from '@/lib/server/list-limits';
import { asc, ne, or } from 'drizzle-orm';
import { db } from '@/db/client';
import { trainingSessions } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import { toTrainingSession } from '@/lib/server/request-serializers';
import { validateTrainingSession } from '@/lib/training-session';
import type { TrainingSession } from '@/types/index';

// Public GET — the marketing training schedule reads this without auth.
// Old seeds inserted training sessions under the demo trainer account; hide them from every
// calendar. scripts/remove-demo-training.ts deletes the rows when a DATABASE_URL is available.
export async function GET() {
  const rows = await db
    .select()
    .from(trainingSessions)
    .where(
      or(
        ne(trainingSessions.trainerName, 'Demo Trainer'),
        ne(trainingSessions.trainerEmail, 'trainer@coolpro.demo')
      )
    )
    .orderBy(asc(trainingSessions.startDate))
    .limit(MAX_LIST_ROWS);
  return NextResponse.json(rows.map(toTrainingSession));
}

export async function POST(req: Request) {
  let session;
  try {
    session = await requireRole(req, ['trainer', 'lecturer', 'org_admin']);
  } catch (e) {
    return e as Response;
  }

  const body = await req.json().catch(() => ({})) as Partial<TrainingSession>;
  const result = validateTrainingSession({
    title: typeof body.title === 'string' ? body.title : '',
    summary: typeof body.summary === 'string' ? body.summary : '',
    venue: typeof body.venue === 'string' ? body.venue : '',
    province: typeof body.province === 'string' ? body.province : '',
    startDate: new Date(body.startDate ?? ''),
    endDate: new Date(body.endDate ?? ''),
    feeUsd: Number(body.feeUsd),
    seats: Number(body.seats),
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const values = result.value;
  const [inserted] = await db
    .insert(trainingSessions)
    .values({
      title: values.title,
      summary: values.summary,
      venue: values.venue,
      province: values.province,
      startDate: values.startDate,
      endDate: values.endDate,
      feeUsd: values.feeUsd.toString(),
      seats: values.seats,
      seatsRemaining: values.seats,
      trainerName: session.name,
      trainerEmail: session.email,
      status: 'scheduled',
    })
    .returning();

  return NextResponse.json(toTrainingSession(inserted), { status: 201 });
}
