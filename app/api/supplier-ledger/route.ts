import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { supplierLedger } from '@/db/schema/index';
import { readSessionFromRequest, requireRole } from '@/lib/server/auth';
import { requireApprovedSupplier } from '@/lib/server/supplier-access';
import { validateLedgerEntry } from '@/lib/server/ledger-validation';
import type { SupplierLedgerEntry } from '@/types/index';

function toSupplierLedgerEntry(row: typeof supplierLedger.$inferSelect): SupplierLedgerEntry {
  return {
    id: row.id,
    supplierId: row.supplierId ?? undefined,
    supplierEmail: row.supplierEmail,
    supplierName: row.supplierName,
    direction: row.direction as SupplierLedgerEntry['direction'],
    technicianId: row.technicianId ?? undefined,
    technicianRegistrationNumber: row.technicianRegistrationNumber ?? undefined,
    counterpartyName: row.counterpartyName,
    counterpartyCompany: row.counterpartyCompany ?? undefined,
    counterpartyType: row.counterpartyType as SupplierLedgerEntry['counterpartyType'],
    province: row.province,
    refrigerant: row.refrigerant,
    quantityKg: Number(row.quantityKg),
    unitPriceUsd: Number(row.unitPriceUsd),
    totalValueUsd: Number(row.totalValueUsd),
    invoiceNumber: row.invoiceNumber,
    transactionDate: row.transactionDate.toISOString(),
    referenceMonth: row.referenceMonth,
    reportedToNou: row.reportedToNou,
    clientReported: row.clientReported,
    notes: row.notes ?? undefined,
  };
}

export async function GET(req: Request) {
  const session = await readSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const supplierId = url.searchParams.get('supplierId');

  if (session.role === 'vendor') {
    const rows = await db
      .select()
      .from(supplierLedger)
      .where(eq(supplierLedger.supplierEmail, session.email));
    return NextResponse.json(rows.map(toSupplierLedgerEntry));
  }

  if (session.role === 'org_admin') {
    if (supplierId) {
      const rows = await db
        .select()
        .from(supplierLedger)
        .where(eq(supplierLedger.supplierEmail, supplierId));
      return NextResponse.json(rows.map(toSupplierLedgerEntry));
    }
    const rows = await db.select().from(supplierLedger);
    return NextResponse.json(rows.map(toSupplierLedgerEntry));
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function POST(req: Request) {
  let session;
  try {
    session = await requireRole(req, ['org_admin', 'vendor']);
    if (session.role === 'vendor') session = await requireApprovedSupplier(req);
  } catch (e) {
    return e as Response;
  }

  const body = await req.json().catch(() => null) as (Partial<SupplierLedgerEntry> & { supplier_id?: string }) | null;

  // Vendors can only log entries for themselves; org_admin may supply any email.
  const supplierEmail = session.role === 'vendor' ? session.email : (body?.supplierEmail ?? session.email);
  const supplierName  = session.role === 'vendor' ? session.name  : (body?.supplierName  ?? session.name);
  if (!supplierEmail) return NextResponse.json({ error: 'supplierEmail is required' }, { status: 400 });

  const parsed = validateLedgerEntry(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const entry = parsed.value;

  // The same invoice cannot be logged twice in the same direction for one supplier.
  const [duplicate] = await db
    .select({ id: supplierLedger.id })
    .from(supplierLedger)
    .where(and(
      eq(supplierLedger.supplierEmail, supplierEmail),
      eq(supplierLedger.invoiceNumber, entry.invoiceNumber),
      eq(supplierLedger.direction, entry.direction),
    ))
    .limit(1);
  if (duplicate) {
    return NextResponse.json({ error: `Invoice ${entry.invoiceNumber} is already recorded as a ${entry.direction}.` }, { status: 409 });
  }

  const [inserted] = await db
    .insert(supplierLedger)
    .values({
      supplierId: session.role === 'vendor' ? undefined : body?.supplierId,
      supplierEmail,
      supplierName: supplierName ?? '',
      direction: entry.direction,
      technicianId: body?.technicianId,
      technicianRegistrationNumber: body?.technicianRegistrationNumber,
      counterpartyName: entry.counterpartyName,
      counterpartyCompany: entry.counterpartyCompany,
      counterpartyType: entry.counterpartyType,
      province: entry.province,
      refrigerant: entry.refrigerant,
      quantityKg: String(entry.quantityKg),
      unitPriceUsd: String(entry.unitPriceUsd),
      totalValueUsd: String(entry.totalValueUsd),
      invoiceNumber: entry.invoiceNumber,
      transactionDate: entry.transactionDate,
      referenceMonth: entry.referenceMonth,
      reportedToNou: entry.reportedToNou,
      clientReported: entry.clientReported,
      notes: entry.notes,
      createdAt: new Date(),
    })
    .returning();

  return NextResponse.json(toSupplierLedgerEntry(inserted), { status: 201 });
}
