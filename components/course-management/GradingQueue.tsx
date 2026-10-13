'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, Clock, Search } from 'lucide-react';
import { Button } from '@/components/base/buttons/button';
import { Pagination } from '@/components/base/pagination/pagination';
import { SegmentedControl, SegmentedControlItem } from '@/components/base/segmented-control/segmented-control';
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@/components/base/table/table';
import { gradeExamSubmission, useCourses, useExamSubmissions } from '@/lib/api';
import type { ExamSubmission } from '@/lib/platformStore';
import { Dialog } from './Dialog';

const PAGE_SIZE = 10;
type Filter = 'pending' | 'graded' | 'all';
const formatDate = (iso: string) => new Intl.DateTimeFormat('en-ZW', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));

export function GradingQueue() {
  const { data: submissions, error, isLoading } = useExamSubmissions();
  const { data: courses } = useCourses();
  const [filter, setFilter] = useState<Filter>('pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<ExamSubmission | null>(null);

  const passMarks = useMemo(() => new Map((courses ?? []).map((course) => [course.id, course.passMark])), [courses]);
  const mine = useMemo(() => (submissions ?? []).filter((item) => passMarks.has(item.courseId)), [submissions, passMarks]);
  const counts = useMemo(() => ({ pending: mine.filter((s) => s.status === 'pending').length, graded: mine.filter((s) => s.status === 'graded').length, all: mine.length }), [mine]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return mine
      .filter((item) => filter === 'all' || item.status === filter)
      .filter((item) => !term || `${item.studentName} ${item.courseTitle}`.toLowerCase().includes(term))
      // Oldest waiting first, so nobody is left until last. Graded work shows newest first.
      .sort((a, b) => (filter === 'graded' ? new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime() : new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()));
  }, [mine, filter, search]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const rows = visible.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  if (error) return <p role="alert" className="border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Could not load exam submissions: {error.message}</p>;
  if (isLoading || !submissions) return <p className="p-4 text-sm text-stone-500">Loading submissions…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl aria-label="Filter submissions" selectedKeys={[filter]} onSelectionChange={(keys) => { const next = [...keys][0] as Filter | undefined; if (next) { setFilter(next); setPage(1); } }}>
          <SegmentedControlItem id="pending">To grade {counts.pending}</SegmentedControlItem>
          <SegmentedControlItem id="graded">Graded {counts.graded}</SegmentedControlItem>
          <SegmentedControlItem id="all">All {counts.all}</SegmentedControlItem>
        </SegmentedControl>
        <label className="relative block sm:w-64">
          <span className="sr-only">Search by learner or course</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search learner or course" className="min-h-10 w-full rounded-lg border border-stone-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#D97706] focus:ring-2 focus:ring-[#D97706]/20" />
        </label>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 px-6 py-12 text-center">
          <ClipboardCheck className="mx-auto h-9 w-9 text-stone-300" aria-hidden="true" />
          <p className="mt-3 font-semibold text-stone-800">{filter === 'pending' && counts.pending === 0 ? 'Nothing is waiting to be graded.' : 'No submissions match.'}</p>
          <p className="mt-1 text-sm text-stone-600">Learners appear here when they submit an exam for one of your approved courses.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
          <Table aria-label="Exam submissions" onRowAction={(key) => setOpen(rows.find((item) => item.id === String(key)) ?? null)}>
            <TableHeader>
              <TableColumn isRowHeader>Learner</TableColumn>
              <TableColumn>Course</TableColumn>
              <TableColumn>Submitted</TableColumn>
              <TableColumn>Result</TableColumn>
              <TableColumn>{' '}</TableColumn>
            </TableHeader>
            <TableBody>
              {rows.map((item) => (
                <TableRow key={item.id} id={item.id} textValue={`${item.studentName}, ${item.courseTitle}`} className="cursor-pointer hover:bg-stone-50">
                  <TableCell><span className="font-semibold text-stone-900">{item.studentName}</span></TableCell>
                  <TableCell><span className="block max-w-xs truncate text-sm text-stone-700">{item.courseTitle}</span></TableCell>
                  <TableCell><span className="whitespace-nowrap text-xs text-stone-600">{formatDate(item.submittedAt)}</span></TableCell>
                  <TableCell>
                    {item.status === 'graded'
                      ? <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${item.passed ? 'text-emerald-700' : 'text-rose-700'}`}><CheckCircle2 className="h-4 w-4" aria-hidden="true" />{item.score}%, {item.passed ? 'passed' : 'not passed'}</span>
                      : <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700"><Clock className="h-4 w-4" aria-hidden="true" />Waiting</span>}
                  </TableCell>
                  <TableCell><span className="text-sm font-semibold text-[#b45309]">{item.status === 'graded' ? 'View' : 'Grade'}</span></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {pageCount > 1 && <div className="border-t border-stone-200 p-3"><Pagination page={current} totalPages={pageCount} onChange={setPage} aria-label="Submission pages" /></div>}
        </div>
      )}

      {open && <GradeDialog submission={open} passMark={passMarks.get(open.courseId) ?? 70} onClose={() => setOpen(null)} />}
    </div>
  );
}

function GradeDialog({ submission, passMark, onClose }: { submission: ExamSubmission; passMark: number; onClose: () => void }) {
  const alreadyGraded = submission.status === 'graded';
  const [score, setScore] = useState(String(submission.score ?? ''));
  const [feedback, setFeedback] = useState(submission.feedback ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const numeric = Number(score);
  const valid = score.trim() !== '' && Number.isFinite(numeric) && numeric >= 0 && numeric <= 100;
  const passed = valid && numeric >= passMark;

  const save = async () => {
    if (!valid) return;
    setBusy(true);
    setError('');
    try {
      await gradeExamSubmission(submission.id, { score: numeric, passed, feedback: feedback.trim() });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the grade.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog isOpen onOpenChange={(isOpen) => { if (!isOpen) onClose(); }} size="lg" title={submission.studentName} description={`${submission.courseTitle}. Submitted ${formatDate(submission.submittedAt)}.`}>
      <div className="space-y-5">
        <section aria-label="Answers" className="space-y-2">
          <h3 className="text-sm font-semibold text-stone-900">Answers ({submission.answers.length})</h3>
          {submission.answers.map((entry, index) => (
            <div key={index} className="rounded-lg border border-stone-200 bg-stone-50 p-3">
              <p className="text-sm font-semibold text-stone-800">{index + 1}. {entry.question}</p>
              <p className="mt-1 whitespace-pre-line text-sm text-stone-700">{entry.answer}</p>
            </div>
          ))}
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="grade-score" className="text-sm font-medium text-stone-800">Score (0 to 100)</label>
            <input id="grade-score" type="number" inputMode="decimal" min={0} max={100} value={score} disabled={alreadyGraded} onChange={(e) => setScore(e.target.value)} className="min-h-11 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#D97706] focus:ring-2 focus:ring-[#D97706]/20 disabled:bg-stone-50" />
          </div>
          <div>
            <p className="text-sm font-medium text-stone-800">Result (pass mark {passMark}%)</p>
            <p className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${!valid ? 'bg-stone-100 text-stone-500' : passed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{!valid ? 'Enter a score' : passed ? 'Pass' : 'Not passed'}</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="grade-feedback" className="text-sm font-medium text-stone-800">Feedback for the learner</label>
          <textarea id="grade-feedback" rows={3} value={feedback} disabled={alreadyGraded} onChange={(e) => setFeedback(e.target.value)} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#D97706] focus:ring-2 focus:ring-[#D97706]/20 disabled:bg-stone-50" />
        </div>
        {error && <p role="alert" className="text-sm font-medium text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-stone-200 pt-4">
          <Button variant="secondary" onClick={onClose}>{alreadyGraded ? 'Close' : 'Cancel'}</Button>
          {!alreadyGraded && <Button disabled={!valid || busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save grade'}</Button>}
        </div>
        {!alreadyGraded && <p className="text-xs text-stone-500">The learner is told their score and result. A grade cannot be changed once saved.</p>}
      </div>
    </Dialog>
  );
}
