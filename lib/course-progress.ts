// Course progress rules, shared by the server and the learner screens.

/** Keeps only whole, in-range, unique module numbers, sorted. Anything else is dropped. */
export function sanitizeCompletedModules(input: unknown, moduleCount: number): number[] {
  if (!Array.isArray(input)) return [];
  const valid = new Set<number>();
  for (const value of input) {
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < moduleCount) valid.add(value);
  }
  return [...valid].sort((a, b) => a - b);
}

export function progressPercent(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((completed / total) * 100));
}

/** The exam opens once every module is ticked off. A course with no modules has nothing to finish first. */
export function allModulesComplete(completed: unknown, moduleCount: number): boolean {
  return sanitizeCompletedModules(completed, moduleCount).length >= moduleCount;
}

export type ExamState = 'not-taken' | 'awaiting-grading' | 'passed' | 'failed';

/** Where a learner stands on one course's exam, given their submissions for it. */
export function examState(submissions: Array<{ status: string; passed?: boolean | null }>): { state: ExamState; attempts: number } {
  const graded = submissions.filter((s) => s.status === 'graded');
  if (graded.some((s) => s.passed === true)) return { state: 'passed', attempts: submissions.length };
  if (submissions.some((s) => s.status === 'pending')) return { state: 'awaiting-grading', attempts: submissions.length };
  if (graded.length > 0) return { state: 'failed', attempts: submissions.length };
  return { state: 'not-taken', attempts: 0 };
}
