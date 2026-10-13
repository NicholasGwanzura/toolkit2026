'use client';

import { useState } from 'react';
import { ExamPanel } from '@/components/ExamPanel';
import { BookOpen, CheckCircle2, ChevronDown, ChevronUp, Clock, Download, FileText } from 'lucide-react';
import { useCourses, getCourseMaterialDownloadUrl, enrollInCourse, useEnrollments, type ManagedCourse } from '@/lib/platformStore';
import { saveCourseProgress, useCourseProgress, type CourseProgressEntry } from '@/lib/api';
import { progressPercent, sanitizeCompletedModules } from '@/lib/course-progress';

function totalMinutes(course: ManagedCourse) {
  return course.modules.reduce((sum, m) => sum + m.minutes, 0);
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const hourLabel = `${hours} ${hours === 1 ? 'hour' : 'hours'}`;

  return remainingMinutes > 0 ? `${hourLabel} ${remainingMinutes} min` : hourLabel;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type CourseProgress = { started: boolean; completedModules: number[] };

function progressKey(courseId: string) {
  return `coolpro_course_progress_${courseId}`;
}

function readProgress(course: ManagedCourse): CourseProgress {
  if (typeof window === 'undefined') return { started: false, completedModules: [] };
  try {
    const saved = window.localStorage.getItem(progressKey(course.id));
    if (!saved) return { started: false, completedModules: [] };
    const progress = JSON.parse(saved) as Partial<CourseProgress>;
    return {
      started: progress.started === true,
      completedModules: Array.isArray(progress.completedModules)
        ? progress.completedModules.filter(index => Number.isInteger(index) && index >= 0 && index < course.modules.length)
        : [],
    };
  } catch {
    window.localStorage.removeItem(progressKey(course.id));
    return { started: false, completedModules: [] };
  }
}

function CourseCard({ course, saved, enrolled }: { course: ManagedCourse; saved?: CourseProgressEntry; enrolled: boolean }) {
  const [expanded, setExpanded] = useState(false);
  // Progress used to live only in this browser. Read it once so nobody loses work they already did.
  const [legacy] = useState<CourseProgress>(() => readProgress(course));
  // What the learner just ticked, shown straight away while it saves.
  const [pending, setPending] = useState<number[] | null>(null);
  const [error, setError] = useState('');
  const curriculumId = `course-curriculum-${course.id}`;
  const savedModules = saved ? sanitizeCompletedModules(saved.completedModules, course.modules.length) : null;
  const shown = pending ?? savedModules ?? legacy.completedModules;
  const started = enrolled || Boolean(saved) || legacy.started || pending !== null;
  const completionPercent = progressPercent(shown.length, course.modules.length);

  async function persist(next: number[]) {
    setPending(next);
    try {
      await saveCourseProgress(course.id, next);
      window.localStorage.removeItem(progressKey(course.id));
    } catch (err) {
      setError(err instanceof Error ? `Your progress was not saved: ${err.message}` : 'Your progress was not saved.');
    }
  }

  async function handleStartCourse() {
    setError('');
    try {
      // Enrolment unlocks the course materials and its exam.
      await enrollInCourse(course.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not enrol in this course');
      return;
    }
    // Carry over any progress that was only saved in this browser before.
    if (!saved && legacy.completedModules.length > 0) await persist(legacy.completedModules);
    else if (!saved) await persist([]);
    setExpanded(true);
  }

  function toggleModuleComplete(index: number) {
    const base = shown;
    const next = base.includes(index) ? base.filter((item) => item !== index) : [...base, index].sort((a, b) => a - b);
    void persist(next);
  }

  async function handleDownload(r2Key: string) {
    setError('');
    try {
      const url = await getCourseMaterialDownloadUrl(course.id, r2Key);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open file');
    }
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold leading-6 text-gray-950">{course.title}</h2>
          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            Available
          </span>
        </div>
        <p className="mb-2 line-clamp-4 text-sm leading-6 text-gray-600">{course.description}</p>
        <p className="mb-4 text-xs font-medium text-gray-500">By {course.lecturerName}</p>

        <div className="mb-4 mt-auto flex items-center gap-4 border-t border-gray-100 pt-4 text-xs font-medium text-gray-600">
          <span className="flex items-center gap-1">
            <BookOpen className="h-4 w-4 text-gray-400" aria-hidden="true" />
            {course.modules.length} {course.modules.length === 1 ? 'module' : 'modules'}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-gray-400" aria-hidden="true" />
            {formatDuration(totalMinutes(course))}
          </span>
          <span>Pass mark {course.passMark}%</span>
        </div>

        <div className="mb-4 rounded-lg bg-gray-50 px-3 py-2.5" aria-label={`${shown.length} of ${course.modules.length} modules completed`}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-xs font-medium text-gray-600">
            <span>{shown.length}/{course.modules.length} modules complete</span>
            <span>{completionPercent}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
            <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-200" style={{ width: `${completionPercent}%` }} />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <button
            type="button"
            onClick={handleStartCourse}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#FF6B35] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B35] focus-visible:ring-offset-2"
          >
            {started ? 'Continue course' : 'Start course'}
          </button>
          <button
            type="button"
            onClick={() => setExpanded(prev => !prev)}
            aria-expanded={expanded}
            aria-controls={curriculumId}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
          >
            {expanded ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
            {expanded ? 'Hide curriculum' : 'View curriculum'}
          </button>
        </div>

        <ExamPanel courseId={course.id} enrolled={enrolled} />

        {!expanded && error && <p role="alert" className="mt-3 text-xs text-red-600">{error}</p>}

        {expanded && (
          <div id={curriculumId} className="mt-4 space-y-2" aria-label={`${course.title} curriculum`}>
            {course.modules.map((mod, i) => (
              <details key={`${course.id}-${i}`} className="group rounded-lg border border-gray-200 bg-gray-50 open:bg-white">
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900 [&::-webkit-details-marker]:hidden">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-5 text-gray-900">{mod.title}</span>
                    <span className="mt-0.5 block text-xs text-gray-500">{formatDuration(mod.minutes)}</span>
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-gray-500 transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="border-t border-gray-200 px-4 py-3">
                  <p className="whitespace-pre-line break-words text-sm leading-6 text-gray-600">{mod.content}</p>
                  <button
                    type="button"
                    onClick={() => toggleModuleComplete(i)}
                    aria-pressed={shown.includes(i)}
                    className={`mt-3 inline-flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${shown.includes(i) ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    {shown.includes(i) ? 'Completed' : 'Mark complete'}
                  </button>
                  {(mod.attachments ?? []).length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Materials</p>
                      {(mod.attachments ?? []).map(attachment => (
                        <button
                          type="button"
                          key={attachment.id}
                          onClick={() => handleDownload(attachment.r2Key)}
                          className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-left text-xs text-gray-700 hover:border-blue-300 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <FileText className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                            <span className="truncate">{attachment.fileName}</span>
                          </span>
                          <span className="flex shrink-0 items-center gap-1.5 text-gray-500">
                            {formatFileSize(attachment.sizeBytes)}
                            <Download className="h-4 w-4" aria-hidden="true" />
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </details>
            ))}
            {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
          </div>
        )}
      </div>
    </article>
  );
}

export default function LMS() {
  const { data: courses, error, isLoading } = useCourses();
  const { data: progress } = useCourseProgress();
  const { data: enrollments } = useEnrollments();

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading courses…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">Failed to load courses. {error.message}</p>;
  }

  if (!courses || courses.length === 0) {
    return <p className="text-sm text-gray-500">No approved courses are available yet.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {courses.map(course => (
        <CourseCard
          key={course.id}
          course={course}
          saved={progress?.find((entry) => entry.courseId === course.id)}
          enrolled={(enrollments ?? []).some((entry) => entry.courseId === course.id)}
        />
      ))}
    </div>
  );
}
