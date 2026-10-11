'use client';

import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  BarChart3, TrendingUp, Cylinder, FileText, Recycle, RefreshCw,
  CheckCircle2, AlertTriangle, Clock,
} from 'lucide-react';
import { useRefrigerantAnalytics } from '@/lib/api';
import type { RefrigerantAnalytics } from '@/types/index';

const PIE_COLORS = ['#D97706', '#2563eb', '#7c3aed', '#dc2626', '#059669', '#0891b2', '#db2777'];

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-gray-900">{title}</h2>
      {children}
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, sub, color,
}: {
  icon: typeof Cylinder; label: string; value: string; sub?: string; color: string;
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    rose: 'bg-rose-50 text-rose-600',
    cyan: 'bg-cyan-50 text-cyan-600',
  };
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className={`p-2 ${colors[color] ?? colors.blue}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function ComplianceSection({ data }: { data: RefrigerantAnalytics['complianceOverview'] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-gray-900">Compliance Module Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cylinders */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Cylinder className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-gray-900">Cylinders</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.cylinders.totalCylinders}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5">
              <CheckCircle2 className="h-3 w-3" /> {data.cylinders.inServiceCount} in service
            </span>
            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2 py-0.5">
              <AlertTriangle className="h-3 w-3" /> {data.cylinders.overdueInspectionCount} inspection overdue
            </span>
          </div>
          <p className="text-xs text-gray-500">{data.cylinders.totalFillKg.toFixed(1)} kg total fill</p>
        </div>

        {/* Permits */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-semibold text-gray-900">Trade Permits</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.permits.totalPermits}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5">
              <CheckCircle2 className="h-3 w-3" /> {data.permits.approvedCount} approved
            </span>
            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5">
              <Clock className="h-3 w-3" /> {data.permits.pendingCount} pending
            </span>
          </div>
          <p className="text-xs text-gray-500">{data.permits.totalQuantityKg.toFixed(1)} kg total</p>
        </div>

        {/* Reclamation */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Recycle className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-semibold text-gray-900">Reclamation</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.reclamation.totalRecords}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5">
              <CheckCircle2 className="h-3 w-3" /> {data.reclamation.passedCount} passed
            </span>
            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2 py-0.5">
              <AlertTriangle className="h-3 w-3" /> {data.reclamation.failedCount} failed
            </span>
            {data.reclamation.pendingCount > 0 && (
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5">
                <Clock className="h-3 w-3" /> {data.reclamation.pendingCount} pending
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">{data.reclamation.totalQuantityKg.toFixed(1)} kg total</p>
        </div>

        {/* Recycling */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-cyan-600" />
            <span className="text-sm font-semibold text-gray-900">Recycling</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.recycling.totalRecords}</p>
          <p className="text-xs text-gray-500 mt-1">{data.recycling.totalQuantityKg.toFixed(1)} kg total</p>
        </div>
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="flex h-[280px] items-center justify-center text-center text-sm text-gray-500">{children}</p>;
}

export default function RefrigerantAnalyticsPage() {
  const { data, error, isLoading, mutate } = useRefrigerantAnalytics();

  if (error) {
    return (
      <div role="alert" className="space-y-3 rounded-lg border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
        <p className="font-semibold">Refrigerant analytics could not be loaded.</p>
        <p>{error instanceof Error ? error.message : 'The server returned an error.'} Nothing on this page should be read as zero until it loads.</p>
        <button type="button" onClick={() => mutate()} className="border border-rose-300 bg-white px-3 py-1.5 font-semibold text-rose-800 hover:bg-rose-100">Try again</button>
      </div>
    );
  }
  if (isLoading || !data) {
    return <div className="p-8 text-sm text-gray-500">Loading analytics…</div>;
  }
  const hasKg = (rows: { totalKg: number }[]) => rows.some((r) => r.totalKg > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <BarChart3 className="h-6 w-6 text-[#D97706]" /> Refrigerant Analytics
        </h1>
        <p className="mt-1 text-gray-500">Usage, classification, and trend analysis across field gas logs.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Most Charged Refrigerants (kg, excluding recovery)">
          {!hasKg(data.mostUsed) ? <Empty>No charge or leak-repair gas has been logged yet.</Empty> : <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.mostUsed}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="refrigerant" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="totalKg" fill="#D97706" />
            </BarChart>
          </ResponsiveContainer>}
        </ChartCard>

        <ChartCard title="Most Installed (planned and completed jobs, cancelled excluded)">
          {data.mostInstalled.length === 0 ? <Empty>No jobs with a refrigerant have been planned yet.</Empty> : <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.mostInstalled}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="refrigerant" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>}
        </ChartCard>

        <ChartCard title="Most Recovered Refrigerants (kg)">
          {!hasKg(data.mostRecovered) ? <Empty>No recovery has been logged yet.</Empty> : <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data.mostRecovered}
                dataKey="totalKg"
                nameKey="refrigerant"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => entry.name}
              >
                {data.mostRecovered.map((entry, index) => (
                  <Cell key={entry.refrigerant} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>}
        </ChartCard>

        <ChartCard title="Regulatory Classification (kg, categories overlap)">
          <p className="-mt-2 mb-2 text-xs text-gray-500">A gas can be in several categories, so these bars add up to more than the total logged.</p>
          {!hasKg(data.classificationBreakdown) ? <Empty>No gas has been logged yet.</Empty> : <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.classificationBreakdown} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={140} />
              <Tooltip />
              <Bar dataKey="totalKg" fill="#7c3aed" />
            </BarChart>
          </ResponsiveContainer>}
        </ChartCard>

        <div className="lg:col-span-2">
          <ChartCard title="Monthly Usage Trend (last 6 months)">
            <div className="mb-2 flex items-center gap-1.5 text-xs text-gray-500">
              <TrendingUp className="h-3.5 w-3.5" /> Total kg logged per month across all refrigerants and actions, including recovery
            </div>
            {!hasKg(data.monthlyTrend) ? <Empty>No gas has been logged in the last 6 months.</Empty> : <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="totalKg" stroke="#D97706" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>}
          </ChartCard>
        </div>
      </div>

      <ComplianceSection data={data.complianceOverview} />
    </div>
  );
}
