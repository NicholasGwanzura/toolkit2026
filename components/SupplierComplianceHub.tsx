'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, FileBadge2, Send, ShieldCheck } from 'lucide-react';
import { useSupplierComplianceApplications, createSupplierComplianceApplication } from '@/lib/api';
import type { SupplierComplianceApplication, SupplierRegistration } from '@/types/index';
import type { UserSession } from '@/lib/auth';

type FormState = {
    certificateType: SupplierComplianceApplication['certificateType'];
    monthCoverage: string;
    sitesCovered: string;
    supportingSummary: string;
};

function formatDate(value: string) {
    return new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium' }).format(new Date(value));
}

export default function SupplierComplianceHub({
    session,
    application,
}: {
    session: UserSession;
    application?: SupplierRegistration;
}) {
    const { data: allApplications = [] } = useSupplierComplianceApplications();
    const [notice, setNotice] = useState('');
    const [form, setForm] = useState<FormState>({
        certificateType: 'distribution-compliance',
        monthCoverage: new Date().toISOString().slice(0, 7),
        sitesCovered: '3',
        supportingSummary: '',
    });

    const supplierApplications = useMemo(() => {
        return allApplications.filter(entry => entry.supplierEmail === session.email);
    }, [allApplications, session.email]);

    const supplierName =
        application?.tradingName ||
        application?.companyName ||
        session.name;

    const summary = useMemo(() => ({
        submitted: supplierApplications.filter(entry => entry.status === 'submitted').length,
        underReview: supplierApplications.filter(entry => entry.status === 'under-review').length,
        approved: supplierApplications.filter(entry => entry.status === 'approved').length,
    }), [supplierApplications]);

    const submitApplication = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!form.monthCoverage || !form.sitesCovered || !form.supportingSummary.trim()) {
            setNotice('Complete the coverage period, site count, and support summary before submitting.');
            return;
        }

        await createSupplierComplianceApplication({
            certificateType: form.certificateType,
            monthCoverage: form.monthCoverage,
            sitesCovered: Number(form.sitesCovered),
            contactPerson: application?.contactName ?? session.name,
            supportingSummary: form.supportingSummary.trim(),
            notes: 'Submitted from supplier compliance module.',
        });

        setNotice(`Certificate request submitted for ${form.monthCoverage}.`);
        setForm((current) => ({
            ...current,
            sitesCovered: '3',
            supportingSummary: '',
        }));
    };

    return (
        <div className="space-y-6">
            <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                            Supplier compliance
                        </p>
                        <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                            Apply for a Supplier Certificate of Compliance
                        </h1>
                        <p className="mt-2 text-sm leading-6 text-gray-600">
                            Submit your monthly distribution evidence, reporting notes, and site coverage
                            so the compliance team can review and issue your supplier certificate.
                        </p>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
                <SummaryCard label="Submitted" value={summary.submitted} icon={Send} />
                <SummaryCard label="Under Review" value={summary.underReview} icon={FileBadge2} />
                <SummaryCard label="Approved" value={summary.approved} icon={CheckCircle2} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <form onSubmit={submitApplication} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2 text-sm">
                            <span className="font-semibold text-gray-700">Certificate type</span>
                            <select
                                value={form.certificateType}
                                onChange={(event) => setForm((current) => ({ ...current, certificateType: event.target.value as SupplierComplianceApplication['certificateType'] }))}
                                className="w-full border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="distribution-compliance">Distribution compliance</option>
                                <option value="nou-reporting">NOU reporting</option>
                                <option value="traceability-audit">Traceability audit</option>
                            </select>
                        </label>
                        <label className="space-y-2 text-sm">
                            <span className="font-semibold text-gray-700">Coverage month</span>
                            <input
                                type="month"
                                value={form.monthCoverage}
                                onChange={(event) => setForm((current) => ({ ...current, monthCoverage: event.target.value }))}
                                className="w-full border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </label>
                        <label className="space-y-2 text-sm">
                            <span className="font-semibold text-gray-700">Sites covered</span>
                            <input
                                type="number"
                                min="1"
                                value={form.sitesCovered}
                                onChange={(event) => setForm((current) => ({ ...current, sitesCovered: event.target.value }))}
                                className="w-full border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </label>
                        <div className="border border-gray-200 bg-gray-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Applicant</p>
                            <p className="mt-2 text-sm font-semibold text-gray-900">{supplierName}</p>
                            <p className="mt-1 text-xs text-gray-500">{application?.contactName ?? session.name}</p>
                        </div>
                        <label className="space-y-2 text-sm md:col-span-2">
                            <span className="font-semibold text-gray-700">Supporting summary</span>
                            <textarea
                                rows={5}
                                value={form.supportingSummary}
                                onChange={(event) => setForm((current) => ({ ...current, supportingSummary: event.target.value }))}
                                placeholder="Summarize distribution controls, linked technician deliveries, NOU filing completion, and any discrepancies resolved."
                                className="w-full border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </label>
                    </div>

                    <button
                        type="submit"
                        className="mt-5 inline-flex items-center gap-2 bg-[#B45309] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                    >
                        <ShieldCheck className="h-4 w-4" />
                        Submit Certificate Request
                    </button>

                    {notice && (
                        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                            {notice}
                        </div>
                    )}
                </form>

                <aside className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900">Recent supplier applications</h2>
                    <p className="mt-1 text-sm text-gray-500">Your latest certificate requests and review status.</p>

                    <div className="mt-4 space-y-3">
                        {supplierApplications.length === 0 ? (
                            <div className="border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                                No certificate requests have been submitted yet.
                            </div>
                        ) : (
                            supplierApplications.map((entry) => (
                                <div key={entry.id} className="border border-gray-200 bg-gray-50 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-gray-900">{entry.certificateType.replace(/-/g, ' ')}</p>
                                            <p className="mt-1 text-sm text-gray-500">
                                                {entry.monthCoverage} · {entry.sitesCovered} sites
                                            </p>
                                        </div>
                                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700">
                                            {entry.status.replace(/-/g, ' ')}
                                        </span>
                                    </div>
                                    <p className="mt-3 text-sm text-gray-600">{entry.supportingSummary}</p>
                                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-gray-400">
                                        Submitted {formatDate(entry.submittedAt)}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </aside>
            </section>
        </div>
    );
}

function SummaryCard({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: number;
    icon: typeof ShieldCheck;
}) {
    return (
        <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm text-gray-500">{label}</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
                </div>
                <div className="bg-slate-50 p-3 text-slate-700">
                    <Icon className="h-5 w-5" />
                </div>
            </div>
        </article>
    );
}
