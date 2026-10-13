'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ClipboardCheck, BookOpen } from 'lucide-react';
import { Tab, TabList, TabPanel, Tabs } from '@/components/base/tabs/tabs';
import { CourseList } from '@/components/course-management/CourseList';
import { GradingQueue } from '@/components/course-management/GradingQueue';
import { useAuth } from '@/lib/auth';
import { useCourses, useExamSubmissions } from '@/lib/api';

function ManageCourses() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') === 'grading' ? 'grading' : 'courses';
  const allowed = user?.role === 'trainer' || user?.role === 'lecturer' || user?.role === 'org_admin';
  const { data: submissions } = useExamSubmissions(allowed);
  const { data: courses } = useCourses(allowed);

  useEffect(() => {
    if (!isLoading && !allowed) router.replace('/dashboard');
  }, [isLoading, allowed, router]);

  if (isLoading || !allowed) return <p className="p-4 text-sm text-stone-500">Loading…</p>;

  const mine = new Set((courses ?? []).map((course) => course.id));
  const waiting = (submissions ?? []).filter((item) => item.status === 'pending' && mine.has(item.courseId)).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Course management</h1>
        <p className="mt-1 text-sm text-stone-600">Build courses, send them for approval, and grade learners&apos; exams.</p>
      </div>
      <Tabs selectedKey={tab} onSelectionChange={(key) => router.replace(`/learn/manage${key === 'grading' ? '?tab=grading' : ''}`, { scroll: false })} className="gap-0">
        <TabList aria-label="Course management">
          <Tab id="courses" icon={BookOpen}>Courses</Tab>
          <Tab id="grading" icon={ClipboardCheck} count={waiting || undefined}>Grading</Tab>
        </TabList>
        <TabPanel id="courses" className="pt-5"><CourseList /></TabPanel>
        <TabPanel id="grading" className="pt-5"><GradingQueue /></TabPanel>
      </Tabs>
    </div>
  );
}

export default function LearnManagePage() {
  return <Suspense fallback={null}><ManageCourses /></Suspense>;
}
