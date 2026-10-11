'use client';

import { CSSProperties, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
    useReorders,
    usePlannerJobs,
    useGasLogs,
    useCocRequests,
    useSupplierComplianceApplications,
    useSupplierLedger,
    useSupplierApplications,
    useCourses,
    useExamSubmissions,
    useTrainingSessions,
    useCertificateRequests,
    useAdminDashboardSummary,
    useAdminActionQueue,
    useEnrollments,
    useCourseProgress,
    useMyStanding,
    useTrainerCourseStats,
    useVerifications,
    type AdminActionItem,
} from '@/lib/api';
import {
    adminCards,
    combineStates,
    maskCards,
    studentCards,
    technicianCards,
    trainerCards,
    vendorCards,
    type AdminSummary,
    type StatCard,
} from '@/lib/dashboard-stats';
import { ZIMBABWE_PROVINCES } from '@/constants/registry';
import {            ClipboardCheck,
    Award,
    Gift,
    TrendingUp,
    ArrowRight,
    Users,
    MapPin,
    Clock,
    Wrench,
    ShieldAlert,
    Building2,
    CheckCircle2,
    AlertTriangle,
    CalendarDays,
    Droplets,
    ChevronRight,
    FileText,
    BookOpen,
    GraduationCap,
    Package,
    ShieldCheck,
    Receipt,
    Factory,
} from 'lucide-react';
import Link from 'next/link';
import { CertificateRecord, JobTypeLabels, RefrigerantLog } from '@/types/index';
import { BRAND as colors } from '@/constants/colors';
import { rangeMsFor, type SimpleDateRange } from '@/lib/dateRange';
import { Drilldown } from '@/components/ui/Drilldown';
import { isFieldWorkerRole } from '@/lib/field-worker';
import { gettingStartedChecklist } from '@/lib/membership-status';
import { monthlyComplianceStatus } from '@/lib/dashboard-stats';
import { quotaUsage } from '@/lib/supplier-quota';
import { vendorApplicationInfo, vendorAttention } from '@/lib/vendor-status';
import {
    ContractorOnboardingBanner,
    GettingStartedChecklist,
    MonthlyCompliancePrompt,
    MyCoursesPanel,
    ReadyForCertificatePanel,
    RecentBuyerChecksPanel,
    StandingPanel,
    VendorAttentionPanel,
    VendorCompliancePanel,
    VendorQuotaPanel,
    VendorReordersPanel,
    type LearnerCourse,
} from '@/components/dashboard/DashboardPanels';

const EMPTY_ADMIN_SUMMARY: AdminSummary = {
    technicians: { total: 0, active: 0 },
    regionsWithTechnicians: 0,
    reorders: { pendingReviews: 0, volumeKgInPeriod: 0 },
};

/** Icon and colour for each card, by its label. */
const STAT_STYLE: Record<string, { icon: typeof Users; color: string }> = {
    'Jobs Completed': { icon: ClipboardCheck, color: 'blue' },
    'Pending COCs': { icon: Clock, color: 'amber' },
    'Refrigerant Recovered': { icon: Droplets, color: 'emerald' },
    'COCs on Record': { icon: Award, color: 'purple' },
    'Pending Reorders': { icon: Package, color: 'amber' },
    'Approved Volume': { icon: Droplets, color: 'blue' },
    'Compliance Certificates': { icon: ShieldCheck, color: 'emerald' },
    'Ledger Value': { icon: Receipt, color: 'purple' },
    'Approved Courses': { icon: BookOpen, color: 'blue' },
    'Needs Your Attention': { icon: AlertTriangle, color: 'red' },
    'Pending Grading': { icon: ClipboardCheck, color: 'amber' },
    'Certificate Requests': { icon: Award, color: 'purple' },
    'My Courses': { icon: BookOpen, color: 'blue' },
    'Exams Passed': { icon: Award, color: 'emerald' },
    'Awaiting Grading': { icon: Clock, color: 'amber' },
    'Available Courses': { icon: GraduationCap, color: 'purple' },
    'Active Techs': { icon: Users, color: 'blue' },
    'Total Technicians': { icon: Wrench, color: 'emerald' },
    'Pending Reorder Reviews': { icon: Package, color: 'amber' },
    'Provinces': { icon: MapPin, color: 'purple' },
    'Refrigerant Reordered': { icon: Droplets, color: 'red' },
};

/** Everything waiting on an administrator, with a link to each. */
function ActionQueuePanel({ items, total, loading, failed }: { items?: AdminActionItem[]; total?: number; loading: boolean; failed: boolean }) {
    if (failed) return null; // the page-level banner already says it could not load
    if (loading || !items) {
        return <div className="h-20 animate-pulse rounded-lg border border-[#E7E5E4] bg-[#FAFAF9]" aria-label="Loading items that need your action" />;
    }
    if (items.length === 0) {
        return (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
                <CheckCircle2 className="h-5 w-5" />
                You are all caught up. Nothing is waiting for your action.
            </div>
        );
    }
    return (
        <section aria-labelledby="needs-action-title" className="rounded-lg border border-amber-300 bg-amber-50 p-5">
            <h2 id="needs-action-title" className="text-sm font-semibold text-amber-900">
                Needs your action <span className="ml-1 rounded-full bg-amber-200 px-2 py-0.5 text-xs">{total}</span>
            </h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                    <li key={item.key}>
                        <Link
                            href={item.href}
                            className="flex items-center gap-3 rounded-lg border border-amber-200 bg-white px-3 py-2.5 transition hover:border-amber-400"
                        >
                            <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-amber-500 px-2 text-sm font-bold text-white">{item.count}</span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium text-[#1C1917]">{item.label}</span>
                                {item.hint && <span className="block text-xs text-[#78716C]">{item.hint}</span>}
                            </span>
                            <ArrowRight className="h-4 w-4 shrink-0 text-[#A8A29E]" />
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}

export default function DashboardPage() {
    const { user: session, isLoading } = useAuth();
    const [dateRange, setDateRange] = useState('today');
    const [regionFilter, setRegionFilter] = useState('all');
    const [nowMs, setNowMs] = useState(0);

    useEffect(() => {
        const initialTick = window.setTimeout(() => setNowMs(Date.now()), 0);
        const interval = window.setInterval(() => setNowMs(Date.now()), 60_000);
        return () => {
            window.clearTimeout(initialTick);
            window.clearInterval(interval);
        };
    }, []);
    const isAdmin = session?.role === 'org_admin';
    const isTechnician = isFieldWorkerRole(session?.role);
    const isVendor = session?.role === 'vendor';
    const isTrainerOrLecturer = session?.role === 'trainer' || session?.role === 'lecturer';
    const isStudent = session?.role === 'student';

    const periodRange = dateRange as SimpleDateRange;
    // Refrigerant logs are fetched from the start of the chosen period, rounded to the hour so the
    // request stays the same between minute ticks.
    const logsFrom = nowMs > 0 ? new Date(Math.floor((nowMs - rangeMsFor(periodRange)) / 3_600_000) * 3_600_000).toISOString() : undefined;

    const summaryQ = useAdminDashboardSummary(dateRange, regionFilter, isAdmin);
    const queueQ = useAdminActionQueue(isAdmin);
    const jobsQ = usePlannerJobs(isTechnician);
    const gasLogsQ = useGasLogs(logsFrom, undefined, 1000, isTechnician && nowMs > 0);
    const cocQ = useCocRequests(isTechnician);
    const reordersQ = useReorders(isVendor);
    const complianceQ = useSupplierComplianceApplications(isVendor);
    const ledgerQ = useSupplierLedger(undefined, isVendor);
    const coursesQ = useCourses(isTrainerOrLecturer || isStudent);
    const submissionsQ = useExamSubmissions(isTrainerOrLecturer || isStudent);
    const sessionsQ = useTrainingSessions(isTrainerOrLecturer);
    const certRequestsQ = useCertificateRequests(isTrainerOrLecturer);
    const enrollmentsQ = useEnrollments(isStudent);
    const progressQ = useCourseProgress(isStudent);
    const standingQ = useMyStanding(isTechnician);
    const trainerStatsQ = useTrainerCourseStats(isTrainerOrLecturer);
    const verificationsQ = useVerifications(isVendor);
    const applicationsQ = useSupplierApplications(isVendor);

    const plannerJobs = jobsQ.data ?? [];
    const cocRequests = cocQ.data ?? [];
    const reorders = reordersQ.data ?? [];
    const complianceApps = complianceQ.data ?? [];
    const vendorLedger = ledgerQ.data ?? [];
    const managedCourses = coursesQ.data ?? [];
    const examSubmissions = submissionsQ.data ?? [];
    const trainingSessions = sessionsQ.data ?? [];
    const certRequests = certRequestsQ.data ?? [];

    // Derive refrigerant logs from Gas Logs API (DB-backed) rather than localStorage
    const refrigerantLogs = useMemo(() => (gasLogsQ.data ?? []) as RefrigerantLog[], [gasLogsQ.data]);

    // Derive certificate records from CoC request data (DB-backed)
    const certificateRecords = useMemo(() => (cocQ.data ?? []) as unknown as CertificateRecord[], [cocQ.data]);

    // Which data sources each role's cards depend on, so a failure shows as a failure and not a zero.
    const cardSources = isAdmin ? [summaryQ]
        : isVendor ? [reordersQ, complianceQ, ledgerQ]
        : isTrainerOrLecturer ? [coursesQ, submissionsQ, certRequestsQ]
        : isStudent ? [coursesQ, submissionsQ, enrollmentsQ]
        : [jobsQ, cocQ, gasLogsQ];
    const cardState = combineStates(cardSources);
    const failedSources = [
        [summaryQ, 'registry summary'], [queueQ, 'the approvals queue'], [jobsQ, 'planner jobs'], [gasLogsQ, 'refrigerant logs'],
        [cocQ, 'COC requests'], [reordersQ, 'reorders'], [complianceQ, 'compliance certificates'], [ledgerQ, 'the ledger'],
        [coursesQ, 'courses'], [submissionsQ, 'exam submissions'], [sessionsQ, 'training sessions'],
        [applicationsQ, 'your supplier application'], [certRequestsQ, 'certificate requests'], [enrollmentsQ, 'enrolments'], [progressQ, 'course progress'],
    ].filter(([query]) => (query as { error?: unknown }).error).map(([, name]) => name as string);

    const statsNow = nowMs || 0;
    const statCards: StatCard[] = maskCards(
        isAdmin ? adminCards(summaryQ.data ?? EMPTY_ADMIN_SUMMARY, periodRange, regionFilter)
        : isVendor ? vendorCards({ reorders, complianceApps, ledger: vendorLedger, range: periodRange, now: statsNow })
        : isTrainerOrLecturer ? trainerCards({ courses: managedCourses, submissions: examSubmissions, certRequests })
        : isStudent ? studentCards({ courses: managedCourses, enrolledCourseIds: (enrollmentsQ.data ?? []).map((e) => e.courseId), submissions: examSubmissions })
        : technicianCards({ jobs: plannerJobs, cocRequests, gasLogs: refrigerantLogs, range: periodRange, now: statsNow }),
        // Until the clock has ticked once, "now" is unknown, so show loading rather than wrong numbers.
        nowMs === 0 && cardState === 'ready' ? 'loading' : cardState,
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D97706]"></div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <p className="text-[#78716C]">Please log in to view the dashboard</p>
                <a
                    href="/login"
                    className="px-4 py-2 bg-[#D97706] text-white hover:bg-[#b45309] transition-colors"
                >
                    Go to Login
                </a>
            </div>
        );
    }

    type QuickAction = {
        href: string;
        title: string;
        detail: string;
        icon: typeof Users;
        iconClassName: string;
        iconStyle?: CSSProperties;
    };

    const adminQuickActions: QuickAction[] = [
        {
            href: '/nou-dashboard',
            title: 'NOU Dashboard',
            detail: 'Reorder reviews, NOU queue, course approvals',
            icon: Building2,
            iconClassName: 'bg-orange-100 text-orange-600',
        },
        {
            href: '/admin/coc-requests',
            title: 'COC Requests',
            detail: 'Review submitted conformity certificates',
            icon: FileText,
            iconClassName: 'bg-blue-100 text-blue-600',
        },
        {
            href: '/suppliers',
            title: 'Supplier Management',
            detail: 'Applications and supplier records',
            icon: Users,
            iconClassName: 'bg-sky-100 text-sky-600',
        },
        {
            href: '/admin/accidents',
            title: 'Safety Oversight',
            detail: 'Regional accident monitoring and reports',
            icon: ShieldAlert,
            iconClassName: 'bg-red-100 text-red-600',
        },
    ];
    const technicianQuickActions: QuickAction[] = [
        {
            href: '/field-operations',
            title: 'Field Operations',
            detail: 'Schedule, plan, and review field work',
            icon: CalendarDays,
            iconClassName: 'bg-teal-100 text-teal-600',
        },
        {
            href: '/field-toolkit',
            title: 'Field Toolkit',
            detail: 'Installations & Logs',
            icon: Wrench,
            iconClassName: '',
            iconStyle: { backgroundColor: colors.accent + '20', color: colors.accent },
        },
        {
            href: '/field-operations?tab=logs',
            title: 'Jobs & Logs',
            detail: 'View all records',
            icon: ClipboardCheck,
            iconClassName: 'bg-purple-100 text-purple-600',
        },
        {
            href: '/certifications',
            title: 'Certifications',
            detail: 'Manage COCs',
            icon: Award,
            iconClassName: 'bg-amber-100 text-amber-600',
        },
        {
            href: '/resources',
            title: 'Resources',
            detail: 'Standards and references behind the toolkit',
            icon: BookOpen,
            iconClassName: 'bg-indigo-100 text-indigo-600',
        },
    ];

    const vendorQuickActions: QuickAction[] = [
        {
            href: '/suppliers/reorder',
            title: 'Reorder Gas',
            detail: 'Submit a new refrigerant reorder',
            icon: Package,
            iconClassName: 'bg-amber-100 text-amber-600',
        },
        {
            href: '/supplier-compliance',
            title: 'Compliance',
            detail: 'Distribution & NOU reporting certificates',
            icon: ShieldCheck,
            iconClassName: 'bg-emerald-100 text-emerald-600',
        },
        {
            href: '/suppliers',
            title: 'Record a Sale',
            detail: 'Log a sale or purchase in your ledger',
            icon: Factory,
            iconClassName: 'bg-orange-100 text-orange-600',
        },
        {
            href: '/suppliers/verify-buyer',
            title: 'Verify Buyer',
            detail: 'Confirm technician registration before sale',
            icon: Users,
            iconClassName: 'bg-sky-100 text-sky-600',
        },
        {
            href: '/rewards',
            title: 'Rewards',
            detail: 'Vendor rewards & coverage',
            icon: Gift,
            iconClassName: 'bg-purple-100 text-purple-600',
        },
    ];

    const trainerQuickActions: QuickAction[] = [
        {
            href: '/learn/manage',
            title: 'Manage Courses',
            detail: 'Author and submit courses for approval',
            icon: BookOpen,
            iconClassName: 'bg-blue-100 text-blue-600',
        },
        {
            href: '/technician-registry',
            title: 'Technician Registry',
            detail: 'Look up registered technicians',
            icon: Users,
            iconClassName: 'bg-sky-100 text-sky-600',
        },
        {
            href: '/certifications',
            title: 'Certificate Requests',
            detail: 'Submit exam results for admin approval',
            icon: Award,
            iconClassName: 'bg-amber-100 text-amber-600',
        },
        {
            href: '/whatgas',
            title: 'WhatGas Registry',
            detail: 'Refrigerant reference for course content',
            icon: Droplets,
            iconClassName: 'bg-cyan-100 text-cyan-600',
        },
        {
            href: '/resources',
            title: 'Resources',
            detail: 'Standards and references behind the toolkit',
            icon: BookOpen,
            iconClassName: 'bg-indigo-100 text-indigo-600',
        },
    ];

    const studentQuickActions: QuickAction[] = [
        {
            href: '/learn',
            title: 'My Learning',
            detail: 'Enrolled courses & exams',
            icon: BookOpen,
            iconClassName: 'bg-blue-100 text-blue-600',
        },
        {
            href: '/certifications',
            title: 'Certifications',
            detail: 'View issued certificates',
            icon: Award,
            iconClassName: 'bg-amber-100 text-amber-600',
        },
        {
            href: '/whatgas',
            title: 'WhatGas Registry',
            detail: 'Refrigerant reference lookup',
            icon: Droplets,
            iconClassName: 'bg-cyan-100 text-cyan-600',
        },
        {
            href: '/safety-center',
            title: 'Safety Center',
            detail: 'Guidance and safety resources',
            icon: ShieldAlert,
            iconClassName: 'bg-red-100 text-red-600',
        },
    ];

    // Technician-specific derived data
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scheduledJobs = plannerJobs
        .filter(job => job.status === 'scheduled' && new Date(job.scheduledDate) >= today)
        .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
        .slice(0, 4);
    const recentLogs = [...refrigerantLogs]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);

    const now = today.getTime();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const expiringSoonCerts = certificateRecords.filter(cert => {
        const expiry = new Date(cert.expiryDate).getTime();
        return expiry > now && expiry - now <= thirtyDays;
    });
    const expiredCerts = certificateRecords.filter(cert => new Date(cert.expiryDate).getTime() <= now);
    const validCerts = certificateRecords.filter(cert => {
        const expiry = new Date(cert.expiryDate).getTime();
        return expiry > now + thirtyDays;
    });

    const displayCerts = certificateRecords.slice(0, 5);
    const learnerCourses: LearnerCourse[] = managedCourses
        .filter((course) => course.status === 'approved')
        .map((course) => ({
            id: course.id,
            title: course.title,
            moduleCount: course.modules.length,
            completedModules: progressQ.data?.find((entry) => entry.courseId === course.id)?.completedModules.length ?? 0,
            enrolled: (enrollmentsQ.data ?? []).some((entry) => entry.courseId === course.id),
            submissions: examSubmissions.filter((submission) => submission.courseId === course.id),
        }));
    const checklist = gettingStartedChecklist({
        jobs: plannerJobs.length,
        gasLogs: refrigerantLogs.length,
        cocRequests: cocRequests.length,
        hasMembership: Boolean(standingQ.data?.membership || standingQ.data?.technician),
        isContractor: session.role === 'contractor',
    });
    const monthly = monthlyComplianceStatus(complianceApps, statsNow);
    const supplierApplications = applicationsQ.data ?? [];
    const vendorApplication = vendorApplicationInfo(supplierApplications);
    const approvedSupplier = supplierApplications.find((a) => a.status === 'approved');
    const vendorQuota = quotaUsage({ sales: vendorLedger.filter((entry) => entry.direction === 'sale'), quotaKg: approvedSupplier?.importQuotaKg, now: statsNow });
    const vendorAttentionItems = vendorAttention({
        application: vendorApplication, quota: vendorQuota, reorders, monthlyComplianceSubmitted: monthly.submitted,
        monthLabel: monthly.month, now: statsNow,
    });
    const recentBuyerChecks = (verificationsQ.data ?? [])
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

    const quickActions = isAdmin ? adminQuickActions
        : isVendor ? vendorQuickActions
        : isTrainerOrLecturer ? trainerQuickActions
        : isStudent ? studentQuickActions
        : technicianQuickActions;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-semibold text-[#1C1917]">
                        {isAdmin ? 'Admin Dashboard' : 'My Dashboard'}
                    </h1>
                    <p className="text-sm text-[#78716C] mt-0.5">Welcome back, {session.name}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {/* Date Filter */}
                    <div className="rounded-lg flex items-center border border-[#E7E5E4] bg-white divide-x divide-[#E7E5E4]">
                        {(['today', 'week', 'month'] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setDateRange(range)}
                                className={`px-3 py-2 text-sm font-medium transition-colors ${
                                    dateRange === range
                                        ? 'bg-[#1C1917] text-white'
                                        : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAFAF9]'
                                }`}
                            >
                                {range === 'today' ? 'Today' : range === 'week' ? 'This Week' : 'This Month'}
                            </button>
                        ))}
                    </div>
                    {isAdmin && (
                        <select
                            value={regionFilter}
                            onChange={(event) => setRegionFilter(event.target.value)}
                            className="border border-[#E7E5E4] bg-white px-3 py-2 text-sm font-medium text-[#44403C] outline-none focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706]"
                        >
                            <option value="all">All Regions</option>
                            {ZIMBABWE_PROVINCES.map((province) => (
                                <option key={province.id} value={province.name}>
                                    {province.name}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {/* KPI Cards */}
            {failedSources.length > 0 && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    Some figures could not be loaded ({failedSources.join(', ')}). They are shown as a dash, not as zero.{' '}
                    <button type="button" onClick={() => window.location.reload()} className="font-semibold underline">Refresh the page</button> to try again.
                </div>
            )}

            {isAdmin && <ActionQueuePanel items={queueQ.data?.items} total={queueQ.data?.total} loading={queueQ.isLoading} failed={Boolean(queueQ.error)} />}

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 ${isAdmin ? 'xl:grid-cols-5' : 'lg:grid-cols-4'}`}>
                {statCards.map((stat) => {
                    const style = STAT_STYLE[stat.label] ?? { icon: TrendingUp, color: 'blue' };
                    const Icon = style.icon;
                    const colorClasses: Record<string, string> = {
                        blue: 'bg-blue-50 text-blue-600',
                        amber: 'bg-amber-50 text-amber-600',
                        emerald: 'bg-emerald-50 text-emerald-600',
                        purple: 'bg-purple-50 text-purple-600',
                        red: 'bg-red-50 text-red-600',
                    };

                    return (
                        <div key={stat.label} className="rounded-lg bg-white p-6 border border-[#E7E5E4]">
                            <div className="flex items-center justify-between">
                                <div className={`p-2.5 ${colorClasses[style.color]}`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                            </div>
                            <div className="mt-4">
                                <p className="text-3xl font-bold text-[#1C1917]" aria-live="polite">{stat.value}</p>
                                <p className="text-sm text-[#78716C] mt-1">{stat.label}</p>
                                <p className="text-xs text-[#A8A29E] mt-2">{stat.note}</p>
                                <Drilldown label="How this is counted" className="mt-2 border-t border-[#F1F0EE] pt-1">
                                    <p>{stat.definition}</p>
                                </Drilldown>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Quick Actions - Role-based */}
            <div className="rounded-lg bg-white border border-[#E7E5E4] p-6">
                <h2 className="text-lg font-semibold mb-4 text-[#1C1917]">
                    {isAdmin ? 'Admin Quick Actions' : 'Quick Actions'}
                </h2>
                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${quickActions.length >= 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
                    {quickActions.map((action) => {
                        const Icon = action.icon;

                        return (
                            <Link
                                key={action.href}
                                href={action.href}
                                className="rounded-lg flex items-center gap-3 p-4 border border-[#E7E5E4] bg-[#FAFAF9] hover:bg-white hover:border-[#D97706]/30 transition-colors group"
                            >
                                <div
                                    className={`p-2 ${action.iconClassName}`}
                                    style={'iconStyle' in action ? action.iconStyle : undefined}
                                >
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-[#1C1917]">{action.title}</p>
                                    <p className="text-xs text-[#78716C]">{action.detail}</p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-[#A8A29E] group-hover:text-[#44403C] transition-colors" />
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* ── Vendor-only sections ── */}
            {isVendor && (
                <>
                    {!applicationsQ.isLoading && !complianceQ.isLoading && !reordersQ.isLoading && !ledgerQ.isLoading && <VendorAttentionPanel items={vendorAttentionItems} />}
                    {!complianceQ.isLoading && !complianceQ.error && monthly.submitted && <MonthlyCompliancePrompt month={monthly.month} submitted />}
                    <VendorQuotaPanel quota={vendorQuota} />
                    <VendorReordersPanel reorders={reorders} />
                    <VendorCompliancePanel apps={complianceApps} />

                    <RecentBuyerChecksPanel checks={verificationsQ.isLoading ? undefined : recentBuyerChecks} />
                </>
            )}

            {/* ── Trainer / Lecturer-only sections ── */}
            {isTrainerOrLecturer && (
                <>
                    {/* Grading Queue */}
                    <div className="rounded-lg overflow-hidden bg-white border border-[#E7E5E4]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E5E4]">
                            <div>
                                <h2 className="text-base font-semibold text-[#1C1917]">Grading Queue</h2>
                                <p className="text-xs text-[#78716C] mt-0.5">Student exam submissions awaiting review</p>
                            </div>
                            <Link href="/learn/manage" className="inline-flex items-center gap-1 text-xs font-semibold text-[#D97706] hover:text-[#b45309]">
                                Manage <ChevronRight className="h-3 w-3" />
                            </Link>
                        </div>
                        {examSubmissions.filter(s => s.status === 'pending').length === 0 ? (
                            <div className="px-6 py-10 text-center">
                                <ClipboardCheck className="h-8 w-8 text-[#D1C5C0] mx-auto mb-3" />
                                <p className="text-sm text-[#78716C]">No submissions awaiting grading.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-[#E7E5E4]">
                                {examSubmissions.filter(s => s.status === 'pending').slice(0, 5).map((sub) => (
                                    <div key={sub.id} className="px-6 py-4 hover:bg-[#FAFAF9] transition-colors flex items-center justify-between gap-4">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-[#1C1917] truncate">{sub.studentName}</p>
                                            <p className="text-xs text-[#78716C] mt-0.5">{sub.courseTitle}</p>
                                        </div>
                                        <span className="text-xs text-[#A8A29E] shrink-0">{new Date(sub.submittedAt).toLocaleDateString('en-ZW')}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Courses + Training Sessions */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="rounded-lg overflow-hidden bg-white border border-[#E7E5E4]">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E5E4]">
                                <div>
                                    <h2 className="text-base font-semibold text-[#1C1917]">My Courses</h2>
                                    <p className="text-xs text-[#78716C] mt-0.5">Authored courses & approval status</p>
                                </div>
                                <Link href="/learn/manage" className="inline-flex items-center gap-1 text-xs font-semibold text-[#D97706] hover:text-[#b45309]">
                                    Manage <ChevronRight className="h-3 w-3" />
                                </Link>
                            </div>
                            <div className="divide-y divide-[#E7E5E4]">
                                {managedCourses.length === 0 ? (
                                    <div className="px-6 py-8 text-center">
                                        <BookOpen className="h-8 w-8 text-[#D1C5C0] mx-auto mb-2" />
                                        <p className="text-sm text-[#78716C]">No courses created yet.</p>
                                        <Link href="/learn/manage" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#D97706]">
                                            Create a course <ArrowRight className="h-3 w-3" />
                                        </Link>
                                    </div>
                                ) : (
                                    managedCourses.slice(0, 5).map((course) => {
                                        const statusColors: Record<string, string> = {
                                            draft: 'bg-gray-50 text-gray-600 border-gray-200',
                                            pending_nou: 'bg-amber-50 text-amber-700 border-amber-200',
                                            approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                            rejected: 'bg-red-50 text-red-700 border-red-200',
                                        };
                                        return (
                                            <div key={course.id} className="px-6 py-4 hover:bg-[#FAFAF9] flex items-center justify-between gap-4">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-[#1C1917] truncate">{course.title}</p>
                                                    {(() => {
                                                        const stat = trainerStatsQ.data?.courses.find((entry) => entry.courseId === course.id);
                                                        if (!stat || course.status !== 'approved') return null;
                                                        return (
                                                            <p className="mt-0.5 text-xs text-[#78716C]">
                                                                {stat.enrolled} enrolled
                                                                {stat.passRate !== null ? ` · ${stat.passRate}% pass rate (${stat.learnersPassed}/${stat.learnersGraded})` : ' · no graded exams yet'}
                                                            </p>
                                                        );
                                                    })()}
                                                </div>
                                                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shrink-0 ${statusColors[course.status] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                                    {course.status.replace('_', ' ')}
                                                </span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        <div className="rounded-lg overflow-hidden bg-white border border-[#E7E5E4]">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E5E4]">
                                <div>
                                    <h2 className="text-base font-semibold text-[#1C1917]">Training Sessions</h2>
                                    <p className="text-xs text-[#78716C] mt-0.5">Upcoming and past sessions</p>
                                </div>
                            </div>
                            <div className="divide-y divide-[#E7E5E4]">
                                {trainingSessions.length === 0 ? (
                                    <div className="px-6 py-8 text-center">
                                        <GraduationCap className="h-8 w-8 text-[#D1C5C0] mx-auto mb-2" />
                                        <p className="text-sm text-[#78716C]">No training sessions scheduled.</p>
                                    </div>
                                ) : (
                                    trainingSessions.slice(0, 5).map((sessionItem) => (
                                        <div key={sessionItem.id} className="px-6 py-4 hover:bg-[#FAFAF9]">
                                            <p className="text-sm font-semibold text-[#1C1917] truncate">{sessionItem.title}</p>
                                            <p className="text-xs text-[#78716C] mt-0.5">{sessionItem.venue} · {new Date(sessionItem.startDate).toLocaleDateString('en-ZW')} · {sessionItem.seatsRemaining}/{sessionItem.seats} seats left</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <ReadyForCertificatePanel items={trainerStatsQ.isLoading ? undefined : trainerStatsQ.data?.readyForCertificate ?? []} />
                </>
            )}

            {/* ── Student-only sections ── */}
            {isStudent && (
                <MyCoursesPanel courses={learnerCourses} loading={coursesQ.isLoading || enrollmentsQ.isLoading || progressQ.isLoading} />
            )}

            {isStudent && (
                <div className="rounded-lg overflow-hidden bg-white border border-[#E7E5E4]">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E5E4]">
                        <div>
                            <h2 className="text-base font-semibold text-[#1C1917]">Available Courses</h2>
                            <p className="text-xs text-[#78716C] mt-0.5">Approved courses open for enrollment</p>
                        </div>
                        <Link href="/learn" className="inline-flex items-center gap-1 text-xs font-semibold text-[#D97706] hover:text-[#b45309]">
                            Browse all <ChevronRight className="h-3 w-3" />
                        </Link>
                    </div>
                    <div className="divide-y divide-[#E7E5E4]">
                        {managedCourses.length === 0 ? (
                            <div className="px-6 py-10 text-center">
                                <BookOpen className="h-8 w-8 text-[#D1C5C0] mx-auto mb-3" />
                                <p className="text-sm text-[#78716C]">No courses available yet. Check back soon.</p>
                            </div>
                        ) : (
                            managedCourses.slice(0, 5).map((course) => (
                                <div key={course.id} className="px-6 py-4 hover:bg-[#FAFAF9] transition-colors flex items-center justify-between gap-4">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-[#1C1917] truncate">{course.title}</p>
                                        <p className="text-xs text-[#78716C] mt-0.5 line-clamp-1">{course.description}</p>
                                    </div>
                                    <Link href="/learn" className="inline-flex items-center gap-1 text-xs font-semibold text-[#D97706] shrink-0">
                                        Open <ArrowRight className="h-3 w-3" />
                                    </Link>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* ── Technician-only sections ── */}
            {isTechnician && (
                <>
                    {standingQ.data?.contractorOnboarding === 'invited' && <ContractorOnboardingBanner />}
                    {nowMs > 0 && !jobsQ.isLoading && !cocQ.isLoading && !gasLogsQ.isLoading && (
                        <GettingStartedChecklist items={checklist} storageKey={`coolpro_checklist_${session.id}`} />
                    )}
                    {(session.role !== 'contractor' || standingQ.data?.technician || standingQ.data?.membership) && (
                        <StandingPanel standing={standingQ.data} now={statsNow} />
                    )}
                    {/* Upcoming Schedule + Certifications */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Upcoming Scheduled Jobs */}
                        <div className="rounded-lg overflow-hidden bg-white border border-[#E7E5E4]">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E5E4]">
                                <div>
                                    <h2 className="text-base font-semibold text-[#1C1917]">Upcoming Schedule</h2>
                                    <p className="text-xs text-[#78716C] mt-0.5">Jobs assigned and pending</p>
                                </div>
                                <Link href="/field-operations?tab=planner" className="inline-flex items-center gap-1 text-xs font-semibold text-[#D97706] hover:text-[#b45309]">
                                    Field Ops <ChevronRight className="h-3 w-3" />
                                </Link>
                            </div>
                            <div className="divide-y divide-[#E7E5E4]">
                                {scheduledJobs.length === 0 ? (
                                    <div className="px-6 py-8 text-center">
                                        <CalendarDays className="h-8 w-8 text-[#D1C5C0] mx-auto mb-2" />
                                        <p className="text-sm text-[#78716C]">No upcoming jobs scheduled.</p>
                                        <Link href="/field-operations?tab=planner" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#D97706]">
                                            Open Field Operations <ArrowRight className="h-3 w-3" />
                                        </Link>
                                    </div>
                                ) : (
                                    scheduledJobs.map((job) => {
                                        const statusLabel = job.status.replace('-', ' ');
                                        const statusColors: Record<string, string> = {
                                            scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
                                            'in-progress': 'bg-amber-50 text-amber-700 border-amber-200',
                                            completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                            'follow-up': 'bg-rose-50 text-rose-700 border-rose-200',
                                        };
                                        return (
                                            <div key={job.id} className="px-6 py-4 hover:bg-[#FAFAF9] transition-colors group cursor-pointer">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2 shrink-0 ${
                                                        job.status === 'in-progress' ? 'bg-amber-50 text-amber-600' :
                                                        job.status === 'follow-up' ? 'bg-rose-50 text-rose-600' :
                                                        'bg-blue-50 text-blue-600'
                                                    }`}>
                                                        <CalendarDays className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className="text-sm font-semibold text-[#1C1917] truncate">{job.clientName}</p>
                                                            <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusColors[job.status]}`}>
                                                                {statusLabel}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-[#78716C] mt-0.5">
                                                            {job.location} · {job.refrigerantClass} · {JobTypeLabels[job.jobType]}
                                                            {job.refrigerantType && <span> · {job.refrigerantType}{job.amount ? ` (${job.amount} kg)` : ''}</span>}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className="text-xs font-semibold text-[#44403C] hidden sm:block">{job.scheduledDate}</span>
                                                        <Link
                                                            href="/field-operations?tab=planner"
                                                            className="rounded-lg inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#D97706] bg-[#D97706]/5 border border-[#D97706]/20 hover:bg-[#D97706]/10 transition-colors opacity-0 group-hover:opacity-100"
                                                                                >
                                                            Open <ArrowRight className="h-3 w-3" />
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Certification Status */}
                        <div className="rounded-lg overflow-hidden bg-white border border-[#E7E5E4]">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E5E4]">
                                <div>
                                    <h2 className="text-base font-semibold text-[#1C1917]">Certifications</h2>
                                    <p className="text-xs text-[#78716C] mt-0.5">
                                        {expiredCerts.length > 0
                                            ? `${expiredCerts.length} expired · `
                                            : ''}
                                        {expiringSoonCerts.length > 0
                                            ? `${expiringSoonCerts.length} expiring soon`
                                            : `${validCerts.length} active`}
                                    </p>
                                </div>
                                <Link href="/certifications" className="inline-flex items-center gap-1 text-xs font-semibold text-[#D97706] hover:text-[#b45309]">
                                    Manage <ChevronRight className="h-3 w-3" />
                                </Link>
                            </div>
                            <div className="divide-y divide-[#E7E5E4]">
                                {displayCerts.length === 0 ? (
                                    <div className="px-6 py-8 text-center">
                                        <Award className="h-8 w-8 text-[#D1C5C0] mx-auto mb-2" />
                                        <p className="text-sm text-[#78716C]">No certificates issued yet.</p>
                                        <Link href="/certifications" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#D97706]">
                                            Browse assessments <ArrowRight className="h-3 w-3" />
                                        </Link>
                                    </div>
                                ) : (
                                    displayCerts.map((cert) => {
                                        const expiry = new Date(cert.expiryDate);
                                        const daysLeft = Math.ceil((expiry.getTime() - now) / (1000 * 60 * 60 * 24));
                                        const isExpired = daysLeft <= 0;
                                        const isExpiringSoon = daysLeft > 0 && daysLeft <= 30;
                                        return (
                                            <div key={cert.id} className="flex items-center gap-4 px-6 py-4 hover:bg-[#FAFAF9]">
                                                <div className={`p-2 ${isExpired ? 'bg-red-50 text-red-600' : isExpiringSoon ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                    {isExpired || isExpiringSoon ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-[#1C1917] truncate">{cert.certificateType}</p>
                                                    <p className="text-xs text-[#78716C]">{cert.issuingBody} · {cert.certificateNumber}</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold ${isExpired ? 'bg-red-50 text-red-700' : isExpiringSoon ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                                        {isExpired ? 'Expired' : isExpiringSoon ? `${daysLeft}d left` : 'Valid'}
                                                    </span>
                                                    <p className="text-xs text-[#A8A29E] mt-1">Exp. {cert.expiryDate}</p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Refrigerant Activity */}
                    <div className="rounded-lg overflow-hidden bg-white border border-[#E7E5E4]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E5E4]">
                            <div>
                                <h2 className="text-base font-semibold text-[#1C1917]">Refrigerant Activity</h2>
                                <p className="text-xs text-[#78716C] mt-0.5">Recent charges, recoveries and leak repairs</p>
                            </div>
                            <Link href="/field-toolkit" className="inline-flex items-center gap-1 text-xs font-semibold text-[#D97706] hover:text-[#b45309]">
                                Field Toolkit <ChevronRight className="h-3 w-3" />
                            </Link>
                        </div>
                        {recentLogs.length === 0 ? (
                            <div className="px-6 py-8 text-center">
                                <Droplets className="h-8 w-8 text-[#D1C5C0] mx-auto mb-2" />
                                <p className="text-sm text-[#78716C]">No refrigerant logs recorded yet.</p>
                                <Link href="/field-toolkit" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#D97706]">
                                    Log refrigerant action <ArrowRight className="h-3 w-3" />
                                </Link>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-[#E7E5E4] bg-[#FAFAF9]">
                                            <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#A8A29E]">Client</th>
                                            <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#A8A29E]">Refrigerant</th>
                                            <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#A8A29E]">Action</th>
                                            <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#A8A29E]">Amount</th>
                                            <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#A8A29E]">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentLogs.map((log) => {
                                            const actionStyles: Record<string, string> = {
                                                Charge: 'bg-blue-50 text-blue-700',
                                                Recovery: 'bg-emerald-50 text-emerald-700',
                                                'Leak Repair': 'bg-amber-50 text-amber-700',
                                            };
                                            return (
                                                <tr key={log.id} className="border-b border-[#E7E5E4] hover:bg-[#FAFAF9]">
                                                    <td className="px-6 py-3 text-sm font-medium text-[#1C1917]">{log.clientName}</td>
                                                    <td className="px-6 py-3 text-sm text-[#44403C]">{log.refrigerantType}</td>
                                                    <td className="px-6 py-3">
                                                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold ${actionStyles[log.actionType] ?? 'bg-gray-50 text-gray-600'}`}>
                                                            {log.actionType}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3 text-sm text-[#44403C]">{log.amount} kg</td>
                                                    <td className="px-6 py-3 text-xs text-[#78716C]">{new Date(log.timestamp).toLocaleDateString('en-ZW')}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                </>
            )}

        </div>
    );
}
