'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Clock } from 'lucide-react';
import { useCourses, useEnrollments, type ManagedCourse } from '@/lib/platformStore';
import { useCourseExam, useCourseProgress, type CourseProgressEntry } from '@/lib/api';
import { useCourseLearning } from '@/components/learn/useCourseLearning';
import { STAGE_META, courseStage, type CourseStage } from '@/lib/course-journey';
import { formatMinutes, totalMinutes } from '@/lib/course-readiness';
import { progressPercent } from '@/lib/course-progress';

const ACTION: Record<CourseStage, string> = {
  'not-started': 'Start course',
  'in-progress': 'Continue course',
  'exam-ready': 'Take the exam',
  'no-exam': 'Review course',
  'attempts-used': 'Review course',
  'awaiting-result': 'Review course',
  passed: 'Review course',
};

function CourseCard({ course, saved, enrolled }: { course: ManagedCourse; saved?: CourseProgressEntry; enrolled: boolean }) {
  const router = useRouter();
  const learning = useCourseLearning(course, saved, enrolled);
  const { data: exam } = useCourseExam(course.id, enrolled);
  const [busy, setBusy] = useState(false);
  const stage = courseStage({ started: learning.started, completedModules: learning.completed, moduleCount: course.modules.length, exam });
  const meta = STAGE_META[stage];
  const percent = progressPercent(learning.completed.length, course.modules.length);
  const action = stage === 'exam-ready' && exam?.last ? 'Try the exam again' : ACTION[stage];
  const courseHref = `/learn/${course.id}`;

  async function open() {
    if (!enrolled) {
      setBusy(true);
      const ok = await learning.start();
      setBusy(false);
      if (!ok) return;
    }
    router.push(stage === 'exam-ready' ? `${courseHref}#course-exam` : courseHref);
  }

  return (
    <article className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold leading-6 text-gray-950">{course.title}</h2>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}>{meta.label}</span>
      </div>
      <p className="mb-2 line-clamp-3 text-sm leading-6 text-gray-600">{course.description}</p>
      <p className="mb-4 text-xs font-medium text-gray-500">By {course.lecturerName}</p>

      <div className="mb-4 mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-gray-100 pt-4 text-xs font-medium text-gray-600">
        <span className="flex items-center gap-1"><BookOpen className="h-4 w-4 text-gray-400" aria-hidden="true" />{course.modules.length} {course.modules.length === 1 ? 'module' : 'modules'}</span>
        <span className="flex items-center gap-1"><Clock className="h-4 w-4 text-gray-400" aria-hidden="true" />{formatMinutes(totalMinutes(course.modules))}</span>
        <span>Pass mark {course.passMark}%</span>
        {course.cpdCredits > 0 && <span>{course.cpdCredits} CPD credits</span>}
      </div>

      <div className="mb-4 rounded-lg bg-gray-50 px-3 py-2.5" aria-label={`${learning.completed.length} of ${course.modules.length} modules completed`}>
        <div className="mb-1.5 flex items-center justify-between gap-3 text-xs font-medium text-gray-600">
          <span>{learning.completed.length}/{course.modules.length} modules complete</span>
          <span>{percent}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
          <div className="h-full rounded-full bg-emerald-600 transition-[width] duration-200" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <button type="button" onClick={() => void open()} disabled={busy} className="flex min-h-11 w-full items-center justify-center rounded-lg bg-[#B45309] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#92400E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309] focus-visible:ring-offset-2 disabled:opacity-60">
        {busy ? 'Starting…' : action}
      </button>
      {learning.error && <p role="alert" className="mt-3 text-xs text-red-600">{learning.error}</p>}
    </article>
  );
}

export default function LMS() {
  const { data: courses, error, isLoading } = useCourses();
  const { data: progress } = useCourseProgress();
  const { data: enrollments } = useEnrollments();

  if (isLoading) return <p className="text-sm text-gray-500">Loading courses…</p>;
  if (error) return <p className="text-sm text-red-600">Failed to load courses. {error.message}</p>;

  const available = (courses ?? []).filter((course) => course.status === 'approved');
  if (available.length === 0) return <p className="text-sm text-gray-500">No approved courses are available yet.</p>;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {available.map(course => (
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
