// Where a learner is on one course, shown the same way on the course card and the course page. Pure, so it can be tested.
import { allModulesComplete, sanitizeCompletedModules } from './course-progress';

export type CourseStage = 'not-started' | 'in-progress' | 'exam-ready' | 'no-exam' | 'attempts-used' | 'awaiting-result' | 'passed';

export interface StageInput {
  started: boolean;
  completedModules: unknown;
  moduleCount: number;
  /** Absent until the learner is enrolled and the exam has loaded. */
  exam?: { hasExam: boolean; passed: boolean; waitingForGrading: boolean; attemptsLeft: number };
}

export function courseStage({ started, completedModules, moduleCount, exam }: StageInput): CourseStage {
  if (exam?.passed) return 'passed';
  if (exam?.waitingForGrading) return 'awaiting-result';
  if (!started) return 'not-started';
  if (!exam || !allModulesComplete(completedModules, moduleCount)) return 'in-progress';
  if (!exam.hasExam) return 'no-exam';
  return exam.attemptsLeft > 0 ? 'exam-ready' : 'attempts-used';
}

export const STAGE_META: Record<CourseStage, { label: string; className: string }> = {
  'not-started': { label: 'Not started', className: 'bg-gray-100 text-gray-700' },
  'in-progress': { label: 'In progress', className: 'bg-blue-50 text-blue-700' },
  'exam-ready': { label: 'Exam ready', className: 'bg-amber-50 text-amber-800' },
  'no-exam': { label: 'Exam not ready', className: 'bg-gray-100 text-gray-700' },
  'attempts-used': { label: 'Attempts used', className: 'bg-rose-50 text-rose-700' },
  'awaiting-result': { label: 'Awaiting result', className: 'bg-amber-50 text-amber-800' },
  passed: { label: 'Passed', className: 'bg-emerald-50 text-emerald-700' },
};

export const JOURNEY_STEPS = ['Modules', 'Exam', 'Result', 'Certificate'] as const;

/** The step the learner is on, counting from zero. Earlier steps are done. */
export function journeyStep(stage: CourseStage): number {
  if (stage === 'not-started' || stage === 'in-progress') return 0;
  if (stage === 'awaiting-result') return 2;
  return stage === 'passed' ? 3 : 1;
}

/** The first module not yet finished, or the last one when all are done, so "continue" always has somewhere to go. */
export function nextModuleIndex(completedModules: unknown, moduleCount: number): number {
  const done = new Set(sanitizeCompletedModules(completedModules, moduleCount));
  for (let index = 0; index < moduleCount; index++) if (!done.has(index)) return index;
  return Math.max(0, moduleCount - 1);
}

/** The course to send a learner to next: one they have begun and not finished, otherwise the first they have not begun. */
export function courseToContinue<T extends { id: string; modules: unknown[] }>(
  courses: T[],
  progress: Array<{ courseId: string; completedModules: unknown }>,
): { course: T; begun: boolean } | null {
  const saved = new Map(progress.map((entry) => [entry.courseId, entry.completedModules]));
  const unfinished = courses.find((course) => saved.has(course.id) && !allModulesComplete(saved.get(course.id), course.modules.length));
  if (unfinished) return { course: unfinished, begun: true };
  const fresh = courses.find((course) => !saved.has(course.id));
  return fresh ? { course: fresh, begun: false } : null;
}
