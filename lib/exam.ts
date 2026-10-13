// Course exams: the questions a trainer writes, what a learner is allowed to see, and automatic marking.
// Pure and shared. The answer key (`correctIndex`) is only ever read on the server.

export const MAX_QUESTIONS = 60;
export const MAX_QUESTION_TEXT = 500;
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;
export const MAX_OPTION_TEXT = 200;
export const MAX_WRITTEN_ANSWER = 2000;

export type QuestionType = 'choice' | 'written';

export interface ExamQuestion {
  id: string;
  type: QuestionType;
  text: string;
  /** Multiple choice only. */
  options?: string[];
  /** Multiple choice only: the position in `options` of the right answer. Never sent to learners. */
  correctIndex?: number;
}

/** A question as a learner sees it: no answer key. */
export interface LearnerQuestion {
  id: string;
  type: QuestionType;
  text: string;
  options?: string[];
}

export const toLearnerQuestions = (questions: ExamQuestion[]): LearnerQuestion[] =>
  questions.map(({ id, type, text, options }) => ({ id, type, text, ...(type === 'choice' ? { options } : {}) }));

const clean = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max + 1) : '');

/**
 * Checks the questions a trainer saved. Returns the cleaned list, or the first problem in plain words.
 * Missing ids are filled in with `makeId`, so a new question is valid without the client inventing ids.
 */
export function validateExamQuestions(value: unknown, makeId: () => string = () => crypto.randomUUID()): { ok: true; questions: ExamQuestion[] } | { ok: false; error: string } {
  if (!Array.isArray(value)) return { ok: false, error: 'Exam questions must be a list.' };
  if (value.length > MAX_QUESTIONS) return { ok: false, error: `An exam can have at most ${MAX_QUESTIONS} questions.` };

  const questions: ExamQuestion[] = [];
  const seen = new Set<string>();
  for (const [index, raw] of value.entries()) {
    const n = index + 1;
    if (!raw || typeof raw !== 'object') return { ok: false, error: `Question ${n} is invalid.` };
    const item = raw as Record<string, unknown>;
    const type: QuestionType = item.type === 'written' ? 'written' : 'choice';
    const text = clean(item.text, MAX_QUESTION_TEXT);
    if (!text) return { ok: false, error: `Question ${n} needs its text.` };
    if (text.length > MAX_QUESTION_TEXT) return { ok: false, error: `Question ${n} must be ${MAX_QUESTION_TEXT} characters or fewer.` };

    let id = typeof item.id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(item.id) ? item.id : makeId();
    if (seen.has(id)) id = makeId();
    seen.add(id);

    if (type === 'written') {
      questions.push({ id, type, text });
      continue;
    }

    if (!Array.isArray(item.options)) return { ok: false, error: `Question ${n} needs answer options.` };
    const options = item.options.map((option) => clean(option, MAX_OPTION_TEXT));
    if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) return { ok: false, error: `Question ${n} needs ${MIN_OPTIONS} to ${MAX_OPTIONS} options.` };
    if (options.some((option) => !option)) return { ok: false, error: `Every option in question ${n} needs text.` };
    if (options.some((option) => option.length > MAX_OPTION_TEXT)) return { ok: false, error: `Options in question ${n} must be ${MAX_OPTION_TEXT} characters or fewer.` };
    if (new Set(options.map((option) => option.toLowerCase())).size !== options.length) return { ok: false, error: `Question ${n} has two options that are the same.` };
    const correctIndex = item.correctIndex;
    if (typeof correctIndex !== 'number' || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
      return { ok: false, error: `Mark which option is correct in question ${n}.` };
    }
    questions.push({ id, type, text, options, correctIndex });
  }
  return { ok: true, questions };
}

/** What a learner sends back for one question. */
export interface SubmittedAnswer {
  questionId: string;
  choice?: number;
  text?: string;
}

export interface MarkedAnswer {
  question: string;
  answer: string;
  /** Present for multiple choice only. Written answers are left for the trainer. */
  correct?: boolean;
}

export type ExamAnswerCheck = { ok: true; answers: SubmittedAnswer[] } | { ok: false; error: string };

/** Every question must be answered exactly once, in a form that fits its type. */
export function checkSubmittedAnswers(questions: ExamQuestion[], value: unknown): ExamAnswerCheck {
  if (!Array.isArray(value)) return { ok: false, error: 'Send your answers as a list.' };
  const byId = new Map<string, SubmittedAnswer>();
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') return { ok: false, error: 'An answer was not understood.' };
    const item = raw as Record<string, unknown>;
    if (typeof item.questionId !== 'string') return { ok: false, error: 'An answer was not understood.' };
    if (byId.has(item.questionId)) return { ok: false, error: 'A question was answered twice.' };
    byId.set(item.questionId, {
      questionId: item.questionId,
      choice: typeof item.choice === 'number' ? item.choice : undefined,
      text: typeof item.text === 'string' ? item.text.trim().slice(0, MAX_WRITTEN_ANSWER) : undefined,
    });
  }
  const answers: SubmittedAnswer[] = [];
  for (const [index, question] of questions.entries()) {
    const answer = byId.get(question.id);
    if (!answer) return { ok: false, error: `Answer question ${index + 1} before submitting.` };
    if (question.type === 'choice') {
      if (!Number.isInteger(answer.choice) || answer.choice! < 0 || answer.choice! >= (question.options?.length ?? 0)) {
        return { ok: false, error: `Choose one of the options for question ${index + 1}.` };
      }
    } else if (!answer.text) {
      return { ok: false, error: `Write an answer for question ${index + 1}.` };
    }
    answers.push(answer);
  }
  if (byId.size !== questions.length) return { ok: false, error: 'An answer was for a question that is not in this exam.' };
  return { ok: true, answers };
}

export interface ExamResult {
  answers: MarkedAnswer[];
  correct: number;
  choiceTotal: number;
  /** True when a trainer must read written answers before there is a final score. */
  needsTrainer: boolean;
  /** Percentage of ALL questions answered correctly, counting written ones as not yet earned. */
  score: number;
}

/** Marks the multiple-choice answers. The answers must already have passed `checkSubmittedAnswers`. */
export function markExam(questions: ExamQuestion[], answers: SubmittedAnswer[]): ExamResult {
  const byId = new Map(answers.map((answer) => [answer.questionId, answer]));
  let correct = 0;
  let choiceTotal = 0;
  const marked: MarkedAnswer[] = questions.map((question) => {
    const answer = byId.get(question.id)!;
    if (question.type === 'written') return { question: question.text, answer: answer.text ?? '' };
    choiceTotal++;
    const isCorrect = answer.choice === question.correctIndex;
    if (isCorrect) correct++;
    return { question: question.text, answer: question.options![answer.choice!], correct: isCorrect };
  });
  const needsTrainer = choiceTotal < questions.length;
  const score = questions.length === 0 ? 0 : Math.round((correct / questions.length) * 10000) / 100;
  return { answers: marked, correct, choiceTotal, needsTrainer, score };
}
