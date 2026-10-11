'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Award, CheckCircle2, FileBadge2, Gift, ShieldCheck } from 'lucide-react';
import { useSupplierComplianceApplications, useRewardSummary, useRewardRedemptions, createRewardRedemption } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { VENDOR_REWARDS } from '@/constants/rewards';
import { ConfirmModal, PointsHint, RedemptionHistory } from '@/components/rewards/Shared';
import type { UserSession } from '@/lib/auth';

function formatDate(value: string) {
    return new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium' }).format(new Date(value));
}

export default function VendorRewardsPanel({ session }: { session: UserSession }) {
    const { success, error: toastError } = useToast();
    const { data: allComplianceApplications = [] } = useSupplierComplianceApplications();
    const { data: summary } = useRewardSummary();
    const { data: redemptions = [] } = useRewardRedemptions();
    const [redeemingId, setRedeemingId] = useState<string | null>(null);
    const [confirmId, setConfirmId] = useState<string | null>(null);

    const supplierComplianceApplications = useMemo(() => {
        return allComplianceApplications.filter(entry => entry.supplierEmail === session.email);
    }, [allComplianceApplications, session.email]);

    const loadingBalance = summary === undefined;
    const availablePoints = summary?.availablePoints ?? 0;
    const confirming = VENDOR_REWARDS.find(reward => reward.id === confirmId);

    const handleRedeem = async (rewardId: string) => {
        setConfirmId(null);
        setRedeemingId(rewardId);
        try {
            await createRewardRedemption(rewardId);
            success('Redemption requested. An administrator will review it, and you will be notified.');
        } catch (e) {
            toastError(e instanceof Error ? e.message : 'Failed to submit redemption request.');
        } finally {
            setRedeemingId(null);
        }
    };

    return (
        <div className="space-y-8">
            <section className="overflow-hidden border border-gray-200 bg-gradient-to-br from-[#1f2937] via-[#111827] to-[#0f172a] text-white shadow-xl">
                <div className="p-8">
                    <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">
                                Vendor rewards
                            </p>
                            <h2 className="mt-3 text-3xl font-bold">Compliance Rewards Balance</h2>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                                Vendors earn points for filing sales to the NOU, sharing compliant delivery records
                                with registered technicians, and completing supplier compliance applications.
                            </p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-white/10 p-6 text-center backdrop-blur">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">Available points</p>
                            <p className="mt-3 text-5xl font-bold text-emerald-300" aria-live="polite">{loadingBalance ? '…' : availablePoints}</p>
                            {summary && summary.reservedPoints > 0 && (
                                <p className="mt-2 text-xs text-slate-300">{summary.reservedPoints} points are held for requests waiting for review</p>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {(summary?.breakdown ?? []).map(item => (
                    <MetricCard
                        key={item.label}
                        label={item.label}
                        value={item.count}
                        hint={`${item.pointsEach} pts each · ${item.totalPoints} pts earned`}
                        icon={item.label.startsWith('Compliant') ? ShieldCheck : item.label.startsWith('Approved') ? CheckCircle2 : FileBadge2}
                    />
                ))}
            </section>

            <RedemptionHistory redemptions={redemptions} />

            <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                <article className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Available vendor rewards</h3>
                            <p className="text-sm text-gray-500">Rewards unlocked by compliant supply-chain behaviour</p>
                        </div>
                        <Award className="h-5 w-5 text-gray-300" />
                    </div>

                    <div className="space-y-3">
                        {VENDOR_REWARDS.map((reward) => {
                            const canRedeem = !loadingBalance && availablePoints >= reward.points;
                            return (
                                <div key={reward.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-gray-900">{reward.title}</p>
                                            <p className="mt-1 text-sm text-gray-500">{reward.detail}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-bold text-gray-900">{reward.points}</p>
                                            <p className="text-xs uppercase tracking-[0.18em] text-gray-400">points</p>
                                        </div>
                                    </div>
                                    <div className="mt-3"><PointsHint available={availablePoints} cost={reward.points} loading={loadingBalance} /></div>
                                    <button
                                        disabled={!canRedeem || redeemingId === reward.id}
                                        onClick={() => setConfirmId(reward.id)}
                                        className={`mt-3 inline-flex items-center gap-1 px-4 py-2 text-sm font-semibold transition-all ${
                                            canRedeem
                                                ? 'bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50'
                                                : 'cursor-not-allowed bg-gray-100 text-gray-400'
                                        }`}
                                    >
                                        {redeemingId === reward.id ? 'Requesting…' : 'Redeem'}
                                        <Gift className="h-4 w-4" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </article>

                <article className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Compliance milestones</h3>
                            <p className="text-sm text-gray-500">Recent filings and certificate requests tied to your supplier account</p>
                        </div>
                        <Link
                            href="/supplier-compliance"
                            className="rounded-lg inline-flex items-center gap-2 border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                            Open compliance module
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {supplierComplianceApplications.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                                No supplier certificate applications yet. Submit one from the compliance module to start earning certificate rewards.
                            </div>
                        ) : (
                            supplierComplianceApplications.slice(0, 3).map((application) => (
                                <div key={application.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-gray-900">{application.certificateType.replace(/-/g, ' ')}</p>
                                            <p className="mt-1 text-sm text-gray-500">
                                                Coverage {application.monthCoverage} · {formatDate(application.submittedAt)}
                                            </p>
                                        </div>
                                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700">
                                            {application.status.replace(/-/g, ' ')}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </article>
            </section>
            {confirming && (
                <ConfirmModal
                    title={`Redeem ${confirming.title}?`}
                    body={`This uses ${confirming.points} of your ${availablePoints} points. They are held while an administrator reviews the request. If it is not approved, they come back to you.`}
                    confirmLabel="Request this reward"
                    onConfirm={() => handleRedeem(confirming.id)}
                    onCancel={() => setConfirmId(null)}
                />
            )}
        </div>
    );
}

function MetricCard({
    label,
    value,
    hint,
    icon: Icon,
}: {
    label: string;
    value: number;
    hint: string;
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
            <p className="mt-4 text-xs uppercase tracking-[0.16em] text-gray-400">{hint}</p>
        </article>
    );
}
