'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Award, CheckCircle2, Clock, GraduationCap, XCircle } from 'lucide-react';
import { Button } from '@/components/base/buttons/button';
import { Dialog } from '@/components/course-management/Dialog';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { submitCourseExam, useCourseExam, type CourseExamResult } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { SubmittedAnswer } from '@/lib/exam';

const primary = 'bg-[#B45309] text-white hover:bg-[#92400E]';

/** What happens after a pass, so the learner is never left wondering. */
function AfterPassing() {
  return (
    <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-left text-sm text-emerald-950">
      <p className="font-semibold">What happens next</p>
      <ol className="mt-1 list-decimal space-y-0.5 pl-5">
        <li>Your trainer requests your certificate.</li>
        <li>HEVACRAZ reviews the request and issues it.</li>
        <li>It appears in Certification, and you are notified.</li>
      </ol>
      <Link href="/certifications" className="mt-2 inline-flex min-h-11 items-center gap-1.5 font-semibold text-emerald-800 underline"><Award className="h-4 w-4" aria-hidden="true" /> Go to Certification</Link>
    </div>
  );
}

/** The exam on a course: where the learner stands, and the dialog for taking it. */
export function ExamPanel({ courseId, enrolled, modules }: { courseId: string; enrolled: boolean; modules?: string[] }) {
  const { data: exam, error } = useCourseExam(courseId, enrolled);
  const [open, setOpen] = useState(false);

  if (!enrolled) return null;
  if (error) return <p role="alert" className="text-xs text-red-600">Could not load the exam: {error.message}</p>;
  if (!exam) return null;
  if (!exam.hasExam) {
    if (!exam.modulesComplete) return null;
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm shadow-sm">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-gray-500" aria-hidden="true" />
          <h2 className="font-semibold text-gray-900">Exam</h2>
        </div>
        <p className="mt-2 text-sm text-gray-600">You have finished the modules, but this course has no exam questions yet. Ask your trainer or HEVACRAZ when the exam will be ready.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <GraduationCap className="h-4 w-4 text-gray-500" aria-hidden="true" />
            <h2 className="font-semibold text-gray-900">Exam</h2>
            {exam.passed && <span className="inline-flex items-center gap-1 font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Passed{exam.last?.score !== undefined ? `, ${exam.last.score}%` : ''}</span>}
            {!exam.passed && exam.waitingForGrading && <span className="inline-flex items-center gap-1 font-semibold text-amber-700"><Clock className="h-4 w-4" aria-hidden="true" />Waiting for your trainer to grade it</span>}
            {!exam.passed && !exam.waitingForGrading && exam.last?.status === 'graded' && <span className="inline-flex items-center gap-1 font-semibold text-rose-700"><XCircle className="h-4 w-4" aria-hidden="true" />Last result {exam.last.score}%, pass mark {exam.passMark}%</span>}
          </div>
          {!exam.passed && !exam.waitingForGrading && exam.attemptsLeft > 0 && (
            <p className="mt-1 text-sm text-gray-600">Pass mark {exam.passMark}%. {exam.attemptsLeft} of {exam.maxAttempts} attempt{exam.maxAttempts === 1 ? '' : 's'} left.</p>
          )}
        </div>
        {exam.canAttempt && <Button onClick={() => setOpen(true)} className={`min-h-11 ${primary}`}>{exam.last ? 'Try again' : 'Take the exam'}</Button>}
      </div>
      {!exam.passed && !exam.waitingForGrading && exam.attemptsLeft === 0 && <p className="mt-2 text-sm text-gray-600">You have used all {exam.maxAttempts} attempts. Ask your trainer or HEVACRAZ to give you more.</p>}
      {!exam.canAttempt && !exam.passed && !exam.waitingForGrading && exam.attemptsLeft > 0 && <p className="mt-2 text-sm font-medium text-gray-700">Finish all the modules to unlock the exam.</p>}
      {exam.last?.feedback && exam.last.feedback !== 'Marked automatically.' && <p className="mt-2 text-sm text-gray-700"><span className="font-semibold">Trainer feedback:</span> {exam.last.feedback}</p>}
      {exam.passed && <AfterPassing />}
      {open && <ExamDialog courseId={courseId} modules={modules} onClose={() => setOpen(false)} />}
    </div>
  );
}

type Draft = { choices: Record<string, number>; texts: Record<string, string> };
const EMPTY_DRAFT: Draft = { choices: {}, texts: {} };

/** Unsent answers stay in this browser only, per person and course, so closing by accident loses nothing. */
function readDraft(key: string): Draft {
  try {
    const saved = window.localStorage.getItem(key);
    if (!saved) return EMPTY_DRAFT;
    const parsed = JSON.parse(saved) as Partial<Draft>;
    return { choices: parsed.choices ?? {}, texts: parsed.texts ?? {} };
  } catch {
    return EMPTY_DRAFT;
  }
}

function writeDraft(key: string, draft: Draft | null) {
  try {
    if (draft) window.localStorage.setItem(key, JSON.stringify(draft));
    else window.localStorage.removeItem(key);
  } catch {
    // The exam still works without a saved draft.
  }
}

function ExamDialog({ courseId, modules, onClose }: { courseId: string; modules?: string[]; onClose: () => void }) {
  const { user } = useAuth();
  const { data: exam } = useCourseExam(courseId);
  const draftKey = `coolpro_exam_draft_${user?.id ?? 'me'}_${courseId}`;
  const [draft, setDraft] = useState<Draft>(() => readDraft(draftKey));
  const [current, setCurrent] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState<number[]>([]);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [result, setResult] = useState<CourseExamResult | null>(null);
  const { choices, texts } = draft;

  const questions = exam?.questions ?? [];
  const isAnswered = (q: (typeof questions)[number]) => (q.type === 'choice' ? choices[q.id] !== undefined : (texts[q.id] ?? '').trim() !== '');
  const answered = questions.filter(isAnswered).length;
  const percent = questions.length === 0 ? 0 : Math.round((answered / questions.length) * 100);

  useEffect(() => {
    if (!result) writeDraft(draftKey, draft);
  }, [draft, draftKey, result]);

  const jumpTo = (index: number) => {
    setCurrent(index);
    document.getElementById(`exam-question-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const trySubmit = () => {
    const unanswered = questions.flatMap((q, index) => (isAnswered(q) ? [] : [index]));
    setMissing(unanswered);
    if (unanswered.length > 0) jumpTo(unanswered[0]);
    else setConfirmSubmit(true);
  };

  const submit = async () => {
    setConfirmSubmit(false);
    setBusy(true);
    setError('');
    try {
      const answers: SubmittedAnswer[] = questions.map((q) => (q.type === 'choice' ? { questionId: q.id, choice: choices[q.id] } : { questionId: q.id, text: texts[q.id] }));
      const submitted = await submitCourseExam(courseId, answers);
      writeDraft(draftKey, null);
      setResult(submitted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit your answers.');
    } finally {
      setBusy(false);
    }
  };

  const requestClose = () => {
    if (busy) return;
    if (!result && answered > 0) setConfirmLeave(true);
    else onClose();
  };

  return (
    <Dialog isOpen onOpenChange={(isOpen) => { if (!isOpen) requestClose(); }} size="lg" title={exam?.courseTitle ? `${exam.courseTitle}: exam` : 'Exam'} description={exam ? `Pass mark ${exam.passMark}%. You have ${exam.attemptsLeft} attempt${exam.attemptsLeft === 1 ? '' : 's'} left.` : undefined}>
      {result ? (
        <div className="space-y-4 py-2 text-center">
          {result.status === 'graded' ? (
            <>
              {result.passed ? <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden="true" /> : <XCircle className="mx-auto h-12 w-12 text-rose-600" aria-hidden="true" />}
              <p className="text-2xl font-bold text-gray-900" role="status">{result.score}%</p>
              <p className="text-sm text-gray-700">{result.passed ? 'You passed this exam.' : `You did not reach the pass mark of ${result.passMark}%. Review the modules below and try again.`}</p>
              {result.passed && <AfterPassing />}
              {(result.byModule ?? []).length > 0 && modules && (
                <div className="rounded-lg border border-gray-200 p-3 text-left">
                  <p className="text-sm font-semibold text-gray-900">How you did by module</p>
                  <ul className="mt-2 space-y-1.5">
                    {result.byModule!.map((row) => (
                      <li key={row.moduleIndex} className="flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 text-gray-700">{row.moduleIndex + 1}. {modules[row.moduleIndex] ?? 'Module'}</span>
                        <span className={`shrink-0 font-semibold ${row.needsReview ? 'text-amber-800' : 'text-emerald-700'}`}>{row.needsReview ? 'Needs review' : 'Good'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <>
              <Clock className="mx-auto h-12 w-12 text-amber-600" aria-hidden="true" />
              <p className="text-lg font-semibold text-gray-900" role="status">Submitted for grading</p>
              <p className="text-sm text-gray-700">This exam has written answers, so your trainer reads it before you get a result. You will be notified.</p>
            </>
          )}
          <Button onClick={onClose} className="min-h-11">Close</Button>
        </div>
      ) : !exam ? (
        <p className="py-6 text-center text-sm text-gray-500">Loading the exam…</p>
      ) : questions.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-700">There is nothing to answer right now. {exam.waitingForGrading ? 'Your last submission is waiting to be graded.' : exam.passed ? 'You have already passed.' : ''}</p>
      ) : (
        <form onSubmit={(event) => { event.preventDefault(); trySubmit(); }} className="space-y-6">
          <div>
            <div className="mb-1 flex justify-between text-xs font-medium text-gray-600" aria-live="polite"><span>{answered} of {questions.length} answered</span><span className="sm:hidden">Question {current + 1}</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-200"><div className="h-full rounded-full bg-[#B45309] transition-[width] duration-200" style={{ width: `${percent}%` }} /></div>
          </div>

          {questions.map((question, index) => (
            // On a phone one question shows at a time. On a larger screen they all show.
            <fieldset key={question.id} id={`exam-question-${index}`} className={`scroll-mt-4 space-y-2 ${index === current ? 'block' : 'hidden sm:block'}`}>
              <legend className="text-sm font-semibold text-gray-900">{index + 1}. {question.text}</legend>
              {question.type === 'choice' ? (
                <div className="space-y-1.5">
                  {(question.options ?? []).map((option, optionIndex) => (
                    <label key={optionIndex} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition ${choices[question.id] === optionIndex ? 'border-[#B45309] bg-amber-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                      <input type="radio" name={`q-${question.id}`} checked={choices[question.id] === optionIndex} onChange={() => setDraft((d) => ({ ...d, choices: { ...d.choices, [question.id]: optionIndex } }))} className="h-4 w-4 accent-[#B45309]" />
                      {option}
                    </label>
                  ))}
                </div>
              ) : (
                <textarea rows={4} value={texts[question.id] ?? ''} onChange={(e) => setDraft((d) => ({ ...d, texts: { ...d.texts, [question.id]: e.target.value } }))} aria-label={`Answer to question ${index + 1}`} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#B45309] focus:ring-2 focus:ring-[#B45309]/20" />
              )}
            </fieldset>
          ))}

          <div className="flex justify-between gap-2 sm:hidden">
            <button type="button" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-800 disabled:opacity-40"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Previous</button>
            <button type="button" disabled={current === questions.length - 1} onClick={() => setCurrent((c) => c + 1)} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-800 disabled:opacity-40">Next <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
          </div>

          {missing.length > 0 && answered < questions.length && (
            <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              <p className="font-semibold">Still to answer:</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {missing.filter((index) => !isAnswered(questions[index])).map((index) => (
                  <button key={index} type="button" onClick={() => jumpTo(index)} className="min-h-11 min-w-11 rounded-lg border border-amber-300 bg-white px-2 font-semibold text-amber-900">{index + 1}</button>
                ))}
              </div>
            </div>
          )}
          {error && <p role="alert" className="text-sm font-medium text-rose-700">{error}</p>}
          <div className="flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500">Your answers are kept on this device until you submit. Submitting uses one attempt if you do not pass.</p>
            <div className="flex shrink-0 justify-end gap-2">
              <Button type="button" variant="secondary" onClick={requestClose} disabled={busy} className="min-h-11">Close</Button>
              <Button type="submit" disabled={busy} className={`min-h-11 ${primary}`}>{busy ? 'Submitting…' : 'Submit answers'}</Button>
            </div>
          </div>
        </form>
      )}
      <ConfirmModal open={confirmSubmit} variant="default" title="Submit your answers?" description="You cannot change them after this." confirmLabel="Submit" cancelLabel="Keep checking" onConfirm={() => void submit()} onCancel={() => setConfirmSubmit(false)} />
      <ConfirmModal open={confirmLeave} variant="warning" title="Leave the exam?" description="This does not use an attempt. Your answers stay on this device so you can finish later." confirmLabel="Leave" cancelLabel="Keep going" onConfirm={onClose} onCancel={() => setConfirmLeave(false)} />
    </Dialog>
  );
}
