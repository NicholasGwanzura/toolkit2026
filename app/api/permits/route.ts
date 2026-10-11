import { NextResponse } from 'next/server';
import { MAX_LIST_ROWS } from '@/lib/server/list-limits';
import { randomBytes } from 'node:crypto';
import { desc, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { tradePermits } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import { requireApprovedSupplier } from '@/lib/server/supplier-access';
import type { TradePermit } from '@/types/index';
import { toTradePermit } from '@/lib/server/request-serializers';

function permitNumber() {
  return `PMT-${randomBytes(12).toString('hex').toUpperCase()}`;
}

export async function GET(req: Request) {
  let session;
  try {
    session = await requireRole(req, ['vendor', 'org_admin']);
  } catch (e) {
    return e as Response;
  }

  const rows =
    session.role === 'org_admin'
      ? await db.select().from(tradePermits).orderBy(desc(tradePermits.submittedAt)).limit(MAX_LIST_ROWS)
      : await db
          .select()
          .from(tradePermits)
          .where(
            // Filter by email OR vendor id to handle email changes gracefully
            sql`${tradePermits.applicantEmail} = ${session.email} OR ${tradePermits.applicantEmail} = ANY(
              SELECT email FROM supplier_applications WHERE id = ${session.id}::uuid AND status = 'approved'
            )`
          )
          .orderBy(desc(tradePermits.submittedAt))
          .limit(MAX_LIST_ROWS);

  return NextResponse.json(rows.map(toTradePermit));
}

export async function POST(req: Request) {
  let session;
  try {
    session = await requireApprovedSupplier(req);
  } catch (e) {
    return e as Response;
  }

  const body = await req.json().catch(() => ({})) as Partial<TradePermit>;

  const required: Array<keyof TradePermit> = [
    'permitType', 'applicantCompany', 'refrigerantLabel', 'quantityKg', 'countryOfOriginOrDestination',
  ];
  for (const key of required) {
    if (!body[key]) {
      return NextResponse.json({ error: `${key} is required` }, { status: 400 });
    }
  }
  const quantityKg = Number(body.quantityKg);
  if (!Number.isFinite(quantityKg) || quantityKg <= 0 || quantityKg > 1_000_000) {
    return NextResponse.json({ error: 'quantityKg must be a positive value within the supported range' }, { status: 400 });
  }

  const [inserted] = await db
    .insert(tradePermits)
    .values({
      permitNumber: permitNumber(),
      permitType: body.permitType!,
      applicantName: session.name,
      applicantCompany: body.applicantCompany!,
      applicantEmail: session.email,
      refrigerantId: body.refrigerantId ?? null,
      refrigerantLabel: body.refrigerantLabel!,
      quantityKg: quantityKg.toString(),
      countryOfOriginOrDestination: body.countryOfOriginOrDestination!,
      status: 'pending',
      notes: body.notes ?? null,
    })
    .returning();

  return NextResponse.json(toTradePermit(inserted), { status: 201 });
}
