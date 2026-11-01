'use client';

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    BellRing,
    CalendarRange,
    ClipboardList,
    FileText,
    MapPin,
    ShieldCheck,
    Wrench,
} from 'lucide-react';
import { useClientSession } from '@/lib/useClientSession';
import { useEquipmentRecords, useGasLogs, useInstallations, usePlannerJobs } from '@/lib/api';
import FieldScheduling from '@/components/FieldScheduling';
import JobActions from '@/components/JobActions';
import JobPlanner, { isoDate } from '@/components/JobPlanner';
import { JobTypeLabels, type Installation, type PlannerJob, type RefrigerantLog } from '@/types/index';
import { cn } from '@/lib/utils';

type FieldOpsTab = 'schedule' | 'planner' | 'logs';

const TAB_CONFIG: Array<{
    id: FieldOpsTab;
    label: string;
    description: string;
    icon: typeof BellRing;
}> = [
    {
        id: 'schedule',
        label: 'Schedule',
        description: 'Predictive equipment alerts and service scheduling.',
        icon: BellRing,
    },
    {
        id: 'planner',
        label: 'Planner',
        description: 'Calendar, safety checklist, and site-visit planning.',
        icon: CalendarRange,
    },
    {
        id: 'logs',
        label: 'Jobs & Logs',
        description: 'Start and complete jobs, plus installations and refrigerant records.',
        icon: ClipboardList,
    },
];

const EMPTY_INSTALLATIONS: Installation[] = [];
const EMPTY_LOGS: RefrigerantLog[] = [];

function getTab(value: string | null): FieldOpsTab {
    return value === 'planner' || value === 'logs' ? value : 'schedule';
}

function StatusPill({ status }: { status: string }) {
    const className = (() => {
        switch (status) {
            case 'completed':
            case 'approved':
            case 'Charge':
                return 'border-emerald-200 bg-emerald-50 text-emerald-700';
            case 'in-progress':
            case 'pending':
            case 'pending-review':
            case 'Recovery':
                return 'border-blue-200 bg-blue-50 text-blue-700';
            case 'scheduled':
            case 'submitted':
                return 'border-slate-200 bg-slate-50 text-slate-700';
            case 'rejected':
            case 'cancelled':
            case 'Leak Repair':
                return 'border-rose-200 bg-rose-50 text-rose-700';
            default:
                return 'border-amber-200 bg-amber-50 text-amber-700';
        }
    })();

    return (
        <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide', className)}>
            {status}
        </span>
    );
}

function JobsAndLogsPanel() {
    const router = useRouter();
    const session = useClientSession();
    const { data: plannerJobs = [] } = usePlannerJobs();
    const { data: installationsData } = useInstallations();
    const { data: gasLogsData } = useGasLogs(undefined, undefined, 200);

    const isAdmin = session?.role === 'org_admin';
    // Match on the user id, never the display name: two technicians can share a name.
    const installations = useMemo(
        () => (installationsData ?? EMPTY_INSTALLATIONS).filter(item => isAdmin || !session || item.technicianId === session.id),
        [installationsData, isAdmin, session],
    );
    const logs = useMemo(
        () => ((gasLogsData ?? EMPTY_LOGS) as RefrigerantLog[]).filter(log => isAdmin || !session || log.technicianId === session.id),
        [gasLogsData, isAdmin, session],
    );

    const visibleJobs = useMemo(
        () => isAdmin || !session ? plannerJobs : plannerJobs.filter(job => job.technicianId === session.id),
        [isAdmin, plannerJobs, session],
    );

    const records = useMemo(() => {
        const jobRecords = visibleJobs.map(job => ({
            id: job.id,
            type: 'Job',
            clientName: job.clientName,
            location: job.location,
            date: job.scheduledDate,
            status: job.status,
            technicianName: job.technicianName,
            detail: [
                JobTypeLabels[job.jobType] ?? job.jobType,
                job.newSystem ? 'New system' : '',
                job.refrigerantType ? `${job.refrigerantType}${job.amount ? ` · ${job.amount} kg` : ''}` : '',
            ].filter(Boolean).join(' · '),
            job,
        }));

        const installationRecords = installations
            .map(installation => ({
                id: installation.id,
                type: 'Installation',
                clientName: installation.clientName,
                location: installation.location || 'No site recorded',
                date: installation.installationDate,
                status: installation.status,
                technicianName: installation.technicianName,
                detail: installation.jobDetails,
                job: null as PlannerJob | null,
            }));

        const gasLogRecords = logs
            .map(log => ({
                id: log.id,
                type: 'Refrigerant log',
                clientName: log.clientName,
                location: log.location,
                date: log.timestamp.slice(0, 10),
                status: log.actionType,
                technicianName: log.technicianName,
                detail: `${log.refrigerantType} · ${log.amount} kg · ${log.supplierVerified ? 'Verified supplier' : 'Unverified supplier'}`,
                job: null as PlannerJob | null,
            }));

        return [...jobRecords, ...installationRecords, ...gasLogRecords].sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
    }, [installations, logs, visibleJobs]);

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                <SummaryCard label="Planner jobs" value={visibleJobs.length} />
                <SummaryCard label="Installations" value={installations.length} />
                <SummaryCard label="Refrigerant logs" value={logs.length} />
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-5 py-4">
                    <h2 className="text-lg font-bold text-gray-900">Jobs & Logs</h2>
                    <p className="text-sm text-gray-500">
                        One register for scheduled jobs, installations, charge/recovery logs, and completed-work follow-up.
                    </p>
                </div>

                <div className="divide-y divide-gray-100">
                    {records.length === 0 ? (
                        <div className="px-6 py-12 text-center">
                            <ClipboardList className="mx-auto h-10 w-10 text-gray-300" />
                            <p className="mt-3 text-sm text-gray-500">No jobs or field records yet.</p>
                        </div>
                    ) : (
                        records.map(record => (
                            <div key={`${record.type}-${record.id}`} className="grid gap-4 px-5 py-4 text-sm lg:grid-cols-[0.8fr_1.2fr_1fr_1fr_1.2fr_auto] lg:items-center">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Type</p>
                                    <p className="mt-1 font-semibold text-gray-900">{record.type}</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">{record.clientName}</p>
                                    <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                                        <MapPin className="h-3 w-3" />
                                        {record.location}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Technician</p>
                                    <p className="mt-1 text-gray-700">{record.technicianName}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Date</p>
                                    <p className="mt-1 text-gray-700">{record.date}</p>
                                </div>
                                <div className="space-y-2">
                                    <StatusPill status={record.status} />
                                    <p className="text-xs text-gray-500">{record.detail}</p>
                                </div>
                                {record.job && record.job.status !== 'completed' && (
                                    <div className="lg:col-span-full">
                                        <JobActions job={record.job} allJobs={plannerJobs} today={isoDate(new Date())} />
                                    </div>
                                )}
                                {record.job?.status === 'completed' && (
                                    <button
                                        type="button"
                                        onClick={() => router.push(`/jobs/request-coc?jobId=${record.job?.id}`)}
                                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                                    >
                                        <FileText className="h-3.5 w-3.5" />
                                        Request COC
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function SummaryCard({ label, value, onClick }: { label: string; value: number; onClick?: () => void }) {
    const content = (
        <>
            <p className="text-sm font-semibold text-gray-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        </>
    );
    if (!onClick) return <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">{content}</div>;
    return (
        <button type="button" onClick={onClick} className="rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-400">
            {content}
        </button>
    );
}

export default function FieldOperations() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const session = useClientSession();
    const activeTab = getTab(searchParams.get('tab'));
    const { data: equipment = [] } = useEquipmentRecords();
    const { data: jobs = [] } = usePlannerJobs();
    const openJobs = jobs.filter(job => job.status !== 'completed' && job.status !== 'cancelled').length;

    if (!session || !['technician', 'contractor', 'org_admin'].includes(session.role)) {
        return (
            <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="bg-red-50 p-3 text-red-600">
                        <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold text-gray-900">Field Operations Access Required</h1>
                        <p className="text-sm text-gray-600">
                            This workspace is available to technicians and organisation admins only.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-3xl space-y-2">
                        <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-700">
                            <Wrench className="h-3.5 w-3.5" />
                            Unified tool
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900">Field Operations</h1>
                        <p className="text-sm leading-6 text-gray-600">
                            Schedule service from equipment alerts, plan field jobs, and review jobs/logs from one workspace.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <SummaryCard label="Equipment" value={equipment.length} onClick={() => router.push('/field-operations?tab=schedule')} />
                        <SummaryCard label="Jobs" value={jobs.length} onClick={() => router.push('/field-operations?tab=logs')} />
                        <SummaryCard label="Open work" value={openJobs} onClick={() => router.push('/field-operations?tab=planner')} />
                    </div>
                </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
                {TAB_CONFIG.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => router.push(`/field-operations?tab=${tab.id}`)}
                            className={cn(
                                'rounded-xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-orange-400',
                                isActive
                                    ? 'border-orange-200 bg-orange-50 shadow-sm'
                                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <span className={cn('rounded-lg p-2', isActive ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500')}>
                                    <Icon className="h-4 w-4" />
                                </span>
                                <span className="font-bold text-gray-900">{tab.label}</span>
                            </div>
                            <p className="mt-3 text-sm leading-5 text-gray-600">{tab.description}</p>
                        </button>
                    );
                })}
            </div>

            {activeTab === 'schedule' && openJobs > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-5 py-4">
                    <p className="text-sm font-semibold text-blue-900">
                        You have {openJobs} open {openJobs === 1 ? 'job' : 'jobs'} to start or complete.
                    </p>
                    <button
                        type="button"
                        onClick={() => router.push('/field-operations?tab=planner')}
                        className="min-h-11 rounded-lg bg-[#B45309] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#92400E]"
                    >
                        Go to my jobs
                    </button>
                </div>
            )}

            {activeTab === 'schedule' && <FieldScheduling />}
            {activeTab === 'planner' && <JobPlanner />}
            {activeTab === 'logs' && <JobsAndLogsPanel />}
        </div>
    );
}
