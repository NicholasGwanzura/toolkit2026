'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CoursePage } from '@/components/learn/CoursePage';
import { useAuth } from '@/lib/auth';
import { isFieldWorkerRole } from '@/lib/field-worker';

export default function LearnCoursePage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === 'org_admin';
  const canOpen = isAdmin || user?.role === 'student' || isFieldWorkerRole(user?.role);

  // Learner progress belongs to learners, and administrators read the course as a preview. Authors manage theirs.
  useEffect(() => {
    if (!isLoading && !canOpen) router.replace(`/learn/manage/${id}`);
  }, [isLoading, canOpen, router, id]);

  if (isLoading || !canOpen) return <p className="p-4 text-sm text-gray-500">Loading…</p>;
  return <CoursePage courseId={id} preview={isAdmin} />;
}
