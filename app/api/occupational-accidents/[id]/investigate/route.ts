import { recordAuditEventSafe } from '@/lib/server/audit';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { occupationalAccidents } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import type { OccupationalAccident } from '@/types/index';

const VALID_ROOT_CAUSES = [
  'LACK_OF_TRAINING',
  'NEGLIGENCE',
  'SYSTEM_FAILURE',
  'ENVIRONMENTAL',
  'COMMUNICATION',
  'EQUIPMENT',
] as const;
const VALID_STATUSES = ['Open', 'Under Investigation', 'Closed'] as const;

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

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireRole(req, ['org_admin']);
  } catch (e) {
    return e as Response;
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({})) as Partial<OccupationalAccident>;
  const rootCause = cleanText(body.rootCause);
  const investigationDate = cleanText(body.investigationDate);
  const investigatorName = cleanText(body.investigatorName);
  const correctiveActions = cleanText(body.correctiveActions);
  const preventiveMeasures = cleanText(body.preventiveMeasures);
  const requestedStatus = cleanText(body.status);

  const [row] = await db.select().from(occupationalAccidents).where(eq(occupationalAccidents.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (rootCause && !VALID_ROOT_CAUSES.includes(rootCause as typeof VALID_ROOT_CAUSES[number])) {
    return NextResponse.json({ error: 'Invalid root cause category' }, { status: 400 });
  }
  if (requestedStatus && !VALID_STATUSES.includes(requestedStatus as typeof VALID_STATUSES[number])) {
    return NextResponse.json({ error: 'Invalid investigation status' }, { status: 400 });
  }
  const status = (requestedStatus || row.status) as typeof VALID_STATUSES[number];
  if (status === 'Closed' && (!rootCause || !investigationDate || !investigatorName || !correctiveActions || !preventiveMeasures)) {
    return NextResponse.json(
      { error: 'Root cause, investigation date, investigator, corrective actions, and preventive measures are required before closing.' },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(occupationalAccidents)
    .set({
      rootCause: rootCause || null,
      investigationDate: investigationDate || null,
      investigatorName: investigatorName || null,
      correctiveActions: correctiveActions || null,
      preventiveMeasures: preventiveMeasures || null,
      status,
      updatedAt: new Date(),
    })
    .where(eq(occupationalAccidents.id, id))
    .returning();

  await recordAuditEventSafe({
    entityType: 'accident',
    entityId: updated.id,
    action: 'investigation_updated',
    previousStatus: row.status,
    newStatus: status,
    performedBy: session.name,
    performedByRole: session.role,
    notes: investigatorName ? `Investigator: ${investigatorName}` : undefined,
  });
  return NextResponse.json(toOccupationalAccident(updated));
}
