'use client';

import Link from 'next/link';
import { BookOpen, Clock, Plus } from 'lucide-react';
import { StatusPill } from '@/components/course-management/status';
import { useCourses } from '@/lib/api';
import { formatMinutes, totalMinutes } from '@/lib/course-readiness';

/** Every course on the platform for an administrator: read it as a learner would, or manage it. */
export function AdminCourseLibrary() {
  const { data: courses, error, isLoading } = useCourses();

  return (
    <section aria-labelledby="admin-courses-title" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="admin-courses-title" className="text-lg font-bold text-gray-900">Courses</h2>
        <Link href="/learn/manage" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50"><Plus className="h-4 w-4" aria-hidden="true" /> Manage courses</Link>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">Could not load courses. {error.message}</p>}
      {isLoading && <p className="text-sm text-gray-500">Loading courses…</p>}
      {courses?.length === 0 && <p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600">No courses yet. Create one from Manage courses.</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {(courses ?? []).map((course) => (
          <article key={course.id} className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-gray-950">{course.title}</h3>
              <StatusPill status={course.status} className="shrink-0" />
            </div>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">{course.description}</p>
            <p className="mt-2 text-xs font-medium text-gray-500">By {course.lecturerName}</p>
            <div className="mb-4 mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-gray-600">
              <span className="flex items-center gap-1"><BookOpen className="h-4 w-4 text-gray-400" aria-hidden="true" />{course.modules.length} {course.modules.length === 1 ? 'module' : 'modules'}</span>
              <span className="flex items-center gap-1"><Clock className="h-4 w-4 text-gray-400" aria-hidden="true" />{formatMinutes(totalMinutes(course.modules))}</span>
              <span>{course.examQuestionCount ?? 0} exam questions</span>
            </div>
            <div className="mt-auto flex flex-wrap gap-2">
              <Link href={`/learn/${course.id}`} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-[#B45309] px-4 text-sm font-semibold text-white hover:bg-[#92400E]">Open course</Link>
              <Link href={`/learn/manage/${course.id}`} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50">Manage</Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
