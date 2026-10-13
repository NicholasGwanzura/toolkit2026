'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CourseEditor } from '@/components/course-management/CourseEditor';
import { useAuth } from '@/lib/auth';

export default function EditCoursePage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const allowed = user?.role === 'trainer' || user?.role === 'lecturer' || user?.role === 'org_admin';

  useEffect(() => {
    if (!isLoading && !allowed) router.replace('/dashboard');
  }, [isLoading, allowed, router]);

  if (isLoading || !allowed) return <p className="p-4 text-sm text-stone-500">Loading…</p>;
  return <CourseEditor courseId={id} />;
}
