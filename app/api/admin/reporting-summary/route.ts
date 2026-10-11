import { NextResponse } from 'next/server';
import { sql, type SQL } from 'drizzle-orm';
import { db } from '@/db/client';
import { requireRole } from '@/lib/server/auth';
import { bucketStatuses, isReportRange, rangeStart, type Pipeline, type ReportingSummary } from '@/lib/reporting-summary';

// Counts are made in the database and follow the chosen range, so the cards and the export agree.
async function pipeline(table: string, dateColumn: string, since: Date | null): Promise<Pipeline> {
  const filter: SQL = since ? sql`WHERE ${sql.identifier(dateColumn)} >= ${since.toISOString()}::timestamptz` : sql``;
  const rows = await db.execute<{ status: string; count: number }>(
    sql`SELECT status::text AS status, COUNT(*)::int AS count FROM ${sql.identifier(table)} ${filter} GROUP BY status`,
  );
  return bucketStatuses(rows.rows);
}

export async function GET(req: Request) {
  try {
    await requireRole(req, ['org_admin']);
  } catch (e) {
    return e as Response;
  }

  const requested = new URL(req.url).searchParams.get('range');
  const range = isReportRange(requested) ? requested : 'all';
  const since = rangeStart(range);

  try {
    const roleFilter: SQL = since ? sql`WHERE submitted_at >= ${since.toISOString()}::timestamptz` : sql``;
    const [students, technicianApplications, courses, suppliers, reorders, roleRows, registryRows] = await Promise.all([
      pipeline('student_applications', 'submitted_at', since),
      pipeline('technician_applications', 'submitted_at', since),
      pipeline('courses', 'created_at', since),
      pipeline('supplier_applications', 'submitted_at', since),
      pipeline('supplier_reorders', 'created_at', since),
      db.execute<{ role: string; status: string; count: number }>(
        sql`SELECT role::text AS role, status::text AS status, COUNT(*)::int AS count FROM registration_applications ${roleFilter} GROUP BY role, status`,
      ),
      db.execute<{ registered: number; active: number }>(
        sql`SELECT COUNT(*)::int AS registered, COUNT(*) FILTER (WHERE status = 'active')::int AS active FROM technicians`,
      ),
    ]);

    const byRole: Record<string, Pipeline> = {};
    for (const role of [...new Set(roleRows.rows.map((r) => r.role))]) {
      byRole[role] = bucketStatuses(roleRows.rows.filter((r) => r.role === role));
    }
    const otherRoles = { ...bucketStatuses(roleRows.rows), byRole };
    const registry = { registered: registryRows.rows[0]?.registered ?? 0, active: registryRows.rows[0]?.active ?? 0 };

    const summary: ReportingSummary = { range, students, technicianApplications, otherRoles, courses, suppliers, reorders, registry };
    return NextResponse.json(summary);
  } catch (error) {
    console.error('Reporting summary failed', error);
    return NextResponse.json({ error: 'Could not load the report.' }, { status: 500 });
  }
}
