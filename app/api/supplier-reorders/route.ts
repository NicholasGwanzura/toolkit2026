import { toSupplierReorder } from '@/lib/server/request-serializers';
import { MAX_LIST_ROWS } from '@/lib/server/list-limits';
import { validateReorder } from '@/lib/server/reorder-validation';
import { NextResponse } from 'next/server';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { supplierReorders } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import { requireApprovedSupplier } from '@/lib/server/supplier-access';

export async function GET(req: Request) {
  let session;
  try {
    session = await requireRole(req, ['vendor', 'org_admin']);
  } catch (e) {
    return e as Response;
  }

  if (session.role === 'vendor') {
    const rows = await db
      .select()
      .from(supplierReorders)
      .where(eq(supplierReorders.vendorId, session.id));
    return NextResponse.json(rows.map(toSupplierReorder));
  }

  const rows = await db
    .select()
    .from(supplierReorders)
    .where(inArray(supplierReorders.status, ['pending_hevacraz', 'pending_nou', 'approved', 'rejected']))
    .limit(MAX_LIST_ROWS);
  return NextResponse.json(rows.map(toSupplierReorder));
}

export async function POST(req: Request) {
  let session;
  try {
    session = await requireApprovedSupplier(req);
  } catch (e) {
    return e as Response;
  }

  const parsed = validateReorder(await req.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = parsed.value;

  const [inserted] = await db
    .insert(supplierReorders)
    .values({
      vendorId: session.id,
      vendorName: session.name,
      gasType: body.gasType,
      quantityKg: String(body.quantityKg),
      purpose: body.purpose,
      reorderType: body.reorderType,
      supplierNotes: body.supplierNotes,
      status: 'pending_hevacraz',
      createdAt: new Date(),
    })
    .returning();

  return NextResponse.json(toSupplierReorder(inserted), { status: 201 });
}
