import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { trainingSessions } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import { toTrainingSession } from '@/lib/server/request-serializers';
import { validateTrainingSession } from '@/lib/training-session';
import type { TrainingSession } from '@/types/index';

type EditableFields = Partial<
  Pick<TrainingSession, 'title' | 'summary' | 'venue' | 'province' | 'startDate' | 'endDate' | 'feeUsd' | 'seats'>
>;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireRole(req, ['trainer', 'lecturer', 'org_admin']);
  } catch (e) {
    return e as Response;
  }

  const { id } = await params;
  const [row] = await db.select().from(trainingSessions).where(eq(trainingSessions.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (session.role !== 'org_admin' && row.trainerEmail !== session.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as EditableFields;
  const result = validateTrainingSession({
    title: body.title ?? row.title,
    summary: body.summary ?? row.summary,
    venue: body.venue ?? row.venue,
    province: body.province ?? row.province,
    startDate: body.startDate !== undefined ? new Date(body.startDate) : row.startDate,
    endDate: body.endDate !== undefined ? new Date(body.endDate) : row.endDate,
    feeUsd: body.feeUsd !== undefined ? Number(body.feeUsd) : Number(row.feeUsd),
    seats: body.seats !== undefined ? Number(body.seats) : row.seats,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const values = result.value;
  const booked = Math.max(0, row.seats - row.seatsRemaining);
  if (values.seats < booked) {
    return NextResponse.json({ error: `Seats cannot be fewer than the ${booked} already booked.` }, { status: 409 });
  }

  const [updated] = await db
    .update(trainingSessions)
    .set({
      title: values.title,
      summary: values.summary,
      venue: values.venue,
      province: values.province,
      startDate: values.startDate,
      endDate: values.endDate,
      feeUsd: values.feeUsd.toString(),
      seats: values.seats,
      seatsRemaining: values.seats - booked,
    })
    .where(eq(trainingSessions.id, id))
    .returning();

  return NextResponse.json(toTrainingSession(updated));
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireRole(req, ['trainer', 'lecturer', 'org_admin']);
  } catch (e) {
    return e as Response;
  }

  const { id } = await params;
  const [row] = await db.select().from(trainingSessions).where(eq(trainingSessions.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (session.role !== 'org_admin' && row.trainerEmail !== session.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await db.delete(trainingSessions).where(eq(trainingSessions.id, id));
  return NextResponse.json({ deleted: true, id });
}
