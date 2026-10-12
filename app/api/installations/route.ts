import { NextResponse } from 'next/server';
import { MAX_LIST_ROWS } from '@/lib/server/list-limits';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { installations } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import type { Installation } from '@/types/index';
import { checklistSchema } from '@/lib/server/installation-checklist';
import { getTableColumns, sql } from 'drizzle-orm';

function toInstallation(row: typeof installations.$inferSelect): Installation {
  return {
    id: row.id,
    technicianId: row.technicianId,
    technicianName: row.technicianName,
    clientName: row.clientName,
    location: row.location ?? undefined,
    jobDetails: row.jobDetails,
    floorSpace: row.floorSpace ?? '',
    jobType: row.jobType as Installation['jobType'],
    installationDate: row.installationDate.toISOString(),
    equipmentId: row.equipmentId ?? undefined,
    status: row.status as Installation['status'],
    images: row.images,
    checklistSnapshot: row.checklistSnapshot ?? null,
    cocRequested: row.cocRequested,
    cocApproved: row.cocApproved,
    cocRequestId: row.cocRequestId ?? undefined,
    cocApprovalDate: row.cocApprovalDate?.toISOString() ?? undefined,
  };
}

// The list never carries the photos: each can be megabytes, and a list of every installation would
// download them all. The photos are fetched one installation at a time from /api/installations/[id]/images.
const { images: _images, ...summaryColumns } = getTableColumns(installations);
const summarySelect = { ...summaryColumns, imageCount: sql<number>`jsonb_array_length(${installations.images})`.mapWith(Number) };

function toInstallationSummary(row: Omit<typeof installations.$inferSelect, 'images'> & { imageCount: number }): Installation {
  return { ...toInstallation({ ...row, images: [] }), images: [], imageCount: row.imageCount };
}

export async function GET(req: Request) {
  let session;
  try {
    session = await requireRole(req, ['technician', 'contractor', 'org_admin']);
  } catch (e) {
    return e as Response;
  }

  const rows =
    session.role === 'org_admin'
      ? await db.select(summarySelect).from(installations).orderBy(desc(installations.createdAt)).limit(MAX_LIST_ROWS)
      : await db
          .select(summarySelect)
          .from(installations)
          .where(eq(installations.technicianId, session.id))
          .orderBy(desc(installations.createdAt))
          .limit(MAX_LIST_ROWS);

  return NextResponse.json(rows.map(toInstallationSummary));
}

export async function POST(req: Request) {
  let session;
  try {
    session = await requireRole(req, ['technician', 'contractor', 'org_admin']);
  } catch (e) {
    return e as Response;
  }

  const body = await req.json().catch(() => ({})) as Partial<Installation>;

  if (!body.clientName?.trim() || !body.location?.trim() || !body.jobDetails?.trim()) {
    return NextResponse.json({ error: 'clientName, location, and jobDetails are required' }, { status: 400 });
  }
  if (body.clientName.length > 200 || body.location.length > 300 || body.jobDetails.length > 10000 || (body.floorSpace?.length ?? 0) > 100) {
    return NextResponse.json({ error: 'Installation fields exceed supported lengths' }, { status: 400 });
  }
  if (body.jobType && !['C40_FREEZER', 'C60_FREEZER', 'C90_FREEZER', 'COLD_ROOM', 'FREEZER_ROOM'].includes(body.jobType)) {
    return NextResponse.json({ error: 'Invalid jobType' }, { status: 400 });
  }
  const checklistResult = checklistSchema.safeParse(body.checklistSnapshot);
  if (!checklistResult.success) return NextResponse.json({ error: 'Invalid checklist snapshot' }, { status: 400 });
  const images = body.images ?? [];
  if (!Array.isArray(images) || images.length > 10 || images.reduce((total, image) => total + (typeof image === 'string' ? image.length : Infinity), 0) > 11_000_000 || images.some((image) => typeof image !== 'string' || image.length > 3_000_000 || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image))) {
    return NextResponse.json({ error: 'Evidence must be at most 10 JPEG, PNG, or WebP images within the size limit' }, { status: 400 });
  }

  if (body.cocRequested || body.cocApproved || body.status) {
    return NextResponse.json({ error: 'Installation review fields cannot be set on create' }, { status: 400 });
  }

  const [inserted] = await db
    .insert(installations)
    .values({
      technicianId: session.id,
      technicianName: session.name,
      clientName: body.clientName.trim(),
      location: body.location.trim(),
      jobDetails: body.jobDetails.trim(),
      floorSpace: body.floorSpace ?? null,
      jobType: body.jobType ?? 'COLD_ROOM',
      installationDate: new Date(),
      status: 'pending',
      images,
      checklistSnapshot: checklistResult.data ?? null,
      cocRequested: false,
      cocApproved: false,
      cocRequestId: null,
      notes: null,
    })
    .returning();

  return NextResponse.json(toInstallation(inserted), { status: 201 });
}
