// Is a course ready to send for approval? Mirrors the server's rules (see app/api/courses/course-validation.ts)
// so the editor can tell the trainer what is missing before they press Submit. Pure, so it can be tested.

export interface CourseDraft {
  title: string;
  description: string;
  passMark: number;
  cpdCredits: number;
  modules: Array<{ title: string; content: string; minutes: number }>;
  /** The exam questions. Optional so older callers still work. */
  examQuestions?: Array<{ type: 'choice' | 'written'; text: string; options?: string[]; correctIndex?: number }>;
}

export interface ReadinessItem {
  id: string;
  label: string;
  ok: boolean;
  /** The editor section that fixes it. */
  section: 'details' | 'modules' | 'exam';
}

export const MAX_TITLE = 180;
export const MAX_DESCRIPTION = 3000;
export const MAX_MODULE_MINUTES = 480;

export function totalMinutes(modules: Array<{ minutes: number }>): number {
  return modules.reduce((sum, module) => sum + (Number.isFinite(module.minutes) ? module.minutes : 0), 0);
}

export function formatMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0 min';
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** The first problem with the modules, in the server's wording, or an empty string when they are fine. */
export function moduleProblem(modules: CourseDraft['modules'], options: { draft?: boolean } = {}): string {
  if (modules.length === 0) return 'Add at least one module.';
  for (const [index, module] of modules.entries()) {
    if (!module.title.trim()) return `Module ${index + 1} needs a title.`;
    if (!module.content.trim() && !options.draft) return `Module ${index + 1} needs learning content.`;
    if (!Number.isFinite(module.minutes) || module.minutes < 1 || module.minutes > MAX_MODULE_MINUTES) {
      return `Module ${index + 1} minutes must be between 1 and ${MAX_MODULE_MINUTES}.`;
    }
  }
  return '';
}

/** The first problem with the title, description, pass mark or CPD credits, as a sentence, or '' when they are fine. */
export function basicsProblem(course: Pick<CourseDraft, 'title' | 'description' | 'passMark' | 'cpdCredits'>): string {
  const title = course.title.trim();
  const description = course.description.trim();
  if (!title) return 'The course needs a title.';
  if (title.length > MAX_TITLE) return `The title must be ${MAX_TITLE} characters or fewer.`;
  if (!description) return 'The course needs a description.';
  if (description.length > MAX_DESCRIPTION) return `The description must be ${MAX_DESCRIPTION} characters or fewer.`;
  if (!Number.isInteger(course.passMark) || course.passMark < 1 || course.passMark > 100) return 'The pass mark must be a whole number from 1 to 100.';
  if (!Number.isInteger(course.cpdCredits) || course.cpdCredits < 0 || course.cpdCredits > 100) return 'CPD credits must be a whole number from 0 to 100.';
  return '';
}

/** The first problem with the exam questions, as a sentence, or '' when they are fine. Mirrors lib/exam.ts. */
export function examProblem(questions: NonNullable<CourseDraft['examQuestions']>): string {
  if (questions.length === 0) return 'Add at least one exam question.';
  for (const [index, q] of questions.entries()) {
    const n = index + 1;
    if (!q.text.trim()) return `Question ${n} needs its text.`;
    if (q.type === 'choice') {
      const options = q.options ?? [];
      if (options.length < 2) return `Question ${n} needs at least 2 options.`;
      if (options.some((option) => !option.trim())) return `Every option in question ${n} needs text.`;
      if (new Set(options.map((option) => option.trim().toLowerCase())).size !== options.length) return `Question ${n} has two options that are the same.`;
      if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex >= options.length) return `Mark which option is correct in question ${n}.`;
    }
  }
  return '';
}

export function courseReadiness(course: CourseDraft): { items: ReadinessItem[]; ready: boolean; missing: ReadinessItem[] } {
  const title = course.title.trim();
  const description = course.description.trim();
  const problem = moduleProblem(course.modules);
  const items: ReadinessItem[] = [
    { id: 'title', label: 'The course has a title', ok: title.length > 0 && title.length <= MAX_TITLE, section: 'details' },
    { id: 'description', label: 'The course has a description', ok: description.length > 0 && description.length <= MAX_DESCRIPTION, section: 'details' },
    { id: 'pass-mark', label: 'The pass mark is between 1 and 100', ok: Number.isInteger(course.passMark) && course.passMark >= 1 && course.passMark <= 100, section: 'details' },
    { id: 'cpd', label: 'CPD credits are between 0 and 100', ok: Number.isInteger(course.cpdCredits) && course.cpdCredits >= 0 && course.cpdCredits <= 100, section: 'details' },
    { id: 'modules', label: 'There is at least one module', ok: course.modules.length > 0, section: 'modules' },
    { id: 'exam', label: course.examQuestions && course.examQuestions.length > 0 ? (examProblem(course.examQuestions) || 'The exam has questions with a marked answer') : 'The exam has at least one question', ok: !!course.examQuestions && examProblem(course.examQuestions) === '', section: 'exam' },
    { id: 'module-content', label: problem && course.modules.length > 0 ? problem : 'Every module has a title, content and a time', ok: course.modules.length > 0 && problem === '', section: 'modules' },
  ];
  const missing = items.filter((item) => !item.ok);
  return { items, ready: missing.length === 0, missing };
}

/** A changed course needs saving. Compares the fields a trainer edits, ignoring key order and attachments. */
export function isDirty(a: CourseDraft, b: CourseDraft): boolean {
  const pick = (c: CourseDraft) => JSON.stringify({
    t: c.title, d: c.description, p: c.passMark, c: c.cpdCredits,
    q: (c.examQuestions ?? []).map((x) => [x.type, x.text, x.options ?? [], x.correctIndex ?? -1]),
    m: c.modules.map((m) => [m.title, m.content, m.minutes, (m as { attachments?: Array<{ id: string }> }).attachments?.map((x) => x.id) ?? []]),
  });
  return pick(a) !== pick(b);
}
