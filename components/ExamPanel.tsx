'use client';

import { useState } from 'react';
import { CheckCircle2, Clock, GraduationCap, XCircle } from 'lucide-react';
import { Button } from '@/components/base/buttons/button';
import { Dialog } from '@/components/course-management/Dialog';
import { submitCourseExam, useCourseExam, type CourseExamResult } from '@/lib/api';
import type { SubmittedAnswer } from '@/lib/exam';

/** The exam on a course card: where the learner stands, and the dialog for taking it. */
export function ExamPanel({ courseId, enrolled }: { courseId: string; enrolled: boolean }) {
  const { data: exam, error } = useCourseExam(courseId, enrolled);
  const [open, setOpen] = useState(false);

  if (!enrolled) return null;
  if (error) return <p role="alert" className="mt-3 text-xs text-red-600">Could not load the exam: {error.message}</p>;
  if (!exam || !exam.hasExam) return null;

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <GraduationCap className="h-4 w-4 text-gray-500" aria-hidden="true" />
          <span className="font-semibold text-gray-900">Exam</span>
          {exam.passed && <span className="inline-flex items-center gap-1 font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Passed{exam.last?.score !== undefined ? `, ${exam.last.score}%` : ''}</span>}
          {!exam.passed && exam.waitingForGrading && <span className="inline-flex items-center gap-1 font-semibold text-amber-700"><Clock className="h-4 w-4" aria-hidden="true" />Waiting for your trainer to grade it</span>}
          {!exam.passed && !exam.waitingForGrading && exam.last?.status === 'graded' && <span className="inline-flex items-center gap-1 font-semibold text-rose-700"><XCircle className="h-4 w-4" aria-hidden="true" />Last result {exam.last.score}%, pass mark {exam.passMark}%</span>}
        </div>
        {exam.canAttempt && <Button onClick={() => setOpen(true)}>{exam.last ? `Try again (${exam.attemptsLeft} left)` : 'Take the exam'}</Button>}
      </div>
      {!exam.passed && !exam.waitingForGrading && exam.attemptsLeft === 0 && <p className="mt-2 text-xs text-gray-600">You have used all {exam.maxAttempts} attempts. Ask your trainer or HEVACRAZ to reset it.</p>}
      {!exam.canAttempt && !exam.passed && !exam.waitingForGrading && exam.attemptsLeft > 0 && <p className="mt-2 text-xs text-gray-600">Finish the modules, then take the exam when you are ready.</p>}
      {exam.last?.feedback && exam.last.feedback !== 'Marked automatically.' && <p className="mt-2 text-xs text-gray-700"><span className="font-semibold">Trainer feedback:</span> {exam.last.feedback}</p>}
      {open && <ExamDialog courseId={courseId} onClose={() => setOpen(false)} />}
    </div>
  );
}

function ExamDialog({ courseId, onClose }: { courseId: string; onClose: () => void }) {
  const { data: exam } = useCourseExam(courseId);
  const [choices, setChoices] = useState<Record<string, number>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CourseExamResult | null>(null);

  const questions = exam?.questions ?? [];
  const answered = questions.filter((q) => (q.type === 'choice' ? choices[q.id] !== undefined : (texts[q.id] ?? '').trim() !== '')).length;
  const complete = questions.length > 0 && answered === questions.length;

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const answers: SubmittedAnswer[] = questions.map((q) => (q.type === 'choice' ? { questionId: q.id, choice: choices[q.id] } : { questionId: q.id, text: texts[q.id] }));
      setResult(await submitCourseExam(courseId, answers));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit your answers.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog isOpen onOpenChange={(isOpen) => { if (!isOpen && !busy) onClose(); }} size="lg" title={exam?.courseTitle ? `${exam.courseTitle}: exam` : 'Exam'} description={exam ? `Pass mark ${exam.passMark}%. You have ${exam.attemptsLeft} attempt${exam.attemptsLeft === 1 ? '' : 's'} left.` : undefined}>
      {result ? (
        <div className="space-y-4 py-2 text-center">
          {result.status === 'graded' ? (
            <>
              {result.passed ? <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden="true" /> : <XCircle className="mx-auto h-12 w-12 text-rose-600" aria-hidden="true" />}
              <p className="text-2xl font-bold text-gray-900" role="status">{result.score}%</p>
              <p className="text-sm text-gray-700">{result.passed ? 'You passed this exam. Your trainer can now put you forward for a certificate.' : `You did not reach the pass mark of ${result.passMark}%. Review the modules and try again.`}</p>
            </>
          ) : (
            <>
              <Clock className="mx-auto h-12 w-12 text-amber-600" aria-hidden="true" />
              <p className="text-lg font-semibold text-gray-900" role="status">Submitted for grading</p>
              <p className="text-sm text-gray-700">This exam has written answers, so your trainer reads it before you get a result. You will be notified.</p>
            </>
          )}
          <Button onClick={onClose}>Close</Button>
        </div>
      ) : !exam ? (
        <p className="py-6 text-center text-sm text-gray-500">Loading the exam…</p>
      ) : questions.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-700">There is nothing to answer right now. {exam.waitingForGrading ? 'Your last submission is waiting to be graded.' : exam.passed ? 'You have already passed.' : ''}</p>
      ) : (
        <form onSubmit={(event) => { event.preventDefault(); if (complete) void submit(); }} className="space-y-6">
          {questions.map((question, index) => (
            <fieldset key={question.id} className="space-y-2">
              <legend className="text-sm font-semibold text-gray-900">{index + 1}. {question.text}</legend>
              {question.type === 'choice' ? (
                <div className="space-y-1.5">
                  {(question.options ?? []).map((option, optionIndex) => (
                    <label key={optionIndex} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition ${choices[question.id] === optionIndex ? 'border-[#D97706] bg-amber-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                      <input type="radio" name={`q-${question.id}`} checked={choices[question.id] === optionIndex} onChange={() => setChoices((current) => ({ ...current, [question.id]: optionIndex }))} className="h-4 w-4 accent-[#D97706]" />
                      {option}
                    </label>
                  ))}
                </div>
              ) : (
                <textarea rows={4} value={texts[question.id] ?? ''} onChange={(e) => setTexts((current) => ({ ...current, [question.id]: e.target.value }))} aria-label={`Answer to question ${index + 1}`} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#D97706] focus:ring-2 focus:ring-[#D97706]/20" />
              )}
            </fieldset>
          ))}
          {error && <p role="alert" className="text-sm font-medium text-rose-700">{error}</p>}
          <div className="flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-600" aria-live="polite">{answered} of {questions.length} answered</p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
              <Button type="submit" disabled={!complete || busy}>{busy ? 'Submitting…' : 'Submit answers'}</Button>
            </div>
          </div>
          <p className="text-xs text-gray-500">You cannot change your answers once you submit. A failed attempt uses one of your {exam.maxAttempts} attempts.</p>
        </form>
      )}
    </Dialog>
  );
}
