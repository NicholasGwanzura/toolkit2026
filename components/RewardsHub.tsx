'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, Fuel, GraduationCap, Search, ShieldCheck, Wrench, type LucideIcon } from 'lucide-react';
import { useRewardSummary, useRewardRedemptions, createRewardRedemption, reviewRewardRedemption } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { TECHNICIAN_REWARDS, VENDOR_REWARDS } from '@/constants/rewards';
import { ConfirmModal, PointsHint, ReasonModal, RedemptionHistory, StatusChip, formatDate } from '@/components/rewards/Shared';
import type { RewardRedemption } from '@/types/index';

// A neutral icon per reward, instead of an unrelated stock photo loaded from another site.
const REWARD_ICONS: Record<string, LucideIcon> = { '1': Wrench, '2': Fuel, '3': ShieldCheck, '4': GraduationCap };

export default function RewardsHub({ adminView = false }: { adminView?: boolean }) {
  const { success, error: toastError } = useToast();
  const { data: summary } = useRewardSummary(undefined, !adminView);
  const { data: redemptions = [] } = useRewardRedemptions();
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const loadingBalance = summary === undefined;
  const currentPoints = summary?.availablePoints ?? 0;

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

  if (adminView) return <AdminRewards redemptions={redemptions} />;

  const confirming = TECHNICIAN_REWARDS.find(reward => reward.id === confirmId);

  return (
    <div className="space-y-8">
      <section className="overflow-hidden border border-gray-200 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white shadow-xl">
        <div className="relative p-8">
          <div className="absolute right-0 top-0 h-64 w-64 -translate-y-20 translate-x-20 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="relative z-10 flex flex-col items-center justify-between gap-8 md:flex-row md:text-left">
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-bold sm:text-3xl">Your Rewards Balance</h3>
              <p className="mt-2 text-gray-400">
                Earn points by passing exams, completing jobs, and logging responsible refrigerant handling.
              </p>
            </div>
            <div className="min-w-[180px] rounded-lg border border-white/10 bg-white/10 p-6 text-center backdrop-blur-md">
              <span className="text-4xl font-bold leading-none text-blue-400 sm:text-5xl" aria-live="polite">{loadingBalance ? '…' : currentPoints}</span>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Points Available</p>
              {summary && summary.reservedPoints > 0 && (
                <p className="mt-2 text-xs text-gray-300">{summary.reservedPoints} points are held for requests waiting for review</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">How to earn points</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {(summary?.breakdown ?? []).map(item => (
            <article key={item.label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <span className="inline-block rounded bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">+{item.pointsEach} pts each</span>
              <p className="mt-2 text-sm font-medium text-gray-700">{item.label}</p>
              <p className="mt-1 text-xs text-gray-500">{item.count} logged · {item.totalPoints} pts earned</p>
            </article>
          ))}
        </div>
      </section>

      <RedemptionHistory redemptions={redemptions} />

      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Redeem rewards</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TECHNICIAN_REWARDS.map((reward) => {
            const canRedeem = !loadingBalance && currentPoints >= reward.points;
            const Icon = REWARD_ICONS[reward.id] ?? ShieldCheck;
            return (
              <article key={reward.id} className="flex flex-col overflow-hidden border border-gray-200 bg-white transition-shadow hover:shadow-lg">
                <div className="flex h-28 items-center justify-center bg-gray-100 text-gray-500" aria-hidden="true">
                  <Icon className="h-10 w-10" />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">{reward.vendor}</span>
                  <h4 className="mt-1 leading-tight font-semibold text-gray-900">{reward.title}</h4>
                  <div className="mt-3"><PointsHint available={currentPoints} cost={reward.points} loading={loadingBalance} /></div>
                  <div className="mt-auto flex items-center justify-between pt-4">
                    <div className="text-lg font-bold text-gray-900">
                      {reward.points} <span className="text-xs font-medium uppercase text-gray-500">pts</span>
                    </div>
                    <button
                      disabled={!canRedeem || redeemingId === reward.id}
                      onClick={() => setConfirmId(reward.id)}
                      className={`inline-flex items-center gap-1 px-4 py-2 text-sm font-semibold transition-all ${
                        canRedeem ? 'bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50' : 'cursor-not-allowed bg-gray-100 text-gray-400'
                      }`}
                    >
                      {redeemingId === reward.id ? 'Requesting…' : 'Redeem'}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {confirming && (
        <ConfirmModal
          title={`Redeem ${confirming.title}?`}
          body={`This uses ${confirming.points} of your ${currentPoints} points. They are held while an administrator reviews the request. If it is not approved, they come back to you.`}
          confirmLabel="Request this reward"
          onConfirm={() => handleRedeem(confirming.id)}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  );
}

type QueueFilter = 'requested' | 'all';

function AdminRewards({ redemptions }: { redemptions: RewardRedemption[] }) {
  const { success, error: toastError } = useToast();
  const [filter, setFilter] = useState<QueueFilter>('requested');
  const [search, setSearch] = useState('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<RewardRedemption | null>(null);
  const [lookupUserId, setLookupUserId] = useState<string | null>(null);

  const counts = useMemo(() => ({
    pending: redemptions.filter(r => r.status === 'requested'),
    fulfilled: redemptions.filter(r => r.status === 'fulfilled').length,
    rejected: redemptions.filter(r => r.status === 'rejected').length,
  }), [redemptions]);
  const pendingPoints = counts.pending.reduce((sum, r) => sum + r.pointsCost, 0);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return redemptions
      .filter(r => filter === 'all' || r.status === 'requested')
      .filter(r => !q || r.userName.toLowerCase().includes(q) || r.userEmail.toLowerCase().includes(q) || r.rewardTitle.toLowerCase().includes(q));
  }, [redemptions, filter, search]);

  const review = async (redemption: RewardRedemption, action: 'approve' | 'reject', notes?: string) => {
    setReviewingId(redemption.id);
    setRejectTarget(null);
    try {
      await reviewRewardRedemption(redemption.id, action, notes);
      success(action === 'approve' ? `Fulfilled. ${redemption.userName} has been notified.` : `Rejected. ${redemption.userName} has been notified with your reason.`);
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Failed to update redemption.');
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OverviewCard label="Waiting for review" value={counts.pending.length} />
        <OverviewCard label="Points held by waiting requests" value={pendingPoints} />
        <OverviewCard label="Fulfilled, all time" value={counts.fulfilled} />
        <OverviewCard label="Rejected, all time" value={counts.rejected} />
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Redemption requests</h3>
            <p className="text-sm text-gray-500">From technicians, contractors and suppliers. The person is notified when you decide.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex border border-gray-200 text-sm" role="group" aria-label="Filter requests">
              {([['requested', 'Waiting'], ['all', 'All']] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value}
                  className={`px-3 py-1.5 font-semibold ${filter === value ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  {label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-600">
              <Search className="h-4 w-4" aria-hidden="true" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or reward" aria-label="Search requests" className="w-44 bg-transparent outline-none placeholder:text-gray-400" />
            </label>
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            {filter === 'requested' ? 'No requests are waiting for review.' : 'No requests match.'}
          </div>
        ) : (
          <ul className="space-y-3">
            {visible.map(redemption => (
              <li key={redemption.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">
                      {redemption.rewardTitle}
                      <span className="ml-2 inline-flex rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">{redemption.userRole}</span>
                    </p>
                    <p className="text-sm text-gray-500">
                      {redemption.userName} · {redemption.userEmail} · {redemption.pointsCost} pts · requested {formatDate(redemption.requestedAt)}
                    </p>
                    {redemption.status !== 'requested' && (
                      <p className="mt-1 text-xs text-gray-500">
                        <StatusChip status={redemption.status} /> {redemption.resolvedBy ? `by ${redemption.resolvedBy}` : ''} {redemption.resolvedAt ? `on ${formatDate(redemption.resolvedAt)}` : ''}
                        {redemption.notes ? `. Reason: ${redemption.notes}` : ''}
                      </p>
                    )}
                    <button type="button" onClick={() => setLookupUserId(lookupUserId === redemption.userId ? null : redemption.userId)} className="mt-2 text-xs font-semibold text-blue-700 underline">
                      {lookupUserId === redemption.userId ? 'Hide earnings' : 'View earnings'}
                    </button>
                    {lookupUserId === redemption.userId && <EarningsPanel userId={redemption.userId} />}
                  </div>
                  {redemption.status === 'requested' && (
                    <div className="flex shrink-0 gap-2">
                      <button onClick={() => review(redemption, 'approve')} disabled={reviewingId === redemption.id}
                        className="bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">Fulfil</button>
                      <button onClick={() => setRejectTarget(redemption)} disabled={reviewingId === redemption.id}
                        className="border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50">Reject</button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Reward catalogue</h3>
        <p className="text-sm text-gray-500">What people can currently redeem. Changing it needs a code change today.</p>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <CatalogueList title="Technician and contractor" items={TECHNICIAN_REWARDS.map(r => ({ id: r.id, title: r.title, sub: r.vendor, points: r.points }))} />
          <CatalogueList title="Supplier" items={VENDOR_REWARDS.map(r => ({ id: r.id, title: r.title, sub: r.detail, points: r.points }))} />
        </div>
      </section>

      {rejectTarget && (
        <ReasonModal
          title={`Reject ${rejectTarget.rewardTitle}`}
          description={`${rejectTarget.userName} will be told why, and their ${rejectTarget.pointsCost} points become available again.`}
          confirmLabel="Reject request"
          onConfirm={(reason) => review(rejectTarget, 'reject', reason)}
          onCancel={() => setRejectTarget(null)}
        />
      )}
    </div>
  );
}

function EarningsPanel({ userId }: { userId: string }) {
  const { data, error } = useRewardSummary(userId);
  if (error) return <p className="mt-2 text-xs text-rose-700">Could not load earnings: {error.message}</p>;
  if (!data) return <p className="mt-2 text-xs text-gray-500">Loading…</p>;
  return (
    <div className="mt-2 border border-gray-200 bg-white p-3 text-xs text-gray-700">
      <p className="font-semibold text-gray-900">{data.totalEarned} earned · {data.reservedPoints} held or spent · {data.availablePoints} available</p>
      <ul className="mt-2 space-y-0.5">
        {data.breakdown.map(item => (
          <li key={item.label} className="flex justify-between gap-4"><span>{item.label} ({item.count})</span><span>{item.totalPoints} pts</span></li>
        ))}
      </ul>
    </div>
  );
}

function CatalogueList({ title, items }: { title: string; items: Array<{ id: string; title: string; sub: string; points: number }> }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
      <ul className="space-y-2">
        {items.map(item => (
          <li key={item.id} className="flex items-center justify-between gap-3 border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="min-w-0"><p className="font-semibold text-gray-900">{item.title}</p><p className="text-sm text-gray-500">{item.sub}</p></div>
            <p className="shrink-0 text-lg font-bold text-gray-900">{item.points} <span className="text-xs font-medium uppercase text-gray-500">pts</span></p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OverviewCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900">{value}</p>
    </article>
  );
}
