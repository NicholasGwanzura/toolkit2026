import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/server/auth';
import {
  getMostUsedRefrigerants,
  getMostInstalledRefrigerants,
  getMostRecoveredRefrigerants,
  getClassificationBreakdown,
  getMonthlyUsageTrend,
  getComplianceOverview,
} from '@/lib/whatgas/analytics';

export async function GET(req: Request) {
  try {
    await requireRole(req, ['org_admin']);
  } catch (e) {
    return e as Response;
  }

  try {
  const [mostUsed, mostInstalled, mostRecovered, classificationBreakdown, monthlyTrend, complianceOverview] =
    await Promise.all([
      getMostUsedRefrigerants(10),
      getMostInstalledRefrigerants(10),
      getMostRecoveredRefrigerants(10),
      getClassificationBreakdown(),
      getMonthlyUsageTrend(),
      getComplianceOverview(),
    ]);

  return NextResponse.json({
    mostUsed,
    mostInstalled,
    mostRecovered,
    classificationBreakdown,
    monthlyTrend,
    complianceOverview,
  });
  } catch (error) {
    console.error('Refrigerant analytics failed', error);
    return NextResponse.json({ error: 'Could not load refrigerant analytics.' }, { status: 500 });
  }
}
