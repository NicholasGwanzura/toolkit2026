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
  const isLearner = user?.role === 'student' || isFieldWorkerRole(user?.role);

  // Learner progress belongs to learners. Everyone else manages the course instead.
  useEffect(() => {
    if (!isLoading && !isLearner) router.replace(`/learn/manage/${id}`);
  }, [isLoading, isLearner, router, id]);

  if (isLoading || !isLearner) return <p className="p-4 text-sm text-gray-500">Loading…</p>;
  return <CoursePage courseId={id} />;
}
