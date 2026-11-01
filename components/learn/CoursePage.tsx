'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Circle, Clock, Download, FileText } from 'lucide-react';
import { Button } from '@/components/base/buttons/button';
import { ExamPanel } from '@/components/ExamPanel';
import { RichText } from '@/components/learn/RichText';
import { CourseStepper } from '@/components/learn/CourseStepper';
import { useCourseLearning } from '@/components/learn/useCourseLearning';
import { useCourse, useCourseExam, useCourseProgress } from '@/lib/api';
import { getCourseMaterialDownloadUrl, useEnrollments, type ManagedCourse } from '@/lib/platformStore';
import { STAGE_META, courseStage, nextModuleIndex } from '@/lib/course-journey';
import { formatMinutes, totalMinutes } from '@/lib/course-readiness';
import { progressPercent } from '@/lib/course-progress';

const fileSize = (bytes: number) => (bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`);

export function CoursePage({ courseId }: { courseId: string }) {
  const { data: course, error, isLoading } = useCourse(courseId);
  const { data: progress, isLoading: progressLoading } = useCourseProgress();
  const { data: enrollments, isLoading: enrollmentsLoading } = useEnrollments();

  if (error) {
    return (
      <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        This course is not available right now. <Link href="/learn" className="font-semibold underline">Back to the Learning Hub</Link>
      </div>
    );
  }
  if (isLoading || progressLoading || enrollmentsLoading || !course) return <p className="p-4 text-sm text-gray-500">Opening the course…</p>;

  return (
    <CourseContent
      key={course.id}
      course={course}
      saved={progress?.find((entry) => entry.courseId === course.id)}
      enrolled={(enrollments ?? []).some((entry) => entry.courseId === course.id)}
    />
  );
}

function CourseContent({ course, saved, enrolled }: { course: ManagedCourse; saved: Parameters<typeof useCourseLearning>[1]; enrolled: boolean }) {
  const learning = useCourseLearning(course, saved, enrolled);
  const { data: exam } = useCourseExam(course.id, enrolled);
  const [moduleIndex, setModuleIndex] = useState(() => nextModuleIndex(learning.completed, course.modules.length));
  const [busy, setBusy] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const moduleCount = course.modules.length;
  const mod = course.modules[moduleIndex];
  const isComplete = learning.completed.includes(moduleIndex);
  const isLast = moduleIndex === moduleCount - 1;
  const stage = courseStage({ started: enrolled, completedModules: learning.completed, moduleCount, exam });
  const percent = progressPercent(learning.completed.length, moduleCount);
  const stageMeta = STAGE_META[stage];

  const goTo = (index: number) => {
    setModuleIndex(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const start = async () => {
    setBusy(true);
    await learning.start();
    setBusy(false);
  };

  const completeAndContinue = async () => {
    setBusy(true);
    const ok = isComplete || await learning.setModuleComplete(moduleIndex, true);
    setBusy(false);
    if (!ok) return;
    if (!isLast) goTo(moduleIndex + 1);
    else document.getElementById('course-exam')?.scrollIntoView({ behavior: 'smooth' });
  };

  const download = async (r2Key: string) => {
    setDownloadError('');
    try {
      window.open(await getCourseMaterialDownloadUrl(course.id, r2Key), '_blank', 'noopener,noreferrer');
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Could not open the file.');
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <Link href="/learn" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Learning Hub</Link>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
            <p className="mt-1 text-sm text-gray-600">By {course.lecturerName}. {moduleCount} module{moduleCount === 1 ? '' : 's'}, {formatMinutes(totalMinutes(course.modules))}, pass mark {course.passMark}%{course.cpdCredits > 0 ? `, ${course.cpdCredits} CPD credits` : ''}.</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${stageMeta.className}`}>{stageMeta.label}</span>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><CourseStepper stage={stage} /></div>

      {!enrolled && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="max-w-2xl text-sm text-amber-950">{course.description}</p>
          <Button onClick={() => void start()} disabled={busy} className="min-h-11 bg-[#B45309] text-white hover:bg-[#92400E]">{busy ? 'Starting…' : 'Start course'}</Button>
        </div>
      )}

      {learning.error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">
          <span>{learning.error}</span>
          {learning.retry && <Button variant="secondary" onClick={() => void learning.retry?.()}>Try again</Button>}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
        <nav aria-label="Course modules" className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm lg:sticky lg:top-4">
          <div className="mb-3 px-1">
            <div className="mb-1.5 flex justify-between text-xs font-medium text-gray-600"><span>{learning.completed.length}/{moduleCount} modules complete</span><span>{percent}%</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-200"><div className="h-full rounded-full bg-emerald-600 transition-[width] duration-200" style={{ width: `${percent}%` }} /></div>
          </div>
          <ol className="space-y-1">
            {course.modules.map((item, index) => {
              const done = learning.completed.includes(index);
              return (
                <li key={index}>
                  <button type="button" onClick={() => goTo(index)} aria-current={index === moduleIndex ? 'true' : undefined} className={`flex min-h-11 w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309] ${index === moduleIndex ? 'bg-amber-50 font-semibold text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}>
                    {done ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="Complete" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-label="Not complete" />}
                    <span className="min-w-0"><span className="block">{index + 1}. {item.title}</span><span className="block text-xs font-normal text-gray-500">{formatMinutes(item.minutes)}</span></span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="min-w-0 space-y-5">
          {mod ? (
            <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Module {moduleIndex + 1} of {moduleCount}</p>
              <h2 className="mt-1 text-xl font-bold text-gray-900">{mod.title}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500"><Clock className="h-4 w-4" aria-hidden="true" />{formatMinutes(mod.minutes)}</p>
              <RichText text={mod.content} className="mt-5 max-w-prose" />

              {(mod.attachments ?? []).length > 0 && (
                <div className="mt-6 space-y-2 border-t border-gray-100 pt-5">
                  <h3 className="text-sm font-semibold text-gray-900">Materials</h3>
                  {!enrolled && <p className="text-xs text-gray-600">Start the course to download these.</p>}
                  {(mod.attachments ?? []).map((attachment) => (
                    <button key={attachment.id} type="button" disabled={!enrolled} onClick={() => void download(attachment.r2Key)} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm text-gray-700 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                      <span className="flex min-w-0 items-center gap-2"><FileText className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" /><span className="truncate">{attachment.fileName}</span></span>
                      <span className="flex shrink-0 items-center gap-1.5 text-xs text-gray-500">{fileSize(attachment.sizeBytes)}<Download className="h-4 w-4" aria-hidden="true" /></span>
                    </button>
                  ))}
                  {downloadError && <p role="alert" className="text-xs text-rose-700">{downloadError}</p>}
                </div>
              )}

              {enrolled && (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-5">
                  <div className="flex flex-wrap items-center gap-2">
                    {moduleIndex > 0 && <button type="button" onClick={() => goTo(moduleIndex - 1)} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-800 hover:bg-gray-50"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Previous</button>}
                    {isComplete && <button type="button" onClick={() => void learning.setModuleComplete(moduleIndex, false)} className="min-h-11 px-2 text-sm font-medium text-gray-600 underline hover:text-gray-900">Mark as not complete</button>}
                  </div>
                  <button type="button" onClick={() => void completeAndContinue()} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#B45309] px-4 text-sm font-semibold text-white transition hover:bg-[#92400E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309] focus-visible:ring-offset-2 disabled:opacity-60">
                    {busy ? 'Saving…' : isComplete ? (isLast ? 'Go to the exam' : 'Next module') : (isLast ? 'Mark complete' : 'Mark complete and continue')}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              )}
            </article>
          ) : (
            <p className="flex items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600"><BookOpen className="h-4 w-4" aria-hidden="true" /> This course has no modules yet.</p>
          )}
          <div id="course-exam" className="scroll-mt-4"><ExamPanel courseId={course.id} enrolled={enrolled} modules={course.modules.map((item) => item.title)} /></div>
        </div>
      </div>
    </div>
  );
}
