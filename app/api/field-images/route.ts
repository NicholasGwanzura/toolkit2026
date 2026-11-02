import { desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/client';
import { fieldImageRecords } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import { isFieldWorkerRole } from '@/lib/field-worker';
import { recordedTime, validClientRef } from '@/lib/offline-record';

const imageRecordSchema = z.object({
  jobId: z.string().trim().min(1).max(200),
  beforeAfter: z.enum(['before', 'after', 'inspection']),
  annotationsJson: z.array(z.object({
    id: z.string().min(1).max(100),
    x: z.number().finite().min(0).max(100),
    y: z.number().finite().min(0).max(100),
    label: z.string().trim().min(1).max(60),
  })).max(100),
  gpsTag: z.string().trim().max(120).optional(),
  imageDataUrl: z.string().max(1_200_000).regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/),
  clientRef: z.string().optional(),
  recordedAt: z.string().optional(),
});

export async function GET(req: Request) {
  let session;
  try {
    session = await requireRole(req, ['technician', 'contractor', 'org_admin']);
  } catch (e) {
    return e as Response;
  }

  const requestedLimit = Number(new URL(req.url).searchParams.get('limit') ?? 5);
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1) {
    return NextResponse.json({ error: 'limit must be a positive integer' }, { status: 400 });
  }
  const limit = Math.min(requestedLimit, 20);
  const rows = await db.select().from(fieldImageRecords)
    .where(isFieldWorkerRole(session.role) ? eq(fieldImageRecords.technicianId, session.id) : undefined)
    .orderBy(desc(fieldImageRecords.createdAt))
    .limit(limit);
  return NextResponse.json(rows.map(row => ({
    id: row.id,
    jobId: row.jobId,
    beforeAfter: row.beforeAfter,
    annotationsJson: row.annotationsJson,
    gpsTag: row.gpsTag ?? undefined,
    imageDataUrl: row.imageDataUrl,
    createdAt: row.createdAt.toISOString(),
  })), { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(req: Request) {
  let session;
  try {
    session = await requireRole(req, ['technician', 'contractor', 'org_admin']);
  } catch (e) {
    return e as Response;
  }

  let body: z.infer<typeof imageRecordSchema>;
  try {
    const parsed = imageRecordSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid field image record', details: parsed.error.issues }, { status: 400 });
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Sent again after a dropped connection: return what was already stored.
  const clientRef = validClientRef(body.clientRef);
  let [row] = clientRef ? await db.select().from(fieldImageRecords).where(eq(fieldImageRecords.clientRef, clientRef)).limit(1) : [];
  if (row && row.technicianId !== session.id) return NextResponse.json({ error: 'That record reference is already in use.' }, { status: 409 });
  const created = !row;
  if (!row) [row] = await db.insert(fieldImageRecords).values({
    clientRef,
    createdAt: recordedTime(body.recordedAt, new Date()),
    technicianId: session.id,
    jobId: body.jobId,
    beforeAfter: body.beforeAfter,
    annotationsJson: body.annotationsJson,
    gpsTag: body.gpsTag || null,
    imageDataUrl: body.imageDataUrl,
  }).returning();

  return NextResponse.json({
    id: row.id,
    jobId: row.jobId,
    beforeAfter: row.beforeAfter,
    annotationsJson: row.annotationsJson,
    gpsTag: row.gpsTag ?? undefined,
    imageDataUrl: row.imageDataUrl,
    createdAt: row.createdAt.toISOString(),
  }, { status: created ? 201 : 200, headers: { 'Cache-Control': 'private, no-store' } });
}
