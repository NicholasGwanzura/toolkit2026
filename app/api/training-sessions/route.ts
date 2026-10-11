import { NextResponse } from 'next/server';
import { MAX_LIST_ROWS } from '@/lib/server/list-limits';
import { asc } from 'drizzle-orm';
import { db } from '@/db/client';
import { trainingSessions } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import type { TrainingSession } from '@/types/index';

function toTrainingSession(row: typeof trainingSessions.$inferSelect): TrainingSession {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    venue: row.venue,
    province: row.province,
    startDate: row.startDate.toISOString(),
    endDate: row.endDate.toISOString(),
    feeUsd: Number(row.feeUsd),
    seats: row.seats,
    seatsRemaining: row.seatsRemaining,
    trainerName: row.trainerName,
    trainerEmail: row.trainerEmail,
    status: row.status as TrainingSession['status'],
  };
}

// Public GET — the marketing training schedule reads this without auth.
export async function GET() {
  const rows = await db.select().from(trainingSessions).orderBy(asc(trainingSessions.startDate)).limit(MAX_LIST_ROWS);
  return NextResponse.json(rows.map(toTrainingSession));
}

export async function POST(req: Request) {
  let session;
  try {
    session = await requireRole(req, ['trainer', 'lecturer']);
  } catch (e) {
    return e as Response;
  }

  const body = await req.json().catch(() => ({})) as Partial<TrainingSession>;

  const required: Array<keyof TrainingSession> = ['title', 'summary', 'venue', 'province', 'startDate', 'endDate', 'feeUsd', 'seats'];
  for (const key of required) {
    if (body[key] === undefined || body[key] === null || body[key] === '') {
      return NextResponse.json({ error: `${key} is required` }, { status: 400 });
    }
  }

  const seats = Number(body.seats);
  const feeUsd = Number(body.feeUsd);
  if (!Number.isFinite(seats) || seats <= 0 || !Number.isFinite(feeUsd) || feeUsd < 0) {
    return NextResponse.json({ error: 'seats and feeUsd must be valid numbers' }, { status: 400 });
  }

  const [inserted] = await db
    .insert(trainingSessions)
    .values({
      title: body.title!,
      summary: body.summary!,
      venue: body.venue!,
      province: body.province!,
      startDate: new Date(body.startDate!),
      endDate: new Date(body.endDate!),
      feeUsd: feeUsd.toString(),
      seats,
      seatsRemaining: seats,
      trainerName: session.name,
      trainerEmail: session.email,
      status: 'scheduled',
    })
    .returning();

  return NextResponse.json(toTrainingSession(inserted), { status: 201 });
}
