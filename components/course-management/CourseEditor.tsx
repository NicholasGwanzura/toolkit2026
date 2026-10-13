'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, Circle, Loader2, Lock, Plus, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { Slider } from '@/components/base/slider/slider';
import { Tab, TabList, TabPanel, Tabs } from '@/components/base/tabs/tabs';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { deleteCourse, deleteCourseMaterial, submitCourse, updateCourse, useCourse } from '@/lib/api';
import { MAX_DESCRIPTION, MAX_TITLE, basicsProblem, courseReadiness, examProblem, formatMinutes, isDirty, moduleProblem, totalMinutes, type CourseDraft } from '@/lib/course-readiness';
import type { CourseAttachment, CourseModule, ManagedCourse } from '@/lib/platformStore';
import { ModuleEditor } from './ModuleEditor';
import { ExamEditor } from './ExamEditor';
import type { ExamQuestion } from '@/lib/exam';
import { STATUS_META, StatusPill, isEditable } from './status';

type Section = 'details' | 'modules' | 'exam' | 'review';
type SaveState =
  | { kind: 'saved'; at: Date }
  | { kind: 'saving' }
  | { kind: 'waiting'; reason: string }
  | { kind: 'error'; message: string };

type Draft = Omit<CourseDraft, 'modules' | 'examQuestions'> & { modules: CourseModule[]; examQuestions: ExamQuestion[] };
const toDraft = (course: ManagedCourse): Draft => ({ title: course.title, description: course.description, passMark: course.passMark, cpdCredits: course.cpdCredits, modules: course.modules, examQuestions: course.examQuestions ?? [] });
const AUTOSAVE_MS = 1500;

export function CourseEditor({ courseId }: { courseId: string }) {
  const router = useRouter();
  const { data: course, error, isLoading, mutate } = useCourse(courseId);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [section, setSection] = useState<Section>('details');
  const [openModules, setOpenModules] = useState<Set<number>>(new Set([0]));
  const [saveState, setSaveState] = useState<SaveState>({ kind: 'saved', at: new Date() });
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);
  const [savedDraft, setSavedDraft] = useState<Draft | null>(null);
  const pendingFileDeletes = useRef<string[]>([]);
  const saving = useRef(false);
  const savedDraftRef = useRef<Draft | null>(null);

  // Load the course into an editable copy once; after that the copy is what the person is editing.
  if (course && draft === null) {
    const initial = toDraft(course);
    setDraft(initial);
    setSavedDraft(initial);
  }

  const editable = course ? isEditable(course.status) : false;
  const dirty = draft && savedDraft ? isDirty(draft, savedDraft) : false;
  useEffect(() => { savedDraftRef.current = savedDraft; }, [savedDraft]);
  const readiness = useMemo(() => (draft ? courseReadiness(draft) : null), [draft]);

  const persist = useCallback(async (next: Draft): Promise<boolean> => {
    if (saving.current) return false;
    saving.current = true;
    setSaveState({ kind: 'saving' });
    try {
      // The exam is saved only when its questions are complete, so a half-written question never blocks saving the rest.
      const examOk = examProblem(next.examQuestions) === '' || next.examQuestions.length === 0;
      const updated = await updateCourse(courseId, {
        title: next.title.trim(), description: next.description.trim(), passMark: next.passMark, cpdCredits: next.cpdCredits, modules: next.modules,
        ...(examOk ? { examQuestions: next.examQuestions } : {}),
      });
      setSavedDraft(examOk ? next : { ...next, examQuestions: savedDraftRef.current?.examQuestions ?? [] });
      void mutate(updated, { revalidate: false });
      setSaveState(examOk ? { kind: 'saved', at: new Date() } : { kind: 'waiting', reason: `Saved, except the exam. ${examProblem(next.examQuestions)}` });
      // Files the person removed are deleted from storage only once the course no longer lists them.
      const keys = pendingFileDeletes.current.splice(0);
      for (const key of keys) deleteCourseMaterial(courseId, key).catch(() => undefined);
      return true;
    } catch (err) {
      setSaveState({ kind: 'error', message: err instanceof Error ? err.message : 'Could not save.' });
      return false;
    } finally {
      saving.current = false;
    }
  }, [courseId, mutate]);

  // Save automatically a moment after the person stops typing, but only when the server would accept it.
  useEffect(() => {
    if (!draft || !editable || !dirty) return;
    const problem = basicsProblem(draft) || moduleProblem(draft.modules, { draft: true });
    if (problem) {
      setSaveState({ kind: 'waiting', reason: `Not saved yet. ${problem}` });
      return;
    }
    // Only the exam changed and it is incomplete: wait, and say so, instead of saving in a loop.
    const examChangedOnly = savedDraft && !isDirty({ ...draft, examQuestions: savedDraft.examQuestions }, savedDraft);
    if (examChangedOnly && examProblem(draft.examQuestions) !== '' && draft.examQuestions.length > 0) {
      setSaveState({ kind: 'waiting', reason: `Exam not saved yet. ${examProblem(draft.examQuestions)}` });
      return;
    }
    const timer = setTimeout(() => { void persist(draft); }, AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [draft, editable, dirty, persist, savedDraft]);

  // Warn before leaving with changes that are not saved.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const update = (patch: Partial<Draft>) => setDraft((current) => (current ? { ...current, ...patch } : current));
  const updateModule = (index: number, patch: Partial<CourseModule>) =>
    setDraft((current) => current && { ...current, modules: current.modules.map((m, i) => (i === index ? { ...m, ...patch } : m)) });

  const moveModule = (index: number, direction: -1 | 1) => {
    setDraft((current) => {
      if (!current) return current;
      const target = index + direction;
      if (target < 0 || target >= current.modules.length) return current;
      const modules = [...current.modules];
      [modules[index], modules[target]] = [modules[target], modules[index]];
      return { ...current, modules };
    });
    setOpenModules(new Set());
  };

  const addModule = () => {
    if (!draft) return;
    update({ modules: [...draft.modules, { title: '', content: '', minutes: 30 }] });
    setOpenModules(new Set([draft.modules.length]));
  };

  const confirmRemove = () => {
    if (!draft || removeIndex === null) return;
    const removed = draft.modules[removeIndex];
    pendingFileDeletes.current.push(...(removed.attachments ?? []).map((a) => a.r2Key));
    update({ modules: draft.modules.filter((_, i) => i !== removeIndex) });
    setRemoveIndex(null);
    setOpenModules(new Set());
  };

  // A new upload is saved at once, so a file is never in storage without the course listing it.
  const attachmentsUploaded = async (index: number, attachments: CourseAttachment[]) => {
    if (!draft) return;
    const next = { ...draft, modules: draft.modules.map((m, i) => (i === index ? { ...m, attachments } : m)) };
    setDraft(next);
    if (!moduleProblem(next.modules, { draft: true })) await persist(next);
    else setSaveState({ kind: 'waiting', reason: 'The file is uploaded. Finish this module (title and content) and the course will save.' });
  };

  const removeAttachment = (index: number, attachment: CourseAttachment) => {
    if (!draft) return;
    pendingFileDeletes.current.push(attachment.r2Key);
    updateModule(index, { attachments: (draft.modules[index].attachments ?? []).filter((a) => a.id !== attachment.id) });
  };

  const submit = async () => {
    if (!draft) return;
    setConfirmSubmit(false);
    setSubmitting(true);
    setSubmitError('');
    try {
      if (dirty && !(await persist(draft))) throw new Error('Save your changes first. See the message at the top.');
      const updated = await submitCourse(courseId);
      void mutate(updated, { revalidate: false });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not submit the course.');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    try {
      await deleteCourse(courseId);
      router.push('/learn/manage');
    } catch (err) {
      setConfirmDelete(false);
      setSubmitError(err instanceof Error ? err.message : 'Could not delete the course.');
    }
  };

  if (error) return <p role="alert" className="border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Could not open this course: {error.message}. <Link href="/learn/manage" className="font-semibold underline">Back to courses</Link></p>;
  if (isLoading || !course || !draft || !readiness) return <p className="p-4 text-sm text-stone-500">Opening the course…</p>;

  const readOnly = !editable;
  const minutes = totalMinutes(draft.modules);

  return (
    <div className="space-y-5">
      <div>
        <Link href="/learn/manage" className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-600 hover:text-stone-900"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> All courses</Link>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="truncate text-2xl font-bold text-stone-900">{draft.title.trim() || 'Untitled course'}</h1>
              <StatusPill status={course.status} />
            </div>
            <p className="mt-1 text-sm text-stone-600">{draft.modules.length} module{draft.modules.length === 1 ? '' : 's'}, {formatMinutes(minutes)}, pass mark {draft.passMark}%, {draft.cpdCredits} CPD credits</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {editable && <SaveIndicator state={saveState} />}
            {editable && <Button variant="secondary" leadingIcon={Trash2} onClick={() => setConfirmDelete(true)}>Delete</Button>}
            {editable && <Button leadingIcon={Send} disabled={!readiness.ready || submitting} onClick={() => setConfirmSubmit(true)} title={readiness.ready ? undefined : 'Finish the Review checklist first'}>{submitting ? 'Submitting…' : 'Submit for approval'}</Button>}
          </div>
        </div>
      </div>

      {course.status === 'rejected' && (
        <div role="alert" className="flex gap-3 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div><p className="font-semibold">An administrator sent this course back</p><p className="mt-1">{course.rejectionReason || 'No reason was given.'}</p><p className="mt-1 text-rose-800">Make the changes, then submit it again.</p></div>
        </div>
      )}
      {readOnly && (
        <div className="flex gap-3 border border-stone-200 bg-stone-50 p-4 text-sm text-stone-800">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-stone-500" aria-hidden="true" />
          <p><span className="font-semibold">{STATUS_META[course.status].label}.</span> {STATUS_META[course.status].hint}</p>
        </div>
      )}
      {submitError && <p role="alert" className="border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">{submitError}</p>}

      <Tabs selectedKey={section} onSelectionChange={(key) => setSection(String(key) as Section)} className="gap-0">
        <TabList aria-label="Course sections">
          <Tab id="details">Details</Tab>
          <Tab id="modules" count={draft.modules.length}>Modules</Tab>
          <Tab id="exam" count={draft.examQuestions.length}>Exam</Tab>
          <Tab id="review" count={readiness.missing.length || undefined}>Review</Tab>
        </TabList>

        <TabPanel id="details" className="pt-5">
          <div className="max-w-2xl space-y-5">
            <Input label="Course title" value={draft.title} onChange={(value) => update({ title: value })} isDisabled={readOnly} hint={`${draft.title.trim().length} of ${MAX_TITLE} characters`} />
            <div className="space-y-1.5">
              <label htmlFor="course-description" className="text-sm font-medium text-stone-800">Description</label>
              <textarea id="course-description" rows={5} value={draft.description} disabled={readOnly} onChange={(e) => update({ description: e.target.value })} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm leading-6 outline-none transition focus:border-[#D97706] focus:ring-2 focus:ring-[#D97706]/20 disabled:bg-stone-50 disabled:text-stone-500" />
              <p className="text-xs text-stone-500">{draft.description.trim().length} of {MAX_DESCRIPTION} characters. Learners read this before they enrol.</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Slider label="Pass mark" minValue={1} maxValue={100} value={draft.passMark} onChange={(value) => update({ passMark: Number(value) })} isDisabled={readOnly} />
                <p className="text-xs text-stone-500">A learner needs at least {draft.passMark}% in the exam to pass. Learners get three attempts.</p>
              </div>
              <Input label="CPD credits" type="number" value={String(draft.cpdCredits)} onChange={(value) => update({ cpdCredits: Number(value) })} isDisabled={readOnly} hint="0 to 100. Printed on certificates for this course." />
            </div>
          </div>
        </TabPanel>

        <TabPanel id="modules" className="pt-5">
          <div className="space-y-4">
            <ul className="space-y-3">
              {draft.modules.map((module, index) => (
                <ModuleEditor
                  key={index}
                  courseId={courseId}
                  module={module}
                  index={index}
                  count={draft.modules.length}
                  readOnly={readOnly}
                  open={openModules.has(index)}
                  onToggle={() => setOpenModules((current) => { const next = new Set(current); if (next.has(index)) next.delete(index); else next.add(index); return next; })}
                  onChange={(patch) => updateModule(index, patch)}
                  onMove={(direction) => moveModule(index, direction)}
                  onRemove={() => setRemoveIndex(index)}
                  onUploaded={(attachments) => void attachmentsUploaded(index, attachments)}
                  onRemoveAttachment={(attachment) => removeAttachment(index, attachment)}
                />
              ))}
            </ul>
            {!readOnly && <Button variant="secondary" leadingIcon={Plus} onClick={addModule}>Add module</Button>}
          </div>
        </TabPanel>

        <TabPanel id="exam" className="pt-5">
          <ExamEditor questions={draft.examQuestions} readOnly={readOnly} onChange={(examQuestions) => update({ examQuestions })} />
        </TabPanel>

        <TabPanel id="review" className="pt-5">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
            <section aria-labelledby="readiness-heading" className="space-y-3">
              <h2 id="readiness-heading" className="text-lg font-semibold text-stone-900">Ready to submit?</h2>
              <ul className="space-y-2">
                {readiness.items.map((item) => (
                  <li key={item.id} className="flex items-start gap-2.5 text-sm">
                    {item.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="Done" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-label="Still to do" />}
                    <span className={item.ok ? 'text-stone-600' : 'font-medium text-stone-900'}>
                      {item.label}
                      {!item.ok && editable && <button type="button" onClick={() => setSection(item.section)} className="ml-2 font-semibold text-[#b45309] underline">Fix</button>}
                    </span>
                  </li>
                ))}
              </ul>
              {editable && (readiness.ready
                ? <p className="flex items-center gap-2 text-sm font-medium text-emerald-700"><Check className="h-4 w-4" aria-hidden="true" /> Everything is in place. You can submit it for approval.</p>
                : <p className="text-sm text-stone-600">Finish the items above, then the Submit button becomes available.</p>)}
              <p className="text-xs text-stone-500">Once submitted, the course is locked while an administrator reviews it. If they send it back, you will see why here.</p>
            </section>
            <section aria-labelledby="preview-heading" className="space-y-3">
              <h2 id="preview-heading" className="text-lg font-semibold text-stone-900">What learners will see</h2>
              <div className="space-y-3 rounded-lg border border-stone-200 bg-stone-50 p-4">
                <p className="font-semibold text-stone-900">{draft.title.trim() || 'Untitled course'}</p>
                <p className="whitespace-pre-line text-sm leading-6 text-stone-700">{draft.description.trim() || 'No description yet.'}</p>
                <ol className="space-y-2">
                  {draft.modules.map((module, index) => (
                    <li key={index} className="rounded border border-stone-200 bg-white p-3">
                      <p className="text-sm font-semibold text-stone-900">{index + 1}. {module.title.trim() || 'Untitled module'} <span className="font-normal text-stone-500">({module.minutes} min)</span></p>
                      <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-stone-600">{module.content.trim() || 'No content yet.'}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          </div>
        </TabPanel>
      </Tabs>

      <ConfirmModal open={confirmSubmit} variant="default" title="Submit this course for approval?" description="An administrator will review it. You cannot edit it while it waits. If they send it back you will see their reason here." confirmLabel="Submit" onConfirm={() => void submit()} onCancel={() => setConfirmSubmit(false)} />
      <ConfirmModal open={confirmDelete} title="Delete this course?" description="The course and its uploaded files are removed. This cannot be undone." confirmLabel="Delete course" onConfirm={() => void remove()} onCancel={() => setConfirmDelete(false)} />
      <ConfirmModal open={removeIndex !== null} title={`Remove module ${removeIndex === null ? '' : removeIndex + 1}?`} description="Its content and any files attached to it are removed from the course." confirmLabel="Remove module" onConfirm={confirmRemove} onCancel={() => setRemoveIndex(null)} />
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  return (
    <p className="text-sm" role="status" aria-live="polite">
      {state.kind === 'saving' && <span className="inline-flex items-center gap-1.5 text-stone-600"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving…</span>}
      {state.kind === 'saved' && <span className="inline-flex items-center gap-1.5 text-emerald-700"><Check className="h-4 w-4" aria-hidden="true" /> Saved {state.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
      {state.kind === 'waiting' && <span className="inline-flex items-center gap-1.5 text-amber-700"><AlertTriangle className="h-4 w-4" aria-hidden="true" /> {state.reason}</span>}
      {state.kind === 'error' && <span className="inline-flex items-center gap-1.5 text-rose-700"><AlertTriangle className="h-4 w-4" aria-hidden="true" /> Not saved: {state.message}</span>}
    </p>
  );
}
