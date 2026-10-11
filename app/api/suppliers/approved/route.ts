import { NextResponse } from 'next/server';
import { and, eq, gte, lt } from 'drizzle-orm';
import { db } from '@/db/client';
import { supplierApplications, supplierLedger } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import { quotaUsage } from '@/lib/supplier-quota';
import type { ApprovedSupplier } from '@/types/index';

// Any authenticated field role can look up the approved-supplier directory: technicians need it
// to select a verified supplier when logging refrigerant purchases. Sales totals and quotas are
// commercially sensitive, so they are only returned to administrators and to the supplier itself.
export async function GET(req: Request) {
  let session;
  try {
    session = await requireRole(req, ['technician', 'contractor', 'trainer', 'lecturer', 'vendor', 'org_admin']);
  } catch (e) {
    return e as Response;
  }

  const rows = await db
    .select()
    .from(supplierApplications)
    .where(eq(supplierApplications.status, 'approved'));

  // One query for every supplier's sales this calendar year, instead of one per supplier.
  const now = Date.now();
  const year = new Date(now).getUTCFullYear();
  const sales = await db
    .select({ email: supplierLedger.supplierEmail, quantityKg: supplierLedger.quantityKg, transactionDate: supplierLedger.transactionDate })
    .from(supplierLedger)
    .where(and(
      eq(supplierLedger.direction, 'sale'),
      gte(supplierLedger.transactionDate, new Date(Date.UTC(year, 0, 1))),
      lt(supplierLedger.transactionDate, new Date(Date.UTC(year + 1, 0, 1))),
    ));
  const salesByEmail = new Map<string, Array<{ quantityKg: number; transactionDate: string }>>();
  for (const sale of sales) {
    const key = sale.email.toLowerCase();
    const list = salesByEmail.get(key) ?? [];
    list.push({ quantityKg: Number(sale.quantityKg), transactionDate: sale.transactionDate.toISOString() });
    salesByEmail.set(key, list);
  }

  const suppliers: ApprovedSupplier[] = rows.map((row) => {
    const base: ApprovedSupplier = {
      id: row.id,
      name: row.tradingName || row.companyName,
      refrigerants: (row.refrigerantsSupplied as string[]) ?? [],
      nouApproved: true,
      region: row.province,
    };
    const maySeeFigures = session.role === 'org_admin' || (session.role === 'vendor' && row.email.toLowerCase() === session.email.toLowerCase());
    if (!maySeeFigures) return base;

    const usage = quotaUsage({
      sales: salesByEmail.get(row.email.toLowerCase()) ?? [],
      quotaKg: row.importQuotaKg === null ? null : Number(row.importQuotaKg),
      now,
    });
    return {
      ...base,
      totalSalesKg: usage.salesKg,
      importQuotaKg: usage.quotaKg,
      usagePercent: usage.usagePercent === null ? null : Math.round(usage.usagePercent),
      quotaStatus: usage.status,
    };
  });

  return NextResponse.json(suppliers);
}
