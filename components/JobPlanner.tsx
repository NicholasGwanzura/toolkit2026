'use client';

import { useMemo, useState, type FormEvent } from 'react';
import {
    CalendarDays, ChevronRight, Clock3, MapPin,
    Plus, Search, ShieldAlert, ShieldCheck, Sparkles, User, X,
} from 'lucide-react';
import {
    JobType, JobTypeLabels, JobTypeDescriptions,
    type PlannerJob, type PlannerJobStatus,
    type PlannerSafetyChecklistItem, type RefrigerantSafetyClass,
    type Refrigerant,
} from '@/types/index';
import { DEFAULT_PLANNER_SAFETY_CHECKLIST } from '@/constants/job-planner';
import { useTechnicians, usePlannerJobs, createPlannerJob } from '@/lib/api';
import { useClientSession } from '@/lib/useClientSession';
import { findConflicts, isPastDate } from '@/lib/planner-conflicts';
import JobActions from '@/components/JobActions';
import { RefrigerantAutocomplete, refrigerantLabel } from '@/components/RefrigerantAutocomplete';

interface PlannerFormState {
    clientId: string; clientName: string; location: string;
    province: string; district: string;
    jobType: JobType; refrigerantClass: RefrigerantSafetyClass;
    refrigerant: Refrigerant | null; amount: number;
    scheduledDate: string; technicianId: string; technicianName: string;
    preJobChecklistComplete: boolean; notes: string; newSystem: boolean;
}

function slugify(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'client';
}

const REF_CLASSES: RefrigerantSafetyClass[] = ['A1', 'A2L', 'A3'];

function addDays(base: string, n: number) {
    const d = new Date(base); d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
}

function formatDate(s: string) {
    return new Intl.DateTimeFormat('en-ZW', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(s));
}

function formatDateShort(s: string) {
    return new Intl.DateTimeFormat('en-ZW', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(s));
}

const STATUS_STYLES: Record<PlannerJobStatus, string> = {
    scheduled:    'bg-blue-50 text-blue-700 border-blue-200',
    'in-progress':'bg-amber-50 text-amber-700 border-amber-200',
    completed:    'bg-emerald-50 text-emerald-700 border-emerald-200',
    'follow-up':  'bg-rose-50 text-rose-700 border-rose-200',
    cancelled:    'bg-gray-100 text-gray-500 border-gray-200',
};

const REF_STYLES: Partial<Record<RefrigerantSafetyClass, string>> = {
    A1:  'bg-slate-100 text-slate-600',
    A2L: 'bg-orange-100 text-orange-700',
    A3:  'bg-red-100 text-red-700',
};
function refStyle(c: RefrigerantSafetyClass) { return REF_STYLES[c] ?? 'bg-gray-100 text-gray-600'; }

export function isoDate(date: Date) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
}

function daysFromToday(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return isoDate(date);
}

export default function JobPlanner() {
    const session = useClientSession();
    const todayIso = isoDate(new Date());
    const { data: techniciansData } = useTechnicians();
    const technicians = techniciansData ?? [];
    const { data: jobsData, isLoading: jobsLoading } = usePlannerJobs();
    const jobs = jobsData ?? [];
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClient, setSelectedClient] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [startDate, setStartDate] = useState(() => daysFromToday(-30));
    const [endDate, setEndDate] = useState(() => daysFromToday(60));
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [notice, setNotice] = useState('');
    const [formData, setFormData] = useState<PlannerFormState>({
        clientId: '', clientName: '', location: '', province: '', district: '',
        jobType: 'COLD_ROOM', refrigerantClass: 'A1',
        refrigerant: null, amount: 0,
        scheduledDate: daysFromToday(0), technicianId: '',
        technicianName: '', preJobChecklistComplete: false, notes: '', newSystem: false,
    });

    const formNewJobConflicts = findConflicts(jobs, formData.technicianId || session?.id, formData.scheduledDate);
    const safetyRequired = formData.refrigerantClass === 'A2L' || formData.refrigerantClass === 'A3';

    const filteredJobs = useMemo(() => jobs.filter(job => {
        const q = searchTerm.toLowerCase();
        return (
            (!searchTerm || job.clientName.toLowerCase().includes(q) || job.location.toLowerCase().includes(q) || job.technicianName.toLowerCase().includes(q)) &&
            (!selectedClient || job.clientId === selectedClient) &&
            (!selectedStatus || job.status === selectedStatus) &&
            // Overdue work stays listed until it is finished, or it could never be completed.
            (job.scheduledDate >= startDate || job.status === 'scheduled' || job.status === 'in-progress' || job.status === 'follow-up') &&
            job.scheduledDate <= endDate
        );
    }), [jobs, searchTerm, selectedClient, selectedStatus, startDate, endDate]);

    const jobsByDate = useMemo(() => filteredJobs.reduce<Record<string, PlannerJob[]>>((acc, job) => {
        (acc[job.scheduledDate] = acc[job.scheduledDate] ?? []).push(job); return acc;
    }, {}), [filteredJobs]);

    const sortedDates = useMemo(() => Object.keys(jobsByDate).sort(), [jobsByDate]);

    const stats = [
        { label: 'Scheduled',   value: jobs.filter(j => j.status === 'scheduled').length,  icon: CalendarDays,  color: 'bg-indigo-50 text-indigo-600' },
        { label: 'In Progress', value: jobs.filter(j => j.status === 'in-progress').length,icon: Clock3,        color: 'bg-amber-50 text-amber-600' },
        { label: 'Follow-up',   value: jobs.filter(j => j.status === 'follow-up').length,  icon: ShieldAlert,   color: 'bg-rose-50 text-rose-600' },
    ];

    // Client filter options are derived from real jobs (not a fixed list) so the picker
    // reflects whatever clients actually exist in the DB, and grows as new ones are added.
    const knownClients = useMemo(() => {
        const map = new Map<string, string>();
        for (const job of jobs) map.set(job.clientId, job.clientName);
        return Array.from(map.entries());
    }, [jobs]);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (safetyRequired && !formData.preJobChecklistComplete) {
            setNotice('A2L and A3 jobs require the pre-job safety checklist before scheduling.');
            return;
        }
        if (!formData.clientName.trim() || !formData.location.trim() || !formData.province.trim()) {
            setNotice('Client name, location, and province are required.');
            return;
        }
        setSubmitting(true);
        try {
            const selectedTechnician = technicians.find(technician => technician.id === formData.technicianId || technician.name === formData.technicianName);
            const created = await createPlannerJob({
                clientId: slugify(formData.clientName),
                clientName: formData.clientName.trim(),
                location: formData.location.trim(),
                province: formData.province.trim(),
                district: formData.district.trim() || undefined,
                jobType: formData.jobType, refrigerantClass: formData.refrigerantClass,
                refrigerantId: formData.refrigerant?.id,
                refrigerantType: formData.refrigerant ? refrigerantLabel(formData.refrigerant) : undefined,
                amount: formData.amount > 0 ? formData.amount : undefined,
                status: 'scheduled', scheduledDate: formData.scheduledDate,
                newSystem: formData.newSystem,
                technicianId: selectedTechnician?.id,
                technicianName: selectedTechnician?.name,
                preJobChecklistComplete: formData.preJobChecklistComplete,
                checklistItems: DEFAULT_PLANNER_SAFETY_CHECKLIST.map((i): PlannerSafetyChecklistItem => ({ ...i, completed: formData.preJobChecklistComplete })),
                notes: formData.notes,
            });
            setShowModal(false);
            setNotice(`Job created for ${created.clientName} on ${formatDateShort(created.scheduledDate)}.`);
            setFormData(prev => ({ ...prev, jobType: 'COLD_ROOM', refrigerantClass: 'A1', refrigerant: null, scheduledDate: addDays(prev.scheduledDate, 1), preJobChecklistComplete: false, notes: '', newSystem: false }));
            setTimeout(() => setNotice(''), 4000);
        } catch (err) {
            setNotice(err instanceof Error ? err.message : 'Failed to create job.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Notice */}
            {notice && (
                <div className="flex items-center justify-between border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                    <span>{notice}</span>
                    <button onClick={() => setNotice('')}><X className="h-4 w-4" /></button>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                {stats.map(s => {
                    const Icon = s.icon;
                    return (
                        <div key={s.label} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-gray-500">{s.label}</p>
                                <span className={`rounded-lg p-2 ${s.color}`}><Icon className="h-4 w-4" /></span>
                            </div>
                            <p className="mt-3 text-3xl font-bold text-gray-900">{s.value}</p>
                        </div>
                    );
                })}
            </div>

            {/* Filter Bar */}
            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <div className="relative xl:col-span-2">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search client, location, or technician…"
                            className="rounded-lg w-full border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-300 focus:bg-white"
                        />
                    </div>
                    <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)}
                        className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-300 focus:bg-white">
                        <option value="">All clients</option>
                        {knownClients.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                    </select>
                    <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}
                        className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-300 focus:bg-white">
                        <option value="">All statuses</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="follow-up">Follow-up</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                    <button onClick={() => setShowModal(true)}
                        className="rounded-lg flex items-center justify-center gap-2 bg-[#B45309] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#92400E]">
                        <Plus className="h-4 w-4" /> New Job
                    </button>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">From</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-300 focus:bg-white" />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">To</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-300 focus:bg-white" />
                    </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                    {[
                        { label: 'Next 7 days', from: daysFromToday(0), to: daysFromToday(7) },
                        { label: 'Next 30 days', from: daysFromToday(0), to: daysFromToday(30) },
                        { label: 'Default window', from: daysFromToday(-30), to: daysFromToday(60) },
                        { label: 'All dates', from: '0000-01-01', to: '9999-12-31' },
                    ].map(range => (
                        <button key={range.label} type="button" onClick={() => { setStartDate(range.from); setEndDate(range.to); }}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                            {range.label}
                        </button>
                    ))}
                </div>
                <p className="mt-3 text-xs text-gray-400">{filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} across {sortedDates.length} date{sortedDates.length !== 1 ? 's' : ''}</p>
            </div>

            {/* Timeline */}
            <div className="space-y-6">
                {jobsLoading && (
                    <div className="rounded-lg border border-gray-200 bg-white p-10 text-center">
                        <p className="text-sm font-semibold text-gray-400">Loading jobs…</p>
                    </div>
                )}
                {!jobsLoading && sortedDates.length === 0 && (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-white p-10 text-center">
                        <CalendarDays className="mx-auto mb-3 h-8 w-8 text-gray-200" />
                        <p className="text-sm font-semibold text-gray-400">No jobs match the current filters</p>
                    </div>
                )}
                {sortedDates.map(date => (
                    <div key={date}>
                        {/* Date header */}
                        <div className="mb-3 flex items-center gap-3">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm">
                                <CalendarDays className="h-4 w-4 text-[#D97706]" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900">{formatDate(date)}</p>
                                <p className="text-xs text-gray-400">{jobsByDate[date].length} job{jobsByDate[date].length !== 1 ? 's' : ''} scheduled</p>
                            </div>
                            <div className="flex-1 border-t border-gray-100" />
                        </div>

                        {/* Job cards */}
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {jobsByDate[date].map(job => (
                                <div key={job.id} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:border-gray-300 hover:shadow-md transition-all">
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <div className="min-w-0">
                                            <p className="font-bold text-gray-900 truncate">{job.clientName}</p>
                                            <p className="flex items-center gap-1 mt-0.5 text-xs text-gray-500">
                                                <MapPin className="h-3 w-3 flex-shrink-0" />{job.location}
                                            </p>
                                        </div>
                                        <span className={`flex-shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STATUS_STYLES[job.status]}`}>
                                            {job.status.replace('-', ' ')}
                                        </span>
                                    </div>
                                    {job.newSystem && <p className="mb-3 text-xs font-semibold text-[#b45309]">New system</p>}

                                    <div className="grid grid-cols-3 gap-3 border-t border-gray-100 pt-3 text-xs">
                                        <div>
                                            <p className="font-semibold uppercase tracking-wide text-gray-400">Job Type</p>
                                            <p className="mt-1 font-medium text-gray-900">{JobTypeLabels[job.jobType]}</p>
                                        </div>
                                        <div>
                                            <p className="font-semibold uppercase tracking-wide text-gray-400">Ref. Class</p>
                                            <span className={`mt-1 inline-block rounded px-2 py-0.5 font-semibold ${refStyle(job.refrigerantClass)}`}>
                                                {job.refrigerantClass}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-semibold uppercase tracking-wide text-gray-400">{job.newSystem ? 'Gas / Charge' : 'Gas Used'}</p>
                                            <p className="mt-1 font-medium text-gray-900">{job.refrigerantType || '—'}{job.amount ? ` · ${job.amount} kg` : ''}</p>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 border-t border-gray-100 pt-3">
                                        <User className="h-3.5 w-3.5 flex-shrink-0" />
                                        <span className="truncate">{job.technicianName}</span>
                                    </div>

                                    {job.notes && (
                                        <p className="mt-2 text-xs text-gray-500 line-clamp-2">{job.notes}</p>
                                    )}

                                    {(job.refrigerantClass === 'A2L' || job.refrigerantClass === 'A3') && (
                                        <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                            <ShieldAlert className="h-3.5 w-3.5 flex-shrink-0" />
                                            Safety checklist required
                                        </div>
                                    )}

                                    <JobActions job={job} allJobs={jobs} technicians={session?.role === 'org_admin' ? technicians : undefined} today={todayIso} />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8 backdrop-blur-sm">
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-gray-200 bg-white rounded-xl shadow-2xl">
                        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Schedule New Job</h2>
                                <p className="text-sm text-gray-500">Add a job to the shared planner</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">Client Name</label>
                                    <input required value={formData.clientName} onChange={e => setFormData(p => ({ ...p, clientName: e.target.value }))}
                                        placeholder="e.g. Meikles Hotel"
                                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-300 focus:bg-white" />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">Location</label>
                                    <input required value={formData.location} onChange={e => setFormData(p => ({ ...p, location: e.target.value }))}
                                        placeholder="Street address"
                                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-300 focus:bg-white" />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">Province</label>
                                    <input required value={formData.province} onChange={e => setFormData(p => ({ ...p, province: e.target.value }))}
                                        placeholder="e.g. Harare"
                                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-300 focus:bg-white" />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">District (optional)</label>
                                    <input value={formData.district} onChange={e => setFormData(p => ({ ...p, district: e.target.value }))}
                                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-300 focus:bg-white" />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">Job Type</label>
                                    <select value={formData.jobType} onChange={e => setFormData(p => ({ ...p, jobType: e.target.value as JobType }))}
                                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-300 focus:bg-white">
                                        {Object.keys(JobTypeLabels).map(t => <option key={t} value={t}>{JobTypeLabels[t as JobType]}</option>)}
                                    </select>
                                    <p className="mt-1 text-xs text-gray-400">{JobTypeDescriptions[formData.jobType]}</p>
                                </div>
                                <label className="md:col-span-2 flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                                    <input type="checkbox" checked={formData.newSystem} onChange={e => setFormData(p => ({ ...p, newSystem: e.target.checked }))} className="mt-0.5 h-4 w-4 accent-[#D97706]" />
                                    <span>
                                        <span className="block font-semibold">This is a new system</span>
                                        <span className="block text-xs text-gray-500">The gas used and charge in kg must be recorded to complete the job.</span>
                                    </span>
                                </label>
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">Refrigerant Class</label>
                                    <select value={formData.refrigerantClass}
                                        onChange={e => setFormData(p => ({ ...p, refrigerantClass: e.target.value as RefrigerantSafetyClass, preJobChecklistComplete: e.target.value === 'A1' ? p.preJobChecklistComplete : false }))}
                                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-300 focus:bg-white">
                                        {REF_CLASSES.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">Refrigerant (Gas)</label>
                                    <RefrigerantAutocomplete
                                        value={formData.refrigerant}
                                        onSelect={(r) => setFormData(p => ({ ...p, refrigerant: r }))}
                                        placeholder="Search gas — e.g. R290, R-32…"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">Estimated Amount (kg)</label>
                                    <input type="number" min="0" step="0.1" value={formData.amount || ''}
                                        onChange={e => setFormData(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                                        placeholder="e.g. 12.5"
                                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-300 focus:bg-white" />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">Scheduled Date</label>
                                    <input type="date" value={formData.scheduledDate} onChange={e => setFormData(p => ({ ...p, scheduledDate: e.target.value }))}
                                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-300 focus:bg-white" />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">Technician</label>
                                    <select value={formData.technicianId} onChange={e => {
                                        const technician = technicians.find(t => t.id === e.target.value);
                                        setFormData(p => ({ ...p, technicianId: e.target.value, technicianName: technician?.name ?? '' }));
                                    }}
                                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-300 focus:bg-white">
                                        <option value="">Assign to me</option>
                                        {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                {(isPastDate(formData.scheduledDate, todayIso) || formNewJobConflicts.length > 0) && (
                                    <div className="md:col-span-2 space-y-1 border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                        {isPastDate(formData.scheduledDate, todayIso) && <p>This date is in the past.</p>}
                                        {formNewJobConflicts.length > 0 && <p>Already booked that day: {formNewJobConflicts.map(c => c.clientName).join(', ')}.</p>}
                                    </div>
                                )}
                            </div>

                            {safetyRequired && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                                    <div className="flex items-start gap-3">
                                        <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-700" />
                                        <div className="space-y-3">
                                            <div>
                                                <p className="text-sm font-bold text-amber-900">Mandatory Safety Checklist</p>
                                                <p className="text-xs text-amber-800">A2L and A3 jobs require PPE, ventilation, and leak-response sign-off before scheduling.</p>
                                            </div>
                                            <label className="flex items-center gap-3 text-sm font-medium text-amber-900">
                                                <input type="checkbox" checked={formData.preJobChecklistComplete}
                                                    onChange={e => setFormData(p => ({ ...p, preJobChecklistComplete: e.target.checked }))}
                                                    className="h-4 w-4 border-amber-300 text-amber-600" />
                                                PPE, ventilation, and gas detection confirmed
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Notes</label>
                                <textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                                    rows={3} placeholder="Scope, parts required, or follow-up notes…"
                                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-300 focus:bg-white" />
                            </div>

                            {safetyRequired && !formData.preJobChecklistComplete && (
                                <p className="border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    Safety checklist must be completed before saving this job.
                                </p>
                            )}

                            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting || (safetyRequired && !formData.preJobChecklistComplete)}
                                    className="inline-flex items-center justify-center gap-2 bg-[#B45309] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#92400E] disabled:cursor-not-allowed disabled:opacity-50 transition-colors">
                                    <Sparkles className="h-4 w-4" /> {submitting ? 'Saving…' : 'Save Job'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
