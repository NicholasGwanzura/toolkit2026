'use client';

import { useState } from 'react';
import { Clock3, CheckCircle2, XCircle } from 'lucide-react';
import type { RewardRedemption } from '@/types/index';

export function formatDate(value: string) {
    return new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium' }).format(new Date(value));
}

const STATUS = {
    requested: { label: 'Waiting for review', icon: Clock3, style: 'bg-amber-50 text-amber-700' },
    fulfilled: { label: 'Fulfilled', icon: CheckCircle2, style: 'bg-emerald-50 text-emerald-700' },
    rejected: { label: 'Not approved', icon: XCircle, style: 'bg-rose-50 text-rose-700' },
} as const;

export function StatusChip({ status }: { status: RewardRedemption['status'] }) {
    const { label, icon: Icon, style } = STATUS[status];
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${style}`}>
            <Icon className="h-3 w-3" aria-hidden="true" />
            {label}
        </span>
    );
}

/** Every request the person has made, newest first, with the reason when one was rejected. */
export function RedemptionHistory({ redemptions }: { redemptions: RewardRedemption[] }) {
    const [showAll, setShowAll] = useState(false);
    if (redemptions.length === 0) return null;
    const visible = showAll ? redemptions : redemptions.slice(0, 5);
    return (
        <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">My redemption requests</h2>
            <ul className="space-y-2">
                {visible.map(redemption => (
                    <li key={redemption.id} className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium text-gray-800">{redemption.rewardTitle}</span>
                            <StatusChip status={redemption.status} />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                            {redemption.pointsCost} points · requested {formatDate(redemption.requestedAt)}
                            {redemption.resolvedAt ? ` · decided ${formatDate(redemption.resolvedAt)}` : ''}
                        </p>
                        {redemption.status === 'rejected' && redemption.notes && (
                            <p className="mt-2 border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                                <span className="font-semibold">Reason:</span> {redemption.notes}. Your points are available again.
                            </p>
                        )}
                    </li>
                ))}
            </ul>
            {redemptions.length > 5 && (
                <button type="button" onClick={() => setShowAll(v => !v)} className="mt-3 text-xs font-semibold text-blue-700 underline">
                    {showAll ? 'Show fewer' : `Show all ${redemptions.length}`}
                </button>
            )}
        </section>
    );
}

/** Tells the person how far they are from a reward instead of just greying the button out. */
export function PointsHint({ available, cost, loading }: { available: number; cost: number; loading: boolean }) {
    if (loading) return <p className="text-xs text-gray-400">Checking your balance…</p>;
    if (available >= cost) return <p className="text-xs font-medium text-emerald-700">You have enough points</p>;
    const percent = Math.min(100, Math.round((available / cost) * 100));
    return (
        <div>
            <p className="text-xs text-gray-500">{cost - available} more points needed</p>
            <div className="mt-1 h-1.5 w-full bg-gray-200" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Progress toward this reward">
                <div className="h-1.5 bg-blue-500" style={{ width: `${percent}%` }} />
            </div>
        </div>
    );
}

export function ConfirmModal({
    title,
    body,
    confirmLabel,
    onConfirm,
    onCancel,
}: {
    title: string;
    body: string;
    confirmLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onKeyDown={e => { if (e.key === 'Escape') onCancel(); }}
        >
            <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
                <h3 className="text-base font-semibold text-gray-900">{title}</h3>
                <p className="mt-2 text-sm text-gray-600">{body}</p>
                <div className="mt-5 flex justify-end gap-3">
                    <button type="button" onClick={onCancel} className="border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                    <button type="button" autoFocus onClick={onConfirm} className="bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">{confirmLabel}</button>
                </div>
            </div>
        </div>
    );
}

export function ReasonModal({
    title,
    description,
    confirmLabel,
    onConfirm,
    onCancel,
}: {
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: (reason: string) => void;
    onCancel: () => void;
}) {
    const [reason, setReason] = useState('');
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onKeyDown={e => { if (e.key === 'Escape') onCancel(); }}
        >
            <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
                <h3 className="text-base font-semibold text-gray-900">{title}</h3>
                <p className="mt-2 text-sm text-gray-500">{description}</p>
                <textarea
                    autoFocus
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    rows={4}
                    aria-label="Reason"
                    className="mt-4 w-full border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <div className="mt-4 flex justify-end gap-3">
                    <button type="button" onClick={onCancel} className="border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                    <button type="button" disabled={reason.trim().length < 3} onClick={() => onConfirm(reason.trim())} className="bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
