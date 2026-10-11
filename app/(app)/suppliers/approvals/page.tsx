'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
    useReorders,
    hevacrazApproveReorder,
    hevacrazRejectReorder,
    nouApproveReorder,
    nouRejectReorder,
} from '@/lib/api';
import type { SupplierReorder, ReorderStatus } from '@/lib/platformStore';

const STATUS_LABEL: Record<ReorderStatus, string> = {
    pending_hevacraz: 'Pending HEVACRAZ',
    pending_nou: 'Pending NOU',
    approved: 'Approved',
    rejected: 'Rejected',
};

const STATUS_STYLE: Record<ReorderStatus, string> = {
    pending_hevacraz: 'bg-amber-50 text-amber-700 border-amber-200',
    pending_nou: 'bg-blue-50 text-blue-700 border-blue-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-rose-50 text-rose-700 border-rose-200',
};

function formatDate(iso: string) {
    return new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

function Badge({ status }: { status: ReorderStatus }) {
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${STATUS_STYLE[status]}`}>
            {STATUS_LABEL[status]}
        </span>
    );
}

function RejectModal({
    reorderGas,
    onConfirm,
    onCancel,
}: {
    reorderGas: string;
    onConfirm: (reason: string) => void;
    onCancel: () => void;
}) {
    const [reason, setReason] = useState('');
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
                <h3 className="text-base font-semibold text-gray-900">Reject reorder: {reorderGas}</h3>
                <p className="mt-2 text-sm text-gray-500">Provide a reason. This will be visible to the vendor.</p>
                <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    rows={4}
                    placeholder="Rejection reason..."
                    className="mt-4 w-full border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <div className="mt-4 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (reason.trim()) onConfirm(reason.trim());
                        }}
                        disabled={!reason.trim()}
                        className="bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
                    >
                        Confirm rejection
                    </button>
                </div>
            </div>
        </div>
    );
}

function ConfirmModal({
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
                    <button type="button" onClick={onCancel} className="border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50">
                        Cancel
                    </button>
                    <button type="button" autoFocus onClick={onConfirm} className="bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ReorderRow({
    reorder,
    actions,
    note,
}: {
    reorder: SupplierReorder;
    actions?: React.ReactNode;
    note?: string;
}) {
    return (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-bold text-gray-900">{reorder.vendorName}</span>
                        <span className="text-sm font-semibold text-blue-700">{reorder.gasType}</span>
                        <span className="text-sm text-gray-600">{reorder.quantityKg} kg</span>
                        <span className="inline-flex border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                            {reorder.reorderType === 'recovery' ? 'Return of recovered gas' : 'Purchase of new stock'}
                        </span>
                        <Badge status={reorder.status} />
                    </div>
                    <p className="text-sm text-gray-600">{reorder.purpose}</p>
                    {reorder.supplierNotes && (
                        <p className="text-xs text-gray-400 italic">Note: {reorder.supplierNotes}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-xs text-gray-400 pt-1">
                        <span>Submitted {formatDate(reorder.createdAt)}</span>
                        {reorder.hevacrazReviewedAt && (
                            <span>HEVACRAZ reviewed {formatDate(reorder.hevacrazReviewedAt)}</span>
                        )}
                        {reorder.nouReviewedAt && (
                            <span>NOU reviewed {formatDate(reorder.nouReviewedAt)}</span>
                        )}
                    </div>
                    {note && (
                        <p className="mt-2 border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{note}</p>
                    )}
                    {reorder.status === 'rejected' && reorder.rejectionReason && (
                        <div className="mt-2 border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                            <span className="font-semibold">Rejected by {reorder.rejectedBy === 'hevacraz' ? 'HEVACRAZ' : 'NOU'}:</span> {reorder.rejectionReason}
                        </div>
                    )}
                </div>

                {actions && (
                    <div className="flex flex-wrap gap-2 shrink-0">
                        {actions}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ApprovalsPage() {
    const { user: session, isLoading } = useAuth();
    const { data: reorders, error } = useReorders();

    const [rejectTarget, setRejectTarget] = useState<{ id: string; gas: string; role: 'hevacraz' | 'nou' } | null>(null);
    const [acting, setActing] = useState(false);
    const [notice, setNotice] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
    const [confirmTarget, setConfirmTarget] = useState<{ reorder: SupplierReorder; stage: 'hevacraz' | 'nou' } | null>(null);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="h-8 w-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!session || session.role !== 'org_admin') {
        return (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
                Access restricted. This page is for admin reviewers only.
            </div>
        );
    }

    if (error) {
        return <div className="p-8 text-sm text-red-600">Failed to load. {error.message}</div>;
    }

    if (reorders === undefined) {
        return <div className="p-8 text-sm text-slate-500">Loading...</div>;
    }

    // Both workflow stages use the admin role, while the API enforces two distinct
    // human reviewers by comparing their account IDs between stages.

    async function run(action: () => Promise<unknown>, successText: string) {
        setActing(true);
        setNotice(null);
        try {
            await action();
            setNotice({ kind: 'success', text: successText });
        } catch (err) {
            setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'That action failed. Try again.' });
        } finally {
            setActing(false);
        }
    }

    async function handleConfirmApprove() {
        if (!confirmTarget) return;
        const { reorder, stage } = confirmTarget;
        setConfirmTarget(null);
        if (stage === 'hevacraz') {
            await run(() => hevacrazApproveReorder(reorder.id), `Approved ${reorder.quantityKg} kg of ${reorder.gasType} and sent it to NOU for the second review.`);
        } else {
            await run(() => nouApproveReorder(reorder.id), `Gave final approval to ${reorder.quantityKg} kg of ${reorder.gasType}. ${reorder.vendorName} has been notified.`);
        }
    }

    async function handleRejectConfirm(reason: string) {
        if (!rejectTarget) return;
        const target = rejectTarget;
        setRejectTarget(null);
        await run(
            () => (target.role === 'hevacraz' ? hevacrazRejectReorder(target.id, reason) : nouRejectReorder(target.id, reason)),
            `Rejected the ${target.gas} reorder. The vendor has been notified with your reason.`,
        );
    }

    const pendingHevacraz = reorders.filter(r => r.status === 'pending_hevacraz');
    const pendingNou = reorders.filter(r => r.status === 'pending_nou');
    const history = reorders.filter(r => r.status === 'approved' || r.status === 'rejected');

    return (
        <div className="space-y-8">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
                        Supplier Approvals
                    </p>
                    <h1 className="text-2xl font-bold text-gray-900">Gas Reorder Approvals</h1>
                    <p className="max-w-2xl text-sm leading-6 text-gray-600">
                        Review and approve vendor reorder requests across all stages.
                    </p>
                </div>
            </div>

            {notice && (
                <div
                    role={notice.kind === 'error' ? 'alert' : 'status'}
                    className={`flex items-start justify-between gap-4 border px-4 py-3 text-sm ${notice.kind === 'error' ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-emerald-300 bg-emerald-50 text-emerald-800'}`}
                >
                    <span>{notice.text}</span>
                    <button type="button" onClick={() => setNotice(null)} className="shrink-0 text-xs font-semibold underline">Dismiss</button>
                </div>
            )}

            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-base font-semibold text-gray-900">Pending HEVACRAZ review</h2>
                        <p className="mt-1 text-sm text-gray-500">{pendingHevacraz.length} request{pendingHevacraz.length !== 1 ? 's' : ''} awaiting your review</p>
                    </div>
                    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${pendingHevacraz.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                        {pendingHevacraz.length}
                    </span>
                </div>

                {pendingHevacraz.length === 0 ? (
                    <div className="mt-6 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
                        No pending requests at this stage.
                    </div>
                ) : (
                    <div className="mt-6 space-y-4">
                        {pendingHevacraz.map(reorder => (
                            <ReorderRow
                                key={reorder.id}
                                reorder={reorder}
                                actions={
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setConfirmTarget({ reorder, stage: 'hevacraz' })}
                                            disabled={acting}
                                            className="rounded-lg inline-flex items-center gap-1.5 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            Approve and send to NOU
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setRejectTarget({ id: reorder.id, gas: reorder.gasType, role: 'hevacraz' })}
                                            disabled={acting}
                                            className="rounded-lg inline-flex items-center gap-1.5 border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            Reject
                                        </button>
                                    </>
                                }
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-base font-semibold text-gray-900">Pending NOU review</h2>
                        <p className="mt-1 text-sm text-gray-500">{pendingNou.length} request{pendingNou.length !== 1 ? 's' : ''} approved by HEVACRAZ and awaiting NOU sign-off</p>
                    </div>
                    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${pendingNou.length > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                        {pendingNou.length}
                    </span>
                </div>

                {pendingNou.length === 0 ? (
                    <div className="mt-6 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
                        No requests awaiting NOU review at this time.
                    </div>
                ) : (
                    <div className="mt-6 space-y-4">
                        {pendingNou.map(reorder => {
                            const sameReviewer = reorder.hevacrazReviewerId === session.id;
                            return (
                            <ReorderRow
                                key={reorder.id}
                                reorder={reorder}
                                note={sameReviewer ? 'You gave the first approval. A different administrator must complete the NOU review, so the buttons are disabled for you.' : undefined}
                                actions={
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setConfirmTarget({ reorder, stage: 'nou' })}
                                            disabled={acting || sameReviewer}
                                            className="rounded-lg inline-flex items-center gap-1.5 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setRejectTarget({ id: reorder.id, gas: reorder.gasType, role: 'nou' })}
                                            disabled={acting || sameReviewer}
                                            className="rounded-lg inline-flex items-center gap-1.5 border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            Reject
                                        </button>
                                    </>
                                }
                            />
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-base font-semibold text-gray-900">Completed reorders</h2>
                <p className="mt-1 text-sm text-gray-500">{history.length} completed (approved + rejected) across all vendors</p>

                {history.length === 0 ? (
                    <div className="mt-6 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
                        No completed reorders yet.
                    </div>
                ) : (
                    <div className="mt-6 space-y-4">
                        {history.map(reorder => (
                            <ReorderRow key={reorder.id} reorder={reorder} />
                        ))}
                    </div>
                )}
            </div>

            {confirmTarget && (
                <ConfirmModal
                    title={confirmTarget.stage === 'hevacraz' ? 'Approve and send to NOU?' : 'Give final approval?'}
                    body={
                        confirmTarget.stage === 'hevacraz'
                            ? `${confirmTarget.reorder.vendorName} is asking for ${confirmTarget.reorder.quantityKg} kg of ${confirmTarget.reorder.gasType} (${confirmTarget.reorder.reorderType === 'recovery' ? 'return of recovered gas' : 'purchase of new stock'}). A different administrator must then give the NOU approval.`
                            : `This is the final approval for ${confirmTarget.reorder.quantityKg} kg of ${confirmTarget.reorder.gasType}. It counts toward national reporting and the vendor is notified.`
                    }
                    confirmLabel={confirmTarget.stage === 'hevacraz' ? 'Approve and send' : 'Give final approval'}
                    onConfirm={handleConfirmApprove}
                    onCancel={() => setConfirmTarget(null)}
                />
            )}

            {rejectTarget && (
                <RejectModal
                    reorderGas={rejectTarget.gas}
                    onConfirm={handleRejectConfirm}
                    onCancel={() => setRejectTarget(null)}
                />
            )}
        </div>
    );
}
