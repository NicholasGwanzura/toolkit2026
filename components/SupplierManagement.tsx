'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
    ArrowRight,
    BadgeCheck,
    Building2,
    CheckCircle2,
    CircleDashed,
    Clock3,
    Filter,
    MapPin,
    Search,
    ShieldAlert,
    ShieldCheck,
    Truck,
    Users,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useSupplierApplications, approveSupplierApplication, markSupplierApplicationUnderReview, rejectSupplierApplication, useApprovedSuppliers } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { NEAR_LIMIT_PERCENT } from '@/lib/supplier-quota';
import VendorReportingPanel from '@/components/VendorReportingPanel';
import type {
    ApprovedSupplier,
    SupplierRegistrationStatus,
    SupplierSurveyData,
} from '@/types/index';

type StatusFilter = SupplierRegistrationStatus | 'all';

const STATUS_STYLES: Record<SupplierRegistrationStatus, string> = {
    submitted: 'bg-slate-100 text-slate-700 border-slate-200',
    'under-review': 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-rose-50 text-rose-700 border-rose-200',
};

const STATUS_LABELS: Record<SupplierRegistrationStatus, string> = {
    submitted: 'Submitted',
    'under-review': 'Under review',
    approved: 'Approved',
    rejected: 'Rejected',
};

const SURVEY_LABELS: Record<keyof SupplierSurveyData, string> = {
    employeeCountBand: 'Employee count',
    yearsInOperation: 'Years in operation',
    recoveryEquipmentAccess: 'Recovery equipment access',
    storageComplianceConfidence: 'Storage compliance confidence',
    lowGwpRegulationConfidence: 'Low-GWP regulation confidence',
    loadSheddingFrequency: 'Load-shedding frequency',
    preferredLanguage: 'Preferred language',
    biggestDistributionChallenge: 'Biggest distribution challenge',
};

const SURVEY_VALUE_LABELS: Record<string, string> = {
    '1_5': '1–5',
    '6_20': '6–20',
    '21_50': '21–50',
    '51_200': '51–200',
    '200_plus': '200+',
    under_1: 'Under 1 year',
    '1_3': '1–3 years',
    '4_10': '4–10 years',
    '11_20': '11–20 years',
    '20_plus': '20+ years',
    no_access: 'No access',
};

function formatDate(value: string) {
    return new Intl.DateTimeFormat('en-ZW', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

function formatSurveyValue(value: unknown) {
    if (typeof value === 'number') return `${value}/5`;
    if (typeof value === 'string') return SURVEY_VALUE_LABELS[value] ?? value.replace(/_/g, ' ');
    return String(value);
}

function Badge({
    children,
    className,
}: {
    children: ReactNode;
    className: string;
}) {
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${className}`}>
            {children}
        </span>
    );
}

export default function SupplierManagement() {
    const { user: session, isLoading } = useAuth();
    const { success, error } = useToast();
    const { data: applications = [], isLoading: applicationsLoading, error: applicationsError } = useSupplierApplications();
    const { data: approvedSuppliersData } = useApprovedSuppliers();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [provinceFilter, setProvinceFilter] = useState('all');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [actingStatus, setActingStatus] = useState<SupplierRegistrationStatus | null>(null);
    const [reviewNote, setReviewNote] = useState('');
    const selectedApplicationRef = useRef<HTMLDivElement | null>(null);

    const isVendor = session?.role === 'vendor';
    const canReview = session ? ['org_admin'].includes(session.role) : false;
    const myApplications = useMemo(() => {
        if (!session) return [];
        const email = session.email.toLowerCase();
        return applications.filter(application => application.email.toLowerCase() === email);
    }, [applications, session]);

    const visibleApplications = useMemo(() => {
        const base = isVendor ? myApplications : applications;

        return base
            .filter(application => {
                const matchesSearch =
                    !search.trim() ||
                    [
                        application.companyName,
                        application.tradingName ?? '',
                        application.contactName,
                        application.registrationNumber,
                        application.city,
                        application.province,
                    ]
                        .join(' ')
                        .toLowerCase()
                        .includes(search.trim().toLowerCase());

                const matchesStatus = statusFilter === 'all' || application.status === statusFilter;
                const matchesProvince = provinceFilter === 'all' || application.province === provinceFilter;

                return matchesSearch && matchesStatus && matchesProvince;
            })
            .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    }, [applications, isVendor, myApplications, provinceFilter, search, statusFilter]);

    const selectedApplication = useMemo(
        () => visibleApplications.find(application => application.id === selectedId) ?? visibleApplications[0] ?? null,
        [selectedId, visibleApplications]
    );

    useEffect(() => {
        setReviewNote('');
    }, [selectedApplication?.id]);

    const approvedSupplierList = approvedSuppliersData ?? [];

    const myApproved = approvedSupplierList.find(supplier => supplier.id === myApplications[0]?.id);

    type StatCard = { label: string; value: string | number; icon: typeof Building2; tone: 'blue' | 'amber' | 'emerald' | 'rose'; detail: string };
    const adminStats: StatCard[] = [
        { label: 'Applications', value: applications.length, icon: Building2, tone: 'blue', detail: 'All supplier records' },
        {
            label: 'Pending review',
            value: applications.filter(application => application.status === 'submitted' || application.status === 'under-review').length,
            icon: Clock3,
            tone: 'amber',
            detail: 'Waiting on compliance review',
        },
        { label: 'Approved suppliers', value: approvedSupplierList.length, icon: BadgeCheck, tone: 'emerald', detail: 'Approved supplier registry' },
        {
            label: 'Quota alerts',
            value: approvedSupplierList.filter(supplier => supplier.quotaStatus === 'near-limit' || supplier.quotaStatus === 'exceeded').length,
            icon: ShieldAlert,
            tone: 'rose',
            detail: `Suppliers at ${NEAR_LIMIT_PERCENT}% of their annual quota or over`,
        },
    ];

    // A supplier sees their own company only: no counts of other suppliers, queues or network-wide alerts.
    const mine = myApplications[0];
    const vendorStats: StatCard[] = [
        { label: 'Account status', value: mine ? STATUS_LABELS[mine.status] : 'Not linked', icon: BadgeCheck, tone: mine?.status === 'approved' ? 'emerald' : 'amber', detail: mine ? `Submitted ${formatDate(mine.submittedAt)}` : 'No supplier record on your login yet' },
        {
            label: 'Annual import quota',
            value: myApproved?.importQuotaKg == null ? 'Not set' : `${myApproved.usagePercent ?? 0}%`,
            icon: ShieldAlert,
            tone: myApproved?.quotaStatus === 'exceeded' ? 'rose' : myApproved?.quotaStatus === 'near-limit' ? 'amber' : 'blue',
            detail: myApproved?.importQuotaKg == null
                ? 'An administrator sets this'
                : `${(myApproved.totalSalesKg ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} of ${myApproved.importQuotaKg.toLocaleString()} kg sold this year`,
        },
        { label: 'Refrigerants supplied', value: mine?.refrigerantsSupplied.length ?? 0, icon: Truck, tone: 'blue', detail: mine?.refrigerantsSupplied.join(', ') || 'None listed' },
        { label: 'Registration number', value: mine?.registrationNumber || 'None', icon: Building2, tone: 'blue', detail: 'Quote this when you contact HEVACRAZ' },
    ];
    const stats = isVendor ? vendorStats : adminStats;

    const updateStatus = async (id: string, status: SupplierRegistrationStatus) => {
        if (status === 'rejected' && !reviewNote.trim()) {
            error('Add a rejection note before rejecting this supplier application.');
            return;
        }
        setActingStatus(status);
        try {
            if (status === 'under-review') {
                await markSupplierApplicationUnderReview(id);
                success('Supplier application marked under review.');
            } else if (status === 'approved') {
                await approveSupplierApplication(id);
                success('Supplier application approved and vendor account updated.');
            } else if (status === 'rejected') {
                await rejectSupplierApplication(id, { applicantMessage: reviewNote.trim() || undefined });
                success('Supplier application rejected and email notification queued.');
            }
            setReviewNote('');
        } catch (err) {
            error(err instanceof Error ? err.message : 'Could not update supplier application.');
        } finally {
            setActingStatus(null);
        }
    };

    const handleReviewApplication = (id: string) => {
        setSelectedId(id);
        requestAnimationFrame(() => {
            selectedApplicationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    };

    return (
        <div className="space-y-6">
            {canReview && (
            <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-3xl space-y-3">
                        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-600">
                            Supplier management
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-gray-900">Review supplier applications and approved partners</h2>
                            <p className="max-w-2xl text-sm leading-6 text-gray-600">
                                Keep supplier onboarding, approval status, quotas and approved refrigerant partners in one place.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Link
                            href="/admin/suppliers/add"
                            className="inline-flex items-center gap-2 bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                        >
                            Invite supplier
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link
                            href="/nou-dashboard"
                            className="rounded-lg inline-flex items-center gap-2 border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                            View NOU dashboard
                        </Link>
                    </div>
                </div>
            </section>
            )}

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {stats.map((item) => {
                    const Icon = item.icon;
                    const toneClasses: Record<string, string> = {
                        blue: 'bg-blue-50 text-blue-600',
                        amber: 'bg-amber-50 text-amber-600',
                        emerald: 'bg-emerald-50 text-emerald-600',
                        rose: 'bg-rose-50 text-rose-600',
                    };

                    return (
                        <div key={item.label} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className={`p-3 ${toneClasses[item.tone]}`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                            </div>
                            <div className="mt-4 space-y-1">
                                <p className={`${typeof item.value === 'string' ? 'text-2xl' : 'text-3xl'} font-bold text-gray-900`}>{item.value}</p>
                                <p className="text-sm font-semibold text-gray-700">{item.label}</p>
                                <p className="text-xs text-gray-500">{item.detail}</p>
                            </div>
                        </div>
                    );
                })}
            </section>

            {isVendor && session && (
                <VendorReportingPanel session={session} application={myApplications[0]} />
            )}

            {isVendor && (
                <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Your account</p>
                            <h3 className="mt-2 text-lg font-semibold text-gray-900">Supplier status linked to {session?.email ?? 'your profile'}</h3>
                            <p className="mt-1 text-sm text-gray-600">
                                These are the details on file for your company.
                            </p>
                        </div>
                        <Badge className="border-gray-200 bg-gray-50 text-gray-600">Vendor view</Badge>
                    </div>

                    {myApplications.length === 0 ? (
                        <div className="mt-6 border border-dashed border-gray-200 bg-gray-50 p-6">
                            <div className="flex items-start gap-4">
                                <CircleDashed className="mt-0.5 h-5 w-5 text-gray-400" />
                                <div className="space-y-2">
                                    <p className="font-semibold text-gray-900">No supplier application linked yet</p>
                                    <p className="max-w-2xl text-sm leading-6 text-gray-600">
                                        Ask the administrator who invited you to resend the onboarding invitation. Supplier records are created only through that secure flow.
                                    </p>
                                    <Link
                                        href="/contact"
                                        className="inline-flex items-center gap-2 bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
                                    >
                                        Contact HEVACRAZ
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                            <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Latest application</p>
                                        <h4 className="mt-2 text-xl font-bold text-gray-900">
                                            {myApplications[0].tradingName || myApplications[0].companyName}
                                        </h4>
                                        <p className="mt-1 text-sm text-gray-600">
                                            Submitted {formatDate(myApplications[0].submittedAt)}
                                        </p>
                                    </div>
                                    <Badge className={STATUS_STYLES[myApplications[0].status]}>
                                        {STATUS_LABELS[myApplications[0].status]}
                                    </Badge>
                                </div>

                                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                    <InfoCard label="Province" value={myApplications[0].province} />
                                    <InfoCard label="Supplier type" value={myApplications[0].supplierType.replace('-', ' ')} />
                                    <InfoCard label="Refrigerants" value={myApplications[0].refrigerantsSupplied.join(', ')} wide />
                                    <InfoCard label="Contact" value={myApplications[0].contactName} />
                                </div>
                            </div>

                            <div className="border border-gray-200 bg-white p-5">
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Quick links</p>
                                <ul className="mt-4 space-y-2 text-sm">
                                    {[
                                        { href: '/supplier-compliance', label: "File this month's compliance certificate", icon: ShieldCheck },
                                        { href: '/suppliers/reorder', label: 'Reorder refrigerant', icon: Truck },
                                        { href: '/suppliers/verify-buyer', label: 'Verify a buyer before a sale', icon: CheckCircle2 },
                                    ].map(link => (
                                        <li key={link.href}>
                                            <Link href={link.href} className="flex items-center gap-3 border border-gray-200 px-3 py-2.5 font-medium text-gray-800 transition hover:bg-gray-50">
                                                <link.icon className="h-4 w-4 text-blue-600" aria-hidden="true" />
                                                {link.label}
                                                <ArrowRight className="ml-auto h-4 w-4 text-gray-400" aria-hidden="true" />
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </section>
            )}

            {canReview && (
                <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Review queue</p>
                                <h3 className="mt-2 text-lg font-semibold text-gray-900">All supplier applications</h3>
                                <p className="mt-1 text-sm text-gray-600">
                                    Review incoming applications, approve trusted partners, or send submissions back to review.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                                    <Filter className="h-4 w-4" />
                                    <select
                                        value={statusFilter}
                                        onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                                        className="bg-transparent text-sm outline-none"
                                    >
                                        <option value="all">All statuses</option>
                                        <option value="submitted">Submitted</option>
                                        <option value="under-review">Under review</option>
                                        <option value="approved">Approved</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                                    <MapPin className="h-4 w-4" />
                                    <select
                                        value={provinceFilter}
                                        onChange={(event) => setProvinceFilter(event.target.value)}
                                        className="bg-transparent text-sm outline-none"
                                    >
                                        <option value="all">All provinces</option>
                                        {Array.from(new Set(applications.map(application => application.province)))
                                            .sort()
                                            .map(province => (
                                                <option key={province} value={province}>
                                                    {province}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                                <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                                    <Search className="h-4 w-4" />
                                    <input
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder="Search suppliers"
                                        className="w-40 bg-transparent outline-none placeholder:text-gray-400"
                                    />
                                </label>
                            </div>
                        </div>

                        {selectedApplication && (
                            <div ref={selectedApplicationRef} className="mt-6 scroll-mt-6 rounded-xl border border-blue-200 bg-blue-50/60 p-5 shadow-sm">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="space-y-3">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">Application ready for decision</p>
                                            <Badge className={STATUS_STYLES[selectedApplication.status]}>
                                                {STATUS_LABELS[selectedApplication.status]}
                                            </Badge>
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-gray-900">
                                                {selectedApplication.tradingName || selectedApplication.companyName}
                                            </h4>
                                            <p className="mt-1 text-sm text-gray-600">
                                                {selectedApplication.contactName} · {selectedApplication.email} · {selectedApplication.phone}
                                            </p>
                                        </div>
                                    </div>

                                    {canReview && (
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                disabled={actingStatus !== null || selectedApplication.status === 'approved' || selectedApplication.status === 'rejected'}
                                                onClick={() => updateStatus(selectedApplication.id, 'under-review')}
                                                className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <Clock3 className="h-4 w-4" />
                                                {actingStatus === 'under-review' ? 'Updating…' : 'Under review'}
                                            </button>
                                            <button
                                                type="button"
                                                disabled={actingStatus !== null || selectedApplication.status === 'approved'}
                                                onClick={() => updateStatus(selectedApplication.id, 'approved')}
                                                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <CheckCircle2 className="h-4 w-4" />
                                                {actingStatus === 'approved' ? 'Approving…' : 'Approve'}
                                            </button>
                                            <button
                                                type="button"
                                                disabled={actingStatus !== null || selectedApplication.status === 'rejected' || selectedApplication.status === 'approved'}
                                                onClick={() => updateStatus(selectedApplication.id, 'rejected')}
                                                className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <ShieldAlert className="h-4 w-4" />
                                                {actingStatus === 'rejected' ? 'Rejecting…' : 'Reject'}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-5 grid gap-3 text-sm text-gray-700 sm:grid-cols-2">
                                    <p><span className="font-semibold text-gray-900">Registration:</span> {selectedApplication.registrationNumber}</p>
                                    <p><span className="font-semibold text-gray-900">Type:</span> {selectedApplication.supplierType.replace('-', ' ')}</p>
                                    <p><span className="font-semibold text-gray-900">Location:</span> {selectedApplication.city}, {selectedApplication.province}</p>
                                    <p><span className="font-semibold text-gray-900">Submitted:</span> {formatDate(selectedApplication.submittedAt)}</p>
                                    {selectedApplication.taxNumber && (
                                        <p><span className="font-semibold text-gray-900">Tax number:</span> {selectedApplication.taxNumber}</p>
                                    )}
                                    {selectedApplication.pesepayMerchantId && (
                                        <p><span className="font-semibold text-gray-900">Pesepay merchant:</span> {selectedApplication.pesepayMerchantId}</p>
                                    )}
                                    {selectedApplication.website && (
                                        <p className="sm:col-span-2"><span className="font-semibold text-gray-900">Website:</span> {selectedApplication.website}</p>
                                    )}
                                    {selectedApplication.address && (
                                        <p className="sm:col-span-2"><span className="font-semibold text-gray-900">Address:</span> {selectedApplication.address}</p>
                                    )}
                                    {selectedApplication.notes && (
                                        <p className="sm:col-span-2"><span className="font-semibold text-gray-900">Notes:</span> {selectedApplication.notes}</p>
                                    )}
                                </div>

                                <div className="mt-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Refrigerants supplied</p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {selectedApplication.refrigerantsSupplied.map((refrigerant) => (
                                            <Badge key={refrigerant} className="border-blue-200 bg-white text-blue-700">
                                                {refrigerant}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                {selectedApplication.status !== 'approved' && selectedApplication.status !== 'rejected' && (
                                    <div className="mt-4 rounded-lg border border-amber-200 bg-white p-4">
                                        <label htmlFor="supplier-review-note" className="text-sm font-semibold text-gray-900">
                                            Review note
                                        </label>
                                        <p className="mt-1 text-xs text-gray-500">
                                            Required when rejecting. This note is saved and included in the supplier rejection email.
                                        </p>
                                        <textarea
                                            id="supplier-review-note"
                                            value={reviewNote}
                                            onChange={(event) => setReviewNote(event.target.value)}
                                            className="mt-3 min-h-24 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                                            placeholder="Explain missing documents, questionnaire concerns, or compliance corrections."
                                        />
                                    </div>
                                )}

                                {selectedApplication.reviewNote && (
                                    <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
                                        <p className="font-semibold text-gray-900">Review note</p>
                                        <p className="mt-1">{selectedApplication.reviewNote}</p>
                                        {selectedApplication.reviewedAt && (
                                            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-gray-400">
                                                Updated {formatDate(selectedApplication.reviewedAt)}
                                            </p>
                                        )}
                                    </div>
                                )}

                                <details className="mt-4 rounded-lg border border-blue-100 bg-white">
                                    <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-900">
                                        Drill down: questionnaire and compliance answers
                                    </summary>
                                    <div className="border-t border-blue-100 p-4">
                                        {selectedApplication.surveyData && Object.entries(selectedApplication.surveyData).some(([, value]) => value !== undefined && value !== null && value !== '') ? (
                                            <div className="grid gap-3 text-sm text-gray-700 sm:grid-cols-2">
                                                {Object.entries(selectedApplication.surveyData)
                                                    .filter(([, value]) => value !== undefined && value !== null && value !== '')
                                                    .map(([key, value]) => (
                                                        <p key={key}>
                                                            <span className="font-semibold text-gray-900">{SURVEY_LABELS[key as keyof SupplierSurveyData] ?? key}:</span>{' '}
                                                            {formatSurveyValue(value)}
                                                        </p>
                                                    ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500">No questionnaire answers were saved for this application.</p>
                                        )}
                                    </div>
                                </details>
                            </div>
                        )}

                        <div className="mt-6 overflow-x-auto border border-gray-200">
                         <div className="min-w-[560px]">
                            <div className="grid grid-cols-[1.4fr_0.8fr_0.7fr_0.6fr] gap-4 border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                                <span>Company</span>
                                <span>Location</span>
                                <span>Status</span>
                                <span className="text-right">Action</span>
                            </div>

                            <div className="divide-y divide-gray-100">
                                {visibleApplications.length === 0 ? (
                                    <div className="p-6 text-sm text-gray-500">
                                        No supplier applications match the current filters.
                                    </div>
                                ) : (
                                    visibleApplications.map((application) => {
                                        const isSelected = selectedApplication?.id === application.id;
                                        return (
                                            <button
                                                key={application.id}
                                                type="button"
                                                onClick={() => handleReviewApplication(application.id)}
                                                aria-label={`Review ${application.tradingName || application.companyName}`}
                                                className={`grid w-full grid-cols-[1.4fr_0.8fr_0.7fr_0.6fr] gap-4 px-4 py-4 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${
                                                    isSelected ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : 'bg-white hover:bg-gray-50'
                                                }`}
                                            >
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold text-gray-900">
                                                        {application.tradingName || application.companyName}
                                                    </p>
                                                    <p className="truncate text-xs text-gray-500">
                                                        {application.contactName} · {application.registrationNumber}
                                                    </p>
                                                </div>
                                                <div className="min-w-0 text-sm text-gray-600">
                                                    <p className="truncate">{application.city}</p>
                                                    <p className="truncate text-xs text-gray-400">{application.province}</p>
                                                </div>
                                                <div>
                                                    <Badge className={STATUS_STYLES[application.status]}>
                                                        {STATUS_LABELS[application.status]}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center justify-end">
                                                    <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] ${
                                                        isSelected ? 'bg-blue-600 text-white' : 'border border-blue-200 bg-blue-50 text-blue-700'
                                                    }`}>
                                                        {isSelected ? 'Selected' : 'Review'}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                         </div>
                        </div>
                    </div>

                    <aside className="space-y-6">
                        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Approved suppliers</p>
                                    <h3 className="mt-2 text-lg font-semibold text-gray-900">Registry and approved applications</h3>
                                </div>
                                <Users className="h-5 w-5 text-gray-300" />
                            </div>
                            <div className="mt-4 space-y-3">
                                {approvedSupplierList.map((supplier) => (
                                    <div key={supplier.id} className="border border-gray-200 bg-gray-50 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-gray-900">{supplier.name}</p>
                                                <p className="mt-1 text-xs text-gray-500">{supplier.region}</p>
                                            </div>
                                            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Approved</Badge>
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {supplier.refrigerants.length === 0 ? (
                                                <span className="text-xs text-gray-400">No refrigerants listed</span>
                                            ) : supplier.refrigerants.map((refrigerant) => (
                                                <Badge key={refrigerant} className="border-gray-200 bg-white text-gray-600">
                                                    {refrigerant}
                                                </Badge>
                                            ))}
                                        </div>
                                        <QuotaMeter supplier={supplier} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </aside>
                </section>
            )}

            {!canReview && !isVendor && (
                <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex items-start gap-4">
                        <ShieldCheck className="mt-0.5 h-5 w-5 text-blue-600" />
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-gray-900">Read-only supplier registry</h3>
                            <p className="max-w-3xl text-sm leading-6 text-gray-600">
                                This role can view approved supplier references but cannot change application status.
                                Use the supplier registration flow if you need to submit a new company profile.
                            </p>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}

function QuotaMeter({ supplier }: { supplier: ApprovedSupplier }) {
    if (supplier.quotaStatus === undefined) return null;
    const sold = (supplier.totalSalesKg ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 });
    if (supplier.importQuotaKg == null) {
        return (
            <p className="mt-3 text-xs text-gray-500">
                No annual quota set. Sold {sold} kg this year. Set one from the NOU Dashboard.
            </p>
        );
    }
    const percent = supplier.usagePercent ?? 0;
    const tone =
        supplier.quotaStatus === 'exceeded' ? { bar: 'bg-rose-500', text: 'text-rose-700', label: 'Quota exceeded' }
        : supplier.quotaStatus === 'near-limit' ? { bar: 'bg-amber-500', text: 'text-amber-700', label: 'Near limit' }
        : { bar: 'bg-emerald-500', text: 'text-emerald-700', label: 'Within quota' };
    return (
        <div className="mt-3">
            <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="text-gray-600">{sold} of {supplier.importQuotaKg.toLocaleString()} kg this year</span>
                <span className={`font-semibold ${tone.text}`}>{percent}%, {tone.label}</span>
            </div>
            <div
                className="mt-1 h-2 w-full bg-gray-200"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.min(percent, 100)}
                aria-label={`${supplier.name} quota used`}
            >
                <div className={`h-2 ${tone.bar}`} style={{ width: `${Math.min(percent, 100)}%` }} />
            </div>
        </div>
    );
}

function InfoCard({
    label,
    value,
    wide = false,
}: {
    label: string;
    value: string;
    wide?: boolean;
}) {
    return (
        <div className={wide ? 'sm:col-span-2 rounded-lg border border-gray-200 bg-white p-4' : 'rounded-lg border border-gray-200 bg-white p-4'}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{label}</p>
            <p className="mt-2 text-sm font-semibold text-gray-900">{value}</p>
        </div>
    );
}
