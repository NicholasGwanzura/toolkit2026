'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Award, BookOpen, CheckCircle2, ClipboardCheck } from 'lucide-react';
import { useCourses, useExamSubmissions, type ExamSubmission } from '@/lib/platformStore';
import { useCourseProgress } from '@/lib/api';
import { courseToContinue } from '@/lib/course-journey';
import type { UserSession } from '@/lib/session-types';
import DashboardEventsCalendar from '@/components/dashboard/DashboardEventsCalendar';

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-ZW', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
}

function statusLabel(submission: ExamSubmission) {
  if (submission.status === 'pending') return 'Awaiting review';
  return submission.passed ? 'Passed' : 'Needs another attempt';
}

function statusClasses(submission: ExamSubmission) {
  if (submission.status === 'pending') return 'bg-amber-50 text-amber-700';
  return submission.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700';
}

export default function LearnerDashboard({ session, children }: { session: UserSession; children?: ReactNode }) {
  const { data: courses, error: coursesError, isLoading: coursesLoading } = useCourses();
  const { data: submissions, error: submissionsError, isLoading: submissionsLoading } = useExamSubmissions();
  const { data: progress } = useCourseProgress();

  const approvedCourses = (courses ?? []).filter(course => course.status === 'approved');
  const learnerSubmissions = submissions ?? [];
  const passedAssessments = learnerSubmissions.filter(submission => submission.status === 'graded' && submission.passed).length;
  const recentSubmissions = [...learnerSubmissions]
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    .slice(0, 3);
  const next = courseToContinue(approvedCourses, progress ?? []);
  const loading = coursesLoading || submissionsLoading;

  return (
    <section className="space-y-5" aria-labelledby="learner-overview-title">
      <div className="rounded-2xl bg-slate-950 px-5 py-6 text-white shadow-sm sm:px-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 id="learner-overview-title" className="text-2xl font-bold tracking-tight">Welcome back, {session.name}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              {next ? <>{next.begun ? 'Pick up where you left off in ' : 'Up next: '}<span className="font-semibold text-white">{next.course.title}</span>.</> : 'You have finished the modules in every available course. Check your exam results below.'}
            </p>
          </div>
          {next && (
            <Link href={`/learn/${next.course.id}`} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#B45309] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#92400E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
              {next.begun ? 'Continue learning' : 'Start learning'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-3" aria-label="Loading learner summary">
          {[0, 1, 2].map(item => <div key={item} className="h-24 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />)}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCard icon={<BookOpen className="h-5 w-5" aria-hidden="true" />} label="Available courses" value={approvedCourses.length} tone="blue" />
          <SummaryCard icon={<ClipboardCheck className="h-5 w-5" aria-hidden="true" />} label="Exams submitted" value={learnerSubmissions.length} tone="amber" />
          <SummaryCard icon={<Award className="h-5 w-5" aria-hidden="true" />} label="Exams passed" value={passedAssessments} tone="green" />
        </div>
      )}

      {(coursesError || submissionsError) && (
        <p role="alert" className="text-sm text-red-600">Some learner summary data could not be loaded. Your course list is still available below.</p>
      )}

      <div id="available-courses" className="scroll-mt-4 space-y-3">
        <h3 className="text-lg font-bold text-gray-900">Your courses</h3>
        {children}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm" aria-labelledby="recent-assessments-title">
          <div className="flex items-center justify-between gap-3">
            <h3 id="recent-assessments-title" className="text-lg font-bold text-gray-900">Recent exams</h3>
            <span className="text-xs font-medium text-gray-500">{learnerSubmissions.length} total</span>
          </div>
          {recentSubmissions.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">No exams submitted yet. Finish a course&apos;s modules to unlock its exam.</p>
          ) : (
            <div className="mt-4 divide-y divide-gray-100">
              {recentSubmissions.map(submission => (
                <div key={submission.id} className="flex flex-col gap-2 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{submission.courseTitle}</p>
                    <p className="mt-1 text-xs text-gray-500">Submitted {formatDate(submission.submittedAt)}{submission.score !== undefined ? `, ${submission.score}%` : ''}</p>
                  </div>
                  <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(submission)}`}>
                    {statusLabel(submission)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-bold text-gray-900">How it works</h3>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
          </div>
          <p className="mt-2 text-sm leading-6 text-gray-600">Finish the modules, pass the exam, and your trainer requests your certificate. HEVACRAZ then reviews and issues it.</p>
          <Link href="/certifications" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
            View certifications <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <DashboardEventsCalendar />
    </section>
  );
}

function SummaryCard({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number; tone: 'blue' | 'amber' | 'green' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-emerald-50 text-emerald-700',
  };
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colors[tone]}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-950">{value}</p>
        <p className="text-xs font-medium text-gray-500">{label}</p>
      </div>
    </div>
  );
}
