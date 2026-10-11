import { recordAuditEventSafe } from '@/lib/server/audit';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { supplierComplianceApplications } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import type { SupplierComplianceApplication } from '@/types/index';

function toSupplierComplianceApplication(row: typeof supplierComplianceApplications.$inferSelect): SupplierComplianceApplication {
  return {
    id: row.id,
    supplierEmail: row.supplierEmail,
    supplierName: row.supplierName,
    certificateType: row.certificateType as SupplierComplianceApplication['certificateType'],
    monthCoverage: row.monthCoverage,
    sitesCovered: Number(row.sitesCovered),
    contactPerson: row.contactPerson,
    supportingSummary: row.supportingSummary,
    status: row.status as SupplierComplianceApplication['status'],
    submittedAt: row.submittedAt.toISOString(),
    notes: row.notes ?? undefined,
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
  const [row] = await db
    .select()
    .from(supplierComplianceApplications)
    .where(eq(supplierComplianceApplications.id, id))
    .limit(1);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (row.status !== 'submitted' && row.status !== 'under-review') {
    return NextResponse.json({ error: `This application was already ${row.status}.` }, { status: 409 });
  }

  const [updated] = await db
    .update(supplierComplianceApplications)
    .set({ status: 'approved' })
    .where(eq(supplierComplianceApplications.id, id))
    .returning();

  await recordAuditEventSafe({
    entityType: 'supplier_compliance',
    entityId: updated.id,
    action: 'approved',
    previousStatus: row.status,
    newStatus: 'approved',
    performedBy: session.name,
    performedByRole: session.role,
  });
  return NextResponse.json(toSupplierComplianceApplication(updated));
}
