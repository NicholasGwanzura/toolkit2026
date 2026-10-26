import { desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/client';
import { fieldImageRecords } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import { isFieldWorkerRole } from '@/lib/field-worker';

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

  const [row] = await db.insert(fieldImageRecords).values({
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
  }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
}
