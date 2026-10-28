'use client';

import React, { useState } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Download, ShieldCheck, AlertTriangle } from 'lucide-react';
import OccupationalAccidentSection from './OccupationalAccidentSection';
import { useComplianceSummary } from '@/lib/api';
import { Drilldown } from '@/components/ui/Drilldown';
import { PERIOD_LABEL, type CompliancePeriod } from '@/lib/compliance-stats';

interface KpiCardProps {
  label: string;
  value: string;
  unit: string;
  note: string;
  description: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, unit, note, description }) => (
  <article className="min-w-0 rounded-lg border border-[#E7E5E4] bg-white p-5">
    <p className="text-sm text-[#78716C]">{label}</p>
    <p className="mt-2 flex items-baseline gap-1">
      <span className="text-3xl font-bold text-[#1C1917]">{value}</span>
      <span className="text-sm font-medium text-[#A8A29E]">{unit}</span>
    </p>
    <p className="mt-2 text-xs text-[#A8A29E]">{note}</p>
    <Drilldown label="Calculation and scope" className="mt-3 border-t border-[#F1F0EE] pt-1">
      <p>{description}</p>
    </Drilldown>
  </article>
);

const ComplianceDashboard: React.FC = () => {
  const [period, setPeriod] = useState<CompliancePeriod>('ytd');
  const { data, error, isLoading, isValidating, mutate } = useComplianceSummary(period);

  const exportPdf = async () => {
    if (!data) return;
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('HEVACRAZ Compliance Report', 14, 18);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString('en-ZW')}  |  Period: ${PERIOD_LABEL[data.period]}`, 14, 26);

    autoTable(doc, {
      startY: 34,
      head: [['Metric', 'Value']],
      body: [
        [`GWP Impact (${PERIOD_LABEL[data.period]})`, `${data.kpis.gwpImpactTonnes.toLocaleString()} tCO2e`],
        [`Approved Refrigerant Volume (${PERIOD_LABEL[data.period]})`, `${data.kpis.approvedKg.toLocaleString()} kg`],
        ['Active Technicians', `${data.kpis.activeTechnicians}`],
        ['Valid Certifications', `${data.kpis.validCertificates}`],
        [`Natural Gas Share (${PERIOD_LABEL[data.period]})`, `${data.kpis.naturalSharePct}%`],
        ['Pending Reorder Reviews (now)', `${data.kpis.pendingReviewCount}`],
      ],
      headStyles: { fillColor: [28, 25, 23] },
    });

    doc.save(`hevacraz-compliance-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (error) {
    return (
      <div role="alert" className="space-y-3 rounded-lg border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
        <p className="font-semibold">The compliance report could not be loaded.</p>
        <p>{error instanceof Error ? error.message : 'The server returned an error.'} Nothing on this page should be read as zero until it loads.</p>
        <button type="button" onClick={() => void mutate()} className="border border-rose-300 bg-white px-3 py-1.5 font-semibold text-rose-800 hover:bg-rose-100">
          Try again
        </button>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E7E5E4] border-t-[#D97706]" />
      </div>
    );
  }

  const { kpis, monthlyVolume, expiringCertificates: expiring, leakRepairs } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#78716C]">
          Figures for <span className="font-semibold text-[#1C1917]">{PERIOD_LABEL[period].toLowerCase()}</span>, unless a card says it is current.
          {isValidating && <span className="ml-2 text-xs text-[#A8A29E]">Updating…</span>}
        </p>
        <div className="flex divide-x divide-[#E7E5E4] rounded-lg border border-[#E7E5E4] bg-white" role="group" aria-label="Reporting period">
          {(Object.keys(PERIOD_LABEL) as CompliancePeriod[]).map(option => (
            <button
              key={option}
              type="button"
              onClick={() => setPeriod(option)}
              aria-pressed={period === option}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${period === option ? 'bg-[#1C1917] text-white' : 'text-[#78716C] hover:bg-[#FAFAF9]'}`}
            >
              {PERIOD_LABEL[option]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="GWP of Approved Reorders"
          value={kpis.gwpImpactTonnes.toLocaleString()}
          unit="tCO2e"
          note={PERIOD_LABEL[period]}
          description="Approved reorders in the selected period, each weighted by its refrigerant's global warming potential. This is the potential impact of what was bought."
        />
        <KpiCard
          label="Approved Volume"
          value={kpis.approvedKg.toLocaleString()}
          unit="kg"
          note={`${kpis.pendingReviewCount} pending now`}
          description="Refrigerant reorders approved in the selected period. The pending count is the review backlog right now, whatever the period."
        />
        <KpiCard
          label="Active Technicians"
          value={String(kpis.activeTechnicians)}
          unit="active"
          note={`${kpis.validCertificates} valid certificates`}
          description="Technicians marked active in the registry right now, and the valid certificates they hold. Not affected by the period."
        />
        <KpiCard
          label="Natural Gas Share"
          value={String(kpis.naturalSharePct)}
          unit="%"
          note={PERIOD_LABEL[period]}
          description="Share of the approved volume in the selected period that is a natural refrigerant (R-290, R-600a, R-744, R-717, R-1270)."
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-[#E7E5E4] bg-white p-6 lg:col-span-2">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-lg font-semibold text-[#1C1917]">Refrigerant Purchased</h3>
              <p className="text-sm text-[#78716C]">Approved reorder volume per month, in kg. Rejected and pending reorders are not included.</p>
            </div>
            <button
              type="button"
              onClick={exportPdf}
              className="inline-flex items-center gap-2 rounded-lg border border-[#E7E5E4] bg-white px-4 py-2 text-sm font-medium text-[#44403C] transition-colors hover:bg-[#FAFAF9]"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </button>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyVolume}>
                <defs>
                  <linearGradient id="colorCons" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D97706" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#D97706" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F0EE" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#78716C' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#78716C' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E7E5E4', boxShadow: 'none' }}
                />
                <Area type="monotone" dataKey="kg" name="Approved kg" stroke="#D97706" strokeWidth={2} fillOpacity={1} fill="url(#colorCons)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg bg-[#1C1917] p-6 text-white">
            <h4 className="mb-1 text-base font-semibold">Leak Repairs, last 30 days</h4>
            <p className="mb-4 text-xs text-[#A8A29E]">
              {leakRepairs.total} reported. Showing the latest {leakRepairs.alerts.length}.
            </p>
            {leakRepairs.alerts.length === 0 ? (
              <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-[#D6D3D1]">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-400" />
                  <p>
                    No leak repairs were reported in the last 30 days. They appear here when technicians log them in the Field Toolkit.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {leakRepairs.alerts.map((log) => (
                  <div key={log.id} className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-[#D6D3D1]">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                      <div>
                        <p className="font-semibold text-white">{log.technicianName} · {log.amountKg} kg {log.refrigerantType}</p>
                        <p className="mt-0.5 text-xs text-[#A8A29E]">{log.clientName} · {new Date(log.timestamp).toLocaleDateString('en-ZW')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-amber-100 bg-amber-50 p-6">
            <h4 className="mb-1 text-base font-semibold text-amber-900">Certificates expiring soon</h4>
            <p className="mb-4 text-xs text-amber-800">Active technicians, within 90 days or already expired.</p>
            {expiring.length === 0 ? (
              <p className="rounded-lg border border-amber-200 bg-white/60 p-3 text-sm text-amber-900">
                No certificates are due for renewal in the next 90 days.
              </p>
            ) : (
              <div className="space-y-2">
                {expiring.map((row) => (
                  <div key={`${row.technicianId}-${row.certificate}`} className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white/60 p-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-amber-900">{row.technicianName}</span>
                      <span className="block truncate text-xs text-amber-800">{row.certificate}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold text-white ${row.daysLeft < 0 ? 'bg-red-600' : 'bg-amber-500'}`}>
                      {row.daysLeft < 0 ? `${Math.abs(row.daysLeft)} d overdue` : `${row.daysLeft} d left`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <OccupationalAccidentSection isAdmin={true} />
    </div>
  );
};

export default ComplianceDashboard;
