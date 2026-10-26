import { sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { fillMonths, mergeUsage, type UsageRow } from './analytics-helpers';

export type RefrigerantUsageEntry = { refrigerant: string; totalKg: number; count: number };
export type ClassificationBreakdown = { category: string; totalKg: number; count: number };

type RawUsage = { refrigerant: string; total_kg: string; count: number };
const toUsage = (rows: RawUsage[]): UsageRow[] => rows.map((r) => ({ refrigerant: r.refrigerant, totalKg: Number(r.total_kg), count: r.count }));

/** Gas charged into systems (charge and leak-repair top-ups). Recovery is reported separately. */
export async function getMostUsedRefrigerants(limit = 10): Promise<RefrigerantUsageEntry[]> {
  const rows = await db.execute<RawUsage>(sql`
    SELECT refrigerant_type AS refrigerant, COALESCE(SUM(amount), 0) AS total_kg, COUNT(*)::int AS count
    FROM gas_usage_logs
    WHERE action_type <> 'Recovery'
    GROUP BY refrigerant_type
  `);
  return mergeUsage(toUsage(rows.rows), limit);
}

/** Most-installed refrigerants across scheduled and completed planner jobs (cancelled jobs are left out). */
export async function getMostInstalledRefrigerants(limit = 10): Promise<RefrigerantUsageEntry[]> {
  const rows = await db.execute<RawUsage>(sql`
    SELECT refrigerant_type AS refrigerant, COALESCE(SUM(amount), 0) AS total_kg, COUNT(*)::int AS count
    FROM planner_jobs
    WHERE refrigerant_type IS NOT NULL AND status <> 'cancelled'
    GROUP BY refrigerant_type
  `);
  return mergeUsage(toUsage(rows.rows), limit, 'count');
}

/** Most-recovered refrigerants (gas usage logs with actionType = 'Recovery'). */
export async function getMostRecoveredRefrigerants(limit = 10): Promise<RefrigerantUsageEntry[]> {
  const rows = await db.execute<RawUsage>(sql`
    SELECT refrigerant_type AS refrigerant, COALESCE(SUM(amount), 0) AS total_kg, COUNT(*)::int AS count
    FROM gas_usage_logs
    WHERE action_type = 'Recovery'
    GROUP BY refrigerant_type
  `);
  return mergeUsage(toUsage(rows.rows), limit);
}

/**
 * Gas usage by WhatGas classification. A refrigerant can sit in several categories (an HFC can
 * also be high-GWP and Kigali controlled), so these rows overlap and must not be added together.
 * Logs that are not linked to a catalogue refrigerant appear as "Not linked to catalogue".
 */
export async function getClassificationBreakdown(): Promise<ClassificationBreakdown[]> {
  const rows = await db.execute<{ category: string; total_kg: string; count: number }>(sql`
    WITH classified AS (
      SELECT g.amount, (r.id IS NOT NULL) AS linked, r.is_hfc, r.is_hcfc, r.is_cfc, r.is_odp,
        (r.gwp ~ '^[0-9.]+$' AND r.gwp::numeric >= 1000) AS high_gwp,
        (r.kigali_gwp_value IS NOT NULL AND r.kigali_gwp_value != '' AND r.kigali_gwp_value != '0') AS kigali_controlled,
        r.is_ctrl_montreal_protocol AS montreal_controlled
      FROM gas_usage_logs g
      LEFT JOIN refrigerants r ON r.id = g.refrigerant_id
    )
    SELECT 'HFC' AS category, COALESCE(SUM(amount) FILTER (WHERE is_hfc), 0) AS total_kg, COUNT(*) FILTER (WHERE is_hfc)::int AS count FROM classified
    UNION ALL
    SELECT 'HCFC', COALESCE(SUM(amount) FILTER (WHERE is_hcfc), 0), COUNT(*) FILTER (WHERE is_hcfc)::int FROM classified
    UNION ALL
    SELECT 'CFC', COALESCE(SUM(amount) FILTER (WHERE is_cfc), 0), COUNT(*) FILTER (WHERE is_cfc)::int FROM classified
    UNION ALL
    SELECT 'ODS (ODP > 0)', COALESCE(SUM(amount) FILTER (WHERE is_odp), 0), COUNT(*) FILTER (WHERE is_odp)::int FROM classified
    UNION ALL
    SELECT 'High GWP (>=1000)', COALESCE(SUM(amount) FILTER (WHERE high_gwp), 0), COUNT(*) FILTER (WHERE high_gwp)::int FROM classified
    UNION ALL
    SELECT 'Kigali Controlled', COALESCE(SUM(amount) FILTER (WHERE kigali_controlled), 0), COUNT(*) FILTER (WHERE kigali_controlled)::int FROM classified
    UNION ALL
    SELECT 'Montreal Controlled', COALESCE(SUM(amount) FILTER (WHERE montreal_controlled), 0), COUNT(*) FILTER (WHERE montreal_controlled)::int FROM classified
    UNION ALL
    SELECT 'Not linked to catalogue', COALESCE(SUM(amount) FILTER (WHERE NOT linked), 0), COUNT(*) FILTER (WHERE NOT linked)::int FROM classified
  `);
  return rows.rows.map((r) => ({ category: r.category, totalKg: Number(r.total_kg), count: r.count }));
}

/** Total kg logged per month for the last 6 months. Months with no logs are returned as zero. */
export async function getMonthlyUsageTrend(): Promise<{ month: string; totalKg: number }[]> {
  const rows = await db.execute<{ month: string; total_kg: string }>(sql`
    SELECT to_char(date_trunc('month', "timestamp"), 'YYYY-MM') AS month, COALESCE(SUM(amount), 0) AS total_kg
    FROM gas_usage_logs
    WHERE "timestamp" >= date_trunc('month', now()) - interval '5 months'
    GROUP BY 1
    ORDER BY 1
  `);
  return fillMonths(rows.rows.map((r) => ({ month: r.month, totalKg: Number(r.total_kg) })), new Date());
}
