'use client';

import { useState } from 'react';
import { enrollInCourse, type ManagedCourse } from '@/lib/platformStore';
import { saveCourseProgress, type CourseProgressEntry } from '@/lib/api';
import { sanitizeCompletedModules } from '@/lib/course-progress';

type LegacyProgress = { started: boolean; completedModules: number[] };

function progressKey(courseId: string) {
  return `coolpro_course_progress_${courseId}`;
}

function readLegacyProgress(course: ManagedCourse): LegacyProgress {
  if (typeof window === 'undefined') return { started: false, completedModules: [] };
  try {
    const saved = window.localStorage.getItem(progressKey(course.id));
    if (!saved) return { started: false, completedModules: [] };
    const progress = JSON.parse(saved) as Partial<LegacyProgress>;
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

/** A learner's place in one course: starting it, and ticking modules off. Shared by the course card and the course page. */
export function useCourseLearning(course: ManagedCourse, saved: CourseProgressEntry | undefined, enrolled: boolean) {
  // Progress used to live only in this browser. Read it once so nobody loses work they already did.
  const [legacy] = useState<LegacyProgress>(() => readLegacyProgress(course));
  // What the learner just ticked, shown straight away while it saves.
  const [pending, setPending] = useState<number[] | null>(null);
  const [unsaved, setUnsaved] = useState<number[] | null>(null);
  const [error, setError] = useState('');
  const savedModules = saved ? sanitizeCompletedModules(saved.completedModules, course.modules.length) : null;
  const completed = pending ?? savedModules ?? legacy.completedModules;
  const started = enrolled || Boolean(saved) || legacy.started || pending !== null;

  async function persist(next: number[]): Promise<boolean> {
    const before = pending;
    setPending(next);
    setError('');
    setUnsaved(null);
    try {
      await saveCourseProgress(course.id, next);
      window.localStorage.removeItem(progressKey(course.id));
      return true;
    } catch (err) {
      // Show the truth: a tick that did not save must not look saved.
      setPending(before);
      setUnsaved(next);
      setError(err instanceof Error ? `Your progress was not saved: ${err.message}` : 'Your progress was not saved.');
      return false;
    }
  }

  async function start(): Promise<boolean> {
    setError('');
    try {
      // Enrolment unlocks the course materials and its exam.
      await enrollInCourse(course.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not enrol in this course');
      return false;
    }
    // Carry over any progress that was only saved in this browser before.
    if (saved) return true;
    return persist(legacy.completedModules);
  }

  function setModuleComplete(index: number, complete: boolean) {
    const others = completed.filter((item) => item !== index);
    return persist(complete ? [...others, index].sort((a, b) => a - b) : others);
  }

  return { completed, started, error, start, setModuleComplete, retry: unsaved ? () => persist(unsaved) : null };
}
