'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
    useCourses,
    approveCourse,
    rejectCourse,
    unpublishCourse,
    getCourseMaterialDownloadUrl,
    type ManagedCourse,
} from '@/lib/platformStore';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { RichText } from '@/components/learn/RichText';
import { CheckCircle2, Download, FileText } from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string) {
    return new Intl.DateTimeFormat('en-ZW', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
}

// ---------------------------------------------------------------------------
// Review panel
// ---------------------------------------------------------------------------

function ReviewPanel({
    course,
    canAct,
    onClose,
    onApproved,
    onRejected,
}: {
    course: ManagedCourse;
    canAct: boolean;
    onClose: () => void;
    onApproved: (updated: ManagedCourse) => void;
    onRejected: (updated: ManagedCourse) => void;
}) {
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [notice, setNotice] = useState('');
    const [saving, setSaving] = useState(false);
    const questions = course.examQuestions ?? [];

    async function openFile(r2Key: string) {
        try {
            window.open(await getCourseMaterialDownloadUrl(course.id, r2Key), '_blank', 'noopener,noreferrer');
        } catch (err) {
            setNotice(err instanceof Error ? err.message : 'Could not open the file.');
        }
    }

    async function handleApprove() {
        setSaving(true);
        try {
            const updated = await approveCourse(course.id);
            onApproved(updated);
        } catch (err) {
            setNotice((err as Error).message);
        } finally {
            setSaving(false);
        }
    }

    async function handleReject() {
        if (!rejectReason.trim()) { setNotice('A rejection reason is required.'); return; }
        setSaving(true);
        try {
            const updated = await rejectCourse(course.id, rejectReason.trim());
            onRejected(updated);
        } catch (err) {
            setNotice((err as Error).message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-6 py-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Course Review</p>
                    <h2 className="mt-1 text-lg font-bold text-gray-900">{course.title}</h2>
                    <p className="mt-0.5 text-sm text-gray-500">
                        By {course.lecturerName} submitted {formatDate(course.updatedAt)}
                    </p>
                </div>
                <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-800">Close</button>
            </div>

            <div className="p-6 space-y-6">
                <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Description</p>
                    <p className="whitespace-pre-line break-words text-sm leading-6 text-gray-700">{course.description || <span className="italic text-gray-400">No description provided.</span>}</p>
                </div>

                <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                        Modules ({course.modules.length})
                    </p>
                    {course.modules.map((mod, i) => (
                        <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-gray-900">
                                    {i + 1}. {mod.title}
                                </p>
                                <span className="text-xs text-gray-400">{mod.minutes} min</span>
                            </div>
                            <RichText text={mod.content} />
                            {(mod.attachments ?? []).map(file => (
                                <button key={file.id} type="button" onClick={() => void openFile(file.r2Key)} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm text-gray-700 hover:border-blue-300 hover:text-blue-700">
                                    <span className="flex min-w-0 items-center gap-2"><FileText className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" /><span className="truncate">{file.fileName}</span></span>
                                    <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
                                </button>
                            ))}
                        </div>
                    ))}
                </div>

                <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                        Exam ({questions.length} question{questions.length === 1 ? '' : 's'}, pass mark {course.passMark}%)
                    </p>
                    {questions.length === 0 && (
                        <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">
                            This course has no exam questions, so it cannot be approved. Reject it with a note asking the trainer to add them.
                        </p>
                    )}
                    {questions.map((question, index) => (
                        <div key={question.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <p className="text-sm font-semibold text-gray-900">{index + 1}. {question.text}</p>
                            {question.type === 'written' ? (
                                <p className="mt-1 text-xs text-gray-500">Written answer, graded by the trainer.</p>
                            ) : (
                                <ul className="mt-2 space-y-1">
                                    {(question.options ?? []).map((option, optionIndex) => (
                                        <li key={optionIndex} className={`flex items-start gap-2 text-sm ${optionIndex === question.correctIndex ? 'font-semibold text-emerald-800' : 'text-gray-700'}`}>
                                            {optionIndex === question.correctIndex ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="Correct answer" /> : <span className="w-4 shrink-0" aria-hidden="true" />}
                                            {option}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}
                </div>

                {canAct && (
                    <div className="space-y-4 border-t border-gray-200 pt-5">
                        {!showRejectForm ? (
                            <div className="flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={handleApprove}
                                    disabled={saving || questions.length === 0}
                                    className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Approve
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowRejectForm(true)}
                                    className="min-h-11 rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                                >
                                    Reject
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                                    Rejection Reason (required)
                                </label>
                                <textarea
                                    value={rejectReason}
                                    onChange={e => setRejectReason(e.target.value)}
                                    rows={3}
                                    placeholder="Explain why this course is being rejected so the lecturer can revise it."
                                    className="rounded-lg w-full border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-400"
                                />
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        onClick={handleReject}
                                        disabled={saving}
                                        className="min-h-11 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                                    >
                                        Confirm Rejection
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setShowRejectForm(false); setRejectReason(''); }}
                                        className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                        {notice && (
                            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">{notice}</div>
                        )}
                    </div>
                )}


            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Return an approved course for correction
// ---------------------------------------------------------------------------

function ReturnPanel({ course, onClose }: { course: ManagedCourse; onClose: () => void }) {
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState('');

    async function handleReturn() {
        if (!reason.trim()) { setNotice('A reason is required.'); return; }
        setBusy(true);
        try {
            await unpublishCourse(course.id, reason.trim());
            onClose();
        } catch (err) {
            setNotice(err instanceof Error ? err.message : 'Could not return this course.');
            setBusy(false);
        }
    }

    return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 space-y-3">
            <p className="text-sm font-semibold text-gray-900">Return &quot;{course.title}&quot; for correction</p>
            <p className="text-xs text-gray-600">
                The course leaves the catalogue and goes back to {course.lecturerName} to edit and resubmit. Existing exam submissions are kept.
            </p>
            <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
                placeholder="What needs to be corrected?"
            />
            {notice && <p className="text-xs text-red-600">{notice}</p>}
            <div className="flex gap-2">
                <button onClick={handleReturn} disabled={busy} className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
                    {busy ? 'Returning...' : 'Return for correction'}
                </button>
                <button onClick={onClose} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700">Cancel</button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function LearnApprovalsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const { data: allCourses, error } = useCourses();

    const [selected, setSelected] = useState<ManagedCourse | null>(null);
    const [returning, setReturning] = useState<ManagedCourse | null>(null);
    const [outcome, setOutcome] = useState('');

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="h-8 w-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!user || user.role !== 'org_admin') {
        router.replace('/dashboard');
        return null;
    }

    if (error) {
        return <div className="p-8 text-sm text-red-600">Failed to load. {error.message}</div>;
    }

    if (allCourses === undefined) {
        return <div className="p-8 text-sm text-slate-500">Loading...</div>;
    }

    const courses = allCourses.filter(c => c.status === 'pending_nou');
    const approvedCourses = allCourses.filter(c => c.status === 'approved');
    const canAct = true;

    function handleApproved(updated: ManagedCourse) {
        setOutcome(`"${updated.title}" is approved and live for learners. ${updated.lecturerName} has been told.`);
        setSelected(null);
    }

    function handleRejected(updated: ManagedCourse) {
        setOutcome(`"${updated.title}" went back to ${updated.lecturerName} with your reason.`);
        setSelected(null);
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Course Approvals</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Review trainer and lecturer course submissions. Approve or reject with a mandatory reason.
                </p>
            </div>

            {outcome && (
                <div role="status" className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
                    <span>{outcome}</span>
                    <button type="button" onClick={() => setOutcome('')} className="shrink-0 font-semibold underline">Dismiss</button>
                </div>
            )}

            {selected && (
                <ReviewPanel
                    course={selected}
                    canAct={canAct}
                    onClose={() => setSelected(null)}
                    onApproved={handleApproved}
                    onRejected={handleRejected}
                />
            )}

            <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-x-auto">
                <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                        Pending Review {courses.length} course{courses.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Course Title</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Lecturer</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Submitted</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Modules</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Status</th>
                            <th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {courses.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                                    No courses are waiting for review.
                                </td>
                            </tr>
                        )}
                        {courses.map(course => (
                            <tr key={course.id} className="hover:bg-gray-50 transition">
                                <td className="px-4 py-3 font-medium text-gray-900">{course.title}</td>
                                <td className="px-4 py-3 text-gray-600">{course.lecturerName}</td>
                                <td className="px-4 py-3 text-gray-500">{formatDate(course.updatedAt)}</td>
                                <td className="px-4 py-3 text-gray-600">{course.modules.length}</td>
                                <td className="px-4 py-3">
                                    <StatusBadge status="pending" label="Awaiting approval" />
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button
                                        onClick={() => { setOutcome(''); setSelected(course); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                        className="text-sm font-semibold text-blue-600 hover:underline"
                                    >
                                        Review
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {returning && <ReturnPanel course={returning} onClose={() => setReturning(null)} />}

            <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-x-auto">
                <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                        Approved {approvedCourses.length} course{approvedCourses.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <table className="w-full text-sm">
                    <thead className="sr-only">
                        <tr><th>Course title</th><th>Lecturer</th><th>Approved</th><th>Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {approvedCourses.length === 0 && (
                            <tr>
                                <td className="px-4 py-8 text-center text-sm text-gray-400">No approved courses yet.</td>
                            </tr>
                        )}
                        {approvedCourses.map(course => (
                            <tr key={course.id} className="hover:bg-gray-50 transition">
                                <td className="px-4 py-3 font-medium text-gray-900">{course.title}</td>
                                <td className="px-4 py-3 text-gray-600">{course.lecturerName}</td>
                                <td className="px-4 py-3 text-gray-500">{formatDate(course.updatedAt)}</td>
                                <td className="px-4 py-3 text-right">
                                    <button
                                        onClick={() => setReturning(course)}
                                        className="text-sm font-semibold text-amber-700 hover:underline"
                                    >
                                        Return for correction
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
