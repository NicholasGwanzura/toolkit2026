'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
    useStudentApplications,
    useTechnicianApplications,
    useCourses,
    useSupplierApplications,
    useReorders,
    useRegistrationApplications,
    useReportingSummary,
} from '@/lib/api';
import type { Pipeline, ReportRange } from '@/lib/reporting-summary';
// NOTE: Multiple admin pages (Dashboard, Reporting, NOU Dashboard) independently fetch
// the same underlying datasets via SWR. SWR deduplicates requests with the same key,
// so this is a maintenance/perf smell rather than a functional issue.
import OccupationalAccidentSection from '@/components/OccupationalAccidentSection';
import type { SupplierReorder } from '@/lib/platformStore';
import type { StudentApplication, TechnicianApplication, SupplierRegistration, RegistrationApplication } from '@/types/index';
import type { ManagedCourse } from '@/lib/platformStore';
import {
    Download,
    GraduationCap,
    Wrench,
    Building2,
    BookOpen,
    CheckCircle2,
    XCircle,
    UserPlus,
    FileText,
    ShoppingCart,
    Activity,
    ChevronRight,
    Eye,
} from 'lucide-react';
import Link from 'next/link';
import { rangeStart } from '@/lib/reporting-summary';

// ---------------------------------------------------------------------------
// Types for the activity timeline
// ---------------------------------------------------------------------------

type ActivityType =
    | 'student_submitted'
    | 'student_approved'
    | 'student_rejected'
    | 'technician_submitted'
    | 'technician_approved'
    | 'technician_rejected'
    | 'course_submitted'
    | 'course_approved'
    | 'course_rejected'
    | 'supplier_submitted'
    | 'supplier_approved'
    | 'supplier_rejected'
    | 'reorder_submitted'
    | 'reorder_approved'
    | 'reorder_rejected'
    | 'role_submitted'
    | 'role_approved'
    | 'role_rejected';

interface ActivityEntry {
    id: string;
    timestamp: string;
    type: ActivityType;
    label: string;
    description: string;
    actor?: string;
    href?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ACTIVITY_META: Record<ActivityType, { color: string; bg: string; icon: typeof Activity }> = {
    student_submitted:   { color: 'text-emerald-600', bg: 'bg-emerald-50', icon: UserPlus },
    student_approved:    { color: 'text-green-600',   bg: 'bg-green-50',   icon: CheckCircle2 },
    student_rejected:    { color: 'text-red-600',     bg: 'bg-red-50',     icon: XCircle },
    technician_submitted:{ color: 'text-blue-600',    bg: 'bg-blue-50',    icon: UserPlus },
    technician_approved: { color: 'text-green-600',   bg: 'bg-green-50',   icon: CheckCircle2 },
    technician_rejected: { color: 'text-red-600',     bg: 'bg-red-50',     icon: XCircle },
    course_submitted:    { color: 'text-purple-600',  bg: 'bg-purple-50',  icon: FileText },
    course_approved:     { color: 'text-green-600',   bg: 'bg-green-50',   icon: CheckCircle2 },
    course_rejected:     { color: 'text-red-600',     bg: 'bg-red-50',     icon: XCircle },
    supplier_submitted:  { color: 'text-amber-600',   bg: 'bg-amber-50',   icon: Building2 },
    supplier_approved:   { color: 'text-green-600',   bg: 'bg-green-50',   icon: CheckCircle2 },
    supplier_rejected:   { color: 'text-red-600',     bg: 'bg-red-50',     icon: XCircle },
    reorder_submitted:   { color: 'text-cyan-600',    bg: 'bg-cyan-50',    icon: ShoppingCart },
    reorder_approved:    { color: 'text-green-600',   bg: 'bg-green-50',   icon: CheckCircle2 },
    reorder_rejected:    { color: 'text-red-600',     bg: 'bg-red-50',     icon: XCircle },
    role_submitted:      { color: 'text-indigo-600',  bg: 'bg-indigo-50',  icon: UserPlus },
    role_approved:       { color: 'text-green-600',   bg: 'bg-green-50',   icon: CheckCircle2 },
    role_rejected:       { color: 'text-red-600',     bg: 'bg-red-50',     icon: XCircle },
};

function buildStudentActivity(items: StudentApplication[] | undefined): ActivityEntry[] {
    if (!items) return [];
    return items.map(s => ({
        id: `student-${s.id}`,
        timestamp: s.submittedAt,
        type: (s.status === 'approved' ? 'student_approved'
            : s.status === 'rejected' ? 'student_rejected'
            : 'student_submitted') as ActivityType,
        label: s.status === 'submitted' || s.status === 'under-review'
            ? `${s.firstName} ${s.lastName} applied`
            : s.status === 'approved'
                ? `${s.firstName} ${s.lastName} enrolled`
                : `${s.firstName} ${s.lastName} rejected`,
        description: `${s.fieldOfStudy} · ${s.polytech}`,
        actor: `${s.firstName} ${s.lastName}`,
        href: '/admin/students',
    }));
}

function buildTechnicianActivity(items: TechnicianApplication[] | undefined): ActivityEntry[] {
    if (!items) return [];
    return items.map(t => ({
        id: `tech-app-${t.id}`,
        timestamp: t.submittedAt,
        type: (t.status === 'approved' ? 'technician_approved'
            : t.status === 'rejected' ? 'technician_rejected'
            : 'technician_submitted') as ActivityType,
        label: t.status === 'submitted' || t.status === 'under-review'
            ? `${t.name} applied as technician`
            : t.status === 'approved'
                ? `${t.name} approved as technician`
                : `${t.name} application rejected`,
        description: `${t.specialization} · ${t.province} · ${t.yearsExperience}yrs exp`,
        actor: t.name,
        href: '/technician-registry',
    }));
}

function buildRegistrationActivity(items: RegistrationApplication[] | undefined): ActivityEntry[] {
    if (!items) return [];
    return items.map(a => ({
        id: `registration-${a.id}`,
        timestamp: a.submittedAt,
        type: (a.status === 'approved' ? 'role_approved'
            : a.status === 'rejected' ? 'role_rejected'
            : 'role_submitted') as ActivityType,
        label: a.status === 'approved'
            ? `${a.firstName} ${a.lastName} approved as ${a.role}`
            : a.status === 'rejected'
                ? `${a.firstName} ${a.lastName} rejected as ${a.role}`
                : `${a.firstName} ${a.lastName} applied as ${a.role}`,
        description: `${a.region}${a.organisation ? ` · ${a.organisation}` : ''}`,
        actor: `${a.firstName} ${a.lastName}`,
        href: '/admin/applications',
    }));
}

function buildCourseActivity(items: ManagedCourse[] | undefined): ActivityEntry[] {
    if (!items) return [];
    return items.map(c => ({
        id: `course-${c.id}`,
        timestamp: c.createdAt,
        type: (c.status === 'approved' ? 'course_approved'
            : c.status === 'rejected' ? 'course_rejected'
            : 'course_submitted') as ActivityType,
        label: c.status === 'draft' ? `Course drafted: ${c.title}`
            : c.status === 'pending_nou' ? `Course submitted: ${c.title}`
            : c.status === 'approved' ? `Course approved: ${c.title}`
            : `Course rejected: ${c.title}`,
        description: `${c.modules.length} modules · by ${c.lecturerName}`,
        actor: c.lecturerName,
        href: '/learn/approvals',
    }));
}

function buildSupplierActivity(items: SupplierRegistration[] | undefined): ActivityEntry[] {
    if (!items) return [];
    return items.map(s => ({
        id: `supplier-${s.id}`,
        timestamp: s.submittedAt,
        type: (s.status === 'approved' ? 'supplier_approved'
            : s.status === 'rejected' ? 'supplier_rejected'
            : 'supplier_submitted') as ActivityType,
        label: s.status === 'submitted' || s.status === 'under-review'
            ? `Supplier application: ${s.companyName}`
            : s.status === 'approved'
                ? `Supplier approved: ${s.companyName}`
                : `Supplier rejected: ${s.companyName}`,
        description: `${s.supplierType.replace('-', ' ')} · ${s.province}`,
        actor: s.companyName,
        href: '/admin/applications',
    }));
}

function buildReorderActivity(items: SupplierReorder[] | undefined): ActivityEntry[] {
    if (!items) return [];
    return items.map(r => ({
        id: `reorder-${r.id}`,
        timestamp: r.createdAt,
        type: (r.status === 'approved' ? 'reorder_approved'
            : r.status === 'rejected' ? 'reorder_rejected'
            : 'reorder_submitted') as ActivityType,
        label: r.status === 'pending_hevacraz' || r.status === 'pending_nou'
            ? `Refrigerant reorder: ${r.gasType}`
            : r.status === 'approved'
                ? `Reorder approved: ${r.gasType}`
                : `Reorder rejected: ${r.gasType}`,
        description: `${r.quantityKg}kg · ${r.vendorName} · ${r.purpose}`,
        actor: r.vendorName,
        href: '/suppliers/reorder',
    }));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReportingPage() {
    const { user, isLoading: authLoading } = useAuth();
    const { data: students } = useStudentApplications();
    const { data: technicianApps } = useTechnicianApplications();
    const { data: registrationApps } = useRegistrationApplications();
    const { data: courses } = useCourses();
    const { data: suppliers } = useSupplierApplications();
    const { data: reorders } = useReorders();

    const [dateFilter, setDateFilter] = useState<ReportRange>('all');
    const [nowRef] = useState(() => Date.now());
    const { data: summary, error: summaryError, mutate: reloadSummary } = useReportingSummary(dateFilter);

    const reports = useMemo(() => {
        const zero: Pipeline = { total: 0, approved: 0, pending: 0, rejected: 0 };
        const t = summary?.technicianApplications ?? zero;
        return {
            students: summary?.students ?? zero,
            technicians: { totalApps: t.total, approved: t.approved, pending: t.pending, rejected: t.rejected, registered: summary?.registry.registered ?? 0, active: summary?.registry.active ?? 0 },
            otherRoles: summary?.otherRoles ?? { ...zero, byRole: {} },
            courses: summary?.courses ?? zero,
            suppliers: summary?.suppliers ?? zero,
            reorders: { total: summary?.reorders.total ?? 0, pending: summary?.reorders.pending ?? 0 },
        };
    }, [summary]);

    // Build the merged activity timeline
    const activityTimeline = useMemo(() => {
        const all: ActivityEntry[] = [
            ...buildStudentActivity(students),
            ...buildTechnicianActivity(technicianApps),
            ...buildCourseActivity(courses),
            ...buildSupplierActivity(suppliers),
            ...buildReorderActivity(reorders),
            ...buildRegistrationActivity(registrationApps),
        ];

        // Sort newest first
        all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Apply date filter
        const start = rangeStart(dateFilter, new Date(nowRef));
        const inRange = start ? all.filter(e => new Date(e.timestamp).getTime() >= start.getTime()) : all;
        return inRange.slice(0, 200); // Limit display
    }, [students, technicianApps, courses, suppliers, reorders, registrationApps, dateFilter, nowRef]);

    const exportCSV = () => {
        if (!summary) return;
        const rangeLabel = dateFilter === 'all' ? 'All time' : dateFilter === 'today' ? 'Last 24 hours' : dateFilter === 'week' ? 'Last 7 days' : 'Last 30 days';
        const rows: (string | number)[][] = [
            ['Category', 'Metric', 'Value'],
            ['Report', 'Period', rangeLabel],
            ['Students', 'Total Applications', reports.students.total],
            ['Students', 'Approved', reports.students.approved],
            ['Students', 'Pending Review', reports.students.pending],
            ['Students', 'Rejected', reports.students.rejected],
            ['Technicians', 'Total Applications', reports.technicians.totalApps],
            ['Technicians', 'Approved', reports.technicians.approved],
            ['Technicians', 'Pending', reports.technicians.pending],
            ['Technicians', 'Rejected', reports.technicians.rejected],
            ['Technicians', 'Registered (whole registry)', reports.technicians.registered],
            ['Technicians', 'Active (whole registry)', reports.technicians.active],
            ['Trainers, lecturers and contractors', 'Total Applications', reports.otherRoles.total],
            ['Trainers, lecturers and contractors', 'Approved', reports.otherRoles.approved],
            ['Trainers, lecturers and contractors', 'Pending', reports.otherRoles.pending],
            ['Trainers, lecturers and contractors', 'Rejected', reports.otherRoles.rejected],
            ...Object.entries(reports.otherRoles.byRole).flatMap(([role, p]) => [
                [`Applications: ${role}`, 'Total', p.total],
                [`Applications: ${role}`, 'Approved', p.approved],
            ]),
            ['Courses', 'Total', reports.courses.total],
            ['Courses', 'Approved', reports.courses.approved],
            ['Courses', 'Pending / Draft', reports.courses.pending],
            ['Courses', 'Rejected', reports.courses.rejected],
            ['Suppliers', 'Total Applications', reports.suppliers.total],
            ['Suppliers', 'Approved', reports.suppliers.approved],
            ['Suppliers', 'Pending', reports.suppliers.pending],
            ['Suppliers', 'Rejected', reports.suppliers.rejected],
            ['Reorders', 'Total', reports.reorders.total],
            ['Reorders', 'Pending Review', reports.reorders.pending],
            ['Accidents', 'Logged', '(see accidents section on the page)'],
        ];

        const cell = (value: string | number) => {
            const text = String(value);
            return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        };
        const csv = rows.map(r => r.map(cell).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hevacraz-report-${dateFilter}-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (authLoading) {
        return <div className="p-8 text-sm text-slate-500">Loading…</div>;
    }

    if (!user || user.role !== 'org_admin') {
        return (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
                Access restricted to org admins only.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reporting Panel</h1>
                    <p className="mt-1 text-gray-500">
                        Comprehensive activity reports across all HEVACRAZ operations.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="rounded-lg flex items-center border border-gray-200 bg-white divide-x divide-gray-200">
                        {(['all', 'today', 'week', 'month'] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setDateFilter(range)}
                                className={`px-3 py-2 text-sm font-medium transition-colors ${
                                    dateFilter === range
                                        ? 'bg-gray-900 text-white'
                                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                            >
                                {range === 'all' ? 'All Time' : range.charAt(0).toUpperCase() + range.slice(1)}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={exportCSV}
                        disabled={!summary}
                        className="inline-flex items-center gap-2 bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </button>
                </div>
            </div>

            <p className="-mt-4 text-xs text-gray-500">
                The period applies to the summary cards, the pipelines, the CSV export and the timeline. Registry totals always cover the whole registry.
            </p>

            {!summary ? (
                summaryError ? (
                    <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                        <span>The report totals could not be loaded, so no figures are shown. Zero would be misleading.</span>
                        <button type="button" onClick={() => reloadSummary()} className="border border-rose-300 bg-white px-3 py-1.5 font-semibold hover:bg-rose-100">Try again</button>
                    </div>
                ) : (
                    <p className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">Loading report totals…</p>
                )
            ) : (<>
            {/* ── Summary Cards ── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <ReportCard
                    icon={GraduationCap}
                    label="Students"
                    value={reports.students.total}
                    sub={`${reports.students.approved} approved · ${reports.students.pending} pending`}
                    color="text-emerald-600 bg-emerald-50"
                />
                <ReportCard
                    icon={Wrench}
                    label="Technicians"
                    value={reports.technicians.registered}
                    sub={`${reports.technicians.active} active · ${reports.technicians.totalApps} applications`}
                    color="text-blue-600 bg-blue-50"
                />
                <ReportCard
                    icon={UserPlus}
                    label="Trainers, lecturers, contractors"
                    value={reports.otherRoles.total}
                    sub={`${reports.otherRoles.approved} approved · ${reports.otherRoles.pending} pending`}
                    color="text-indigo-600 bg-indigo-50"
                />
                <ReportCard
                    icon={BookOpen}
                    label="Courses"
                    value={reports.courses.total}
                    sub={`${reports.courses.approved} approved · ${reports.courses.pending} pending`}
                    color="text-purple-600 bg-purple-50"
                />
                <ReportCard
                    icon={Building2}
                    label="Suppliers"
                    value={reports.suppliers.total}
                    sub={`${reports.suppliers.approved} approved · ${reports.suppliers.pending} pending`}
                    color="text-amber-600 bg-amber-50"
                />
                <ReportCard
                    icon={ShoppingCart}
                    label="Reorders"
                    value={reports.reorders.total}
                    sub={`${reports.reorders.pending} awaiting review`}
                    color="text-cyan-600 bg-cyan-50"
                />
            </div>

            {/* ── Detailed Bar Chart Sections ── */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Student Pipeline */}
                <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-50">
                                <GraduationCap className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">Student Pipeline</h3>
                                <p className="text-xs text-gray-500">Applications &amp; enrolment</p>
                            </div>
                        </div>
                        <Link href="/admin/students" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                            View <ChevronRight className="h-3 w-3" />
                        </Link>
                    </div>
                    <div className="space-y-3">
                        <BarRow label="Total Applications" value={reports.students.total} max={Math.max(reports.students.total, 1)} color="bg-emerald-500" />
                        <BarRow label="Approved" value={reports.students.approved} max={Math.max(reports.students.total, 1)} color="bg-green-500" />
                        <BarRow label="Pending Review" value={reports.students.pending} max={Math.max(reports.students.total, 1)} color="bg-amber-500" />
                        <BarRow label="Rejected" value={reports.students.rejected} max={Math.max(reports.students.total, 1)} color="bg-red-400" />
                    </div>
                </section>

                {/* Technician Pipeline */}
                <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50">
                                <Wrench className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">Technician Pipeline</h3>
                                <p className="text-xs text-gray-500">Registration funnel</p>
                            </div>
                        </div>
                        <Link href="/technician-registry" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700">
                            View <ChevronRight className="h-3 w-3" />
                        </Link>
                    </div>
                    <div className="space-y-3">
                        <BarRow label="Applications" value={reports.technicians.totalApps} max={Math.max(reports.technicians.totalApps, 1)} color="bg-blue-500" />
                        <BarRow label="Approved" value={reports.technicians.approved} max={Math.max(reports.technicians.totalApps, 1)} color="bg-green-500" />
                        <BarRow label="In Registry" value={reports.technicians.registered} max={Math.max(reports.technicians.registered, 1)} color="bg-indigo-500" />
                        <BarRow label="Active" value={reports.technicians.active} max={Math.max(reports.technicians.registered, 1)} color="bg-emerald-500" />
                    </div>
                </section>

                {/* Course Pipeline */}
                <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-50">
                                <BookOpen className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">Course Pipeline</h3>
                                <p className="text-xs text-gray-500">Content development</p>
                            </div>
                        </div>
                        <Link href="/learn/approvals" className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700">
                            View <ChevronRight className="h-3 w-3" />
                        </Link>
                    </div>
                    <div className="space-y-3">
                        <BarRow label="Total Courses" value={reports.courses.total} max={Math.max(reports.courses.total, 1)} color="bg-purple-500" />
                        <BarRow label="Approved" value={reports.courses.approved} max={Math.max(reports.courses.total, 1)} color="bg-green-500" />
                        <BarRow label="Pending / Draft" value={reports.courses.pending} max={Math.max(reports.courses.total, 1)} color="bg-amber-500" />
                        <BarRow label="Rejected" value={reports.courses.rejected} max={Math.max(reports.courses.total, 1)} color="bg-red-400" />
                    </div>
                </section>
            </div>

            {/* ── Second row: Supplier + Reorder + Accident mini-cards ── */}
            <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-50">
                                <Building2 className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">Supplier Network</h3>
                                <p className="text-xs text-gray-500">Onboarding</p>
                            </div>
                        </div>
                        <Link href="/suppliers/approvals" className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700">
                            View <ChevronRight className="h-3 w-3" />
                        </Link>
                    </div>
                    <div className="space-y-3">
                        <BarRow label="Applications" value={reports.suppliers.total} max={Math.max(reports.suppliers.total, 1)} color="bg-amber-500" />
                        <BarRow label="Approved" value={reports.suppliers.approved} max={Math.max(reports.suppliers.total, 1)} color="bg-green-500" />
                        <BarRow label="Pending" value={reports.suppliers.pending} max={Math.max(reports.suppliers.total, 1)} color="bg-gray-400" />
                    </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-cyan-50">
                                <ShoppingCart className="h-5 w-5 text-cyan-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">Refrigerant Reorders</h3>
                                <p className="text-xs text-gray-500">Supply requests</p>
                            </div>
                        </div>
                        <Link href="/suppliers/reorder" className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 hover:text-cyan-700">
                            View <ChevronRight className="h-3 w-3" />
                        </Link>
                    </div>
                    <div className="space-y-3">
                        <BarRow label="Total Reorders" value={reports.reorders.total} max={Math.max(reports.reorders.total, 1)} color="bg-cyan-500" />
                        <BarRow label="Pending Review" value={reports.reorders.pending} max={Math.max(reports.reorders.total, 1)} color="bg-amber-500" />
                    </div>
                </div>
            </div>

            </>)}
            {/* ── System-Wide Activity Timeline ── */}
            <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100">
                            <Activity className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-900">System-Wide Activity Timeline</h2>
                            <p className="text-xs text-gray-500">
                                {dateFilter === 'all' ? 'All recorded activity' : `Activity in the last ${dateFilter}`}
                                {' · '}{activityTimeline.length} events
                            </p>
                        </div>
                    </div>
                </div>
                <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                    {activityTimeline.length === 0 ? (
                        <div className="px-6 py-12 text-center">
                            <Activity className="h-8 w-8 text-gray-200 mx-auto mb-3" />
                            <p className="text-sm text-gray-400">No activity recorded in this period.</p>
                        </div>
                    ) : (
                        activityTimeline.map((entry) => {
                            const meta = ACTIVITY_META[entry.type];
                            const Icon = meta.icon;
                            return (
                                <div
                                    key={entry.id}
                                    className="px-6 py-3.5 flex items-start gap-4 hover:bg-gray-50/50 transition-colors group"
                                >
                                    <div className={`p-1.5 rounded-full ${meta.bg} shrink-0 mt-0.5`}>
                                        <Icon className={`h-4 w-4 ${meta.color}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                                {entry.label}
                                            </p>
                                            <span className="text-[11px] text-gray-400 whitespace-nowrap">
                                                {formatRelativeTime(entry.timestamp)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                                            {entry.description}
                                        </p>
                                    </div>
                                    {entry.href && (
                                        <Link
                                            href={entry.href}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                                        >
                                            <Eye className="h-3 w-3" />
                                            View
                                        </Link>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </section>

            {/* ── Accidents Module ── */}
            <OccupationalAccidentSection isAdmin={true} />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateStr).toLocaleDateString('en-ZW', { day: 'numeric', month: 'short' });
}

function ReportCard({
    icon: Icon,
    label,
    value,
    sub,
    color,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: number;
    sub: string;
    color: string;
}) {
    return (
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 ${color}`}>
                    <Icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-semibold text-gray-500">{label}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            <p className="mt-1 text-xs text-gray-500">{sub}</p>
        </div>
    );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
        <div>
            <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">{label}</span>
                <span className="font-semibold text-gray-900">{value}</span>
            </div>
            <div className="h-2 bg-gray-100 overflow-hidden">
                <div className={`h-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}
