import { describe, expect, it } from 'vitest';
import { checkSubmittedAnswers, markExam, toLearnerQuestions, validateExamQuestions, type ExamQuestion } from './exam';

let counter = 0;
const id = () => `gen-${++counter}`;
const q1 = { type: 'choice', text: 'What safety class is R-290?', options: ['A1', 'A2L', 'A3'], correctIndex: 2 };
const q2 = { type: 'choice', text: 'Which tool finds leaks?', options: ['Spanner', 'Leak detector'], correctIndex: 1 };
const q3 = { type: 'written', text: 'Describe the steps after a leak.' };

describe('validateExamQuestions', () => {
  it('accepts good questions and fills in ids', () => {
    const result = validateExamQuestions([q1, q3], id);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.questions).toHaveLength(2);
      expect(result.questions[0]).toMatchObject({ type: 'choice', correctIndex: 2, options: ['A1', 'A2L', 'A3'] });
      expect(result.questions[1]).toEqual({ id: expect.any(String), type: 'written', text: 'Describe the steps after a leak.' });
    }
  });
  it('keeps existing ids and replaces duplicates', () => {
    const result = validateExamQuestions([{ ...q1, id: 'a' }, { ...q2, id: 'a' }], id);
    expect(result.ok && result.questions[0].id).toBe('a');
    expect(result.ok && result.questions[1].id).not.toBe('a');
  });
  it('explains what is wrong', () => {
    const bad = (value: unknown) => { const r = validateExamQuestions(value, id); return r.ok ? '' : r.error; };
    expect(bad('x')).toMatch(/list/);
    expect(bad([{ ...q1, text: ' ' }])).toBe('Question 1 needs its text.');
    expect(bad([{ ...q1, options: ['only'] }])).toMatch(/2 to 6 options/);
    expect(bad([{ ...q1, options: ['A', ''] }])).toMatch(/needs text/);
    expect(bad([{ ...q1, options: ['A', 'a'], correctIndex: 0 }])).toMatch(/two options that are the same/);
    expect(bad([{ ...q1, correctIndex: 5 }])).toMatch(/Mark which option is correct in question 1/);
    expect(bad([{ ...q1, correctIndex: undefined }])).toMatch(/Mark which option is correct/);
    expect(bad(Array.from({ length: 61 }, () => q1))).toMatch(/at most 60/);
  });
});

describe('toLearnerQuestions', () => {
  it('never includes the answer key', () => {
    const result = validateExamQuestions([q1, q3], id);
    const learner = toLearnerQuestions(result.ok ? result.questions : []);
    expect(JSON.stringify(learner)).not.toContain('correctIndex');
    expect(learner[0].options).toEqual(['A1', 'A2L', 'A3']);
    expect(learner[1]).not.toHaveProperty('options');
  });
});

describe('checkSubmittedAnswers and markExam', () => {
  const questions: ExamQuestion[] = (() => { const r = validateExamQuestions([q1, q2], () => `q${++counter}`); return r.ok ? r.questions : []; })();

  it('requires every question to be answered, in the right form', () => {
    const [a, b] = questions;
    expect(checkSubmittedAnswers(questions, [{ questionId: a.id, choice: 2 }]).ok).toBe(false);
    expect(checkSubmittedAnswers(questions, [{ questionId: a.id, choice: 9 }, { questionId: b.id, choice: 0 }]).ok).toBe(false);
    expect(checkSubmittedAnswers(questions, [{ questionId: a.id, choice: 2 }, { questionId: a.id, choice: 2 }]).ok).toBe(false);
    expect(checkSubmittedAnswers(questions, [{ questionId: a.id, choice: 2 }, { questionId: b.id, choice: 1 }, { questionId: 'nope', choice: 0 }]).ok).toBe(false);
    expect(checkSubmittedAnswers(questions, 'x').ok).toBe(false);
  });
  it('marks choice questions and scores out of all questions', () => {
    const [a, b] = questions;
    const checked = checkSubmittedAnswers(questions, [{ questionId: a.id, choice: 2 }, { questionId: b.id, choice: 0 }]);
    expect(checked.ok).toBe(true);
    if (checked.ok) {
      const result = markExam(questions, checked.answers);
      expect(result).toMatchObject({ correct: 1, choiceTotal: 2, needsTrainer: false, score: 50 });
      expect(result.answers).toEqual([
        { question: 'What safety class is R-290?', answer: 'A3', correct: true },
        { question: 'Which tool finds leaks?', answer: 'Spanner', correct: false },
      ]);
    }
  });
  it('leaves written answers for the trainer', () => {
    const mixed = validateExamQuestions([q1, q3], () => `m${++counter}`);
    const qs = mixed.ok ? mixed.questions : [];
    const checked = checkSubmittedAnswers(qs, [{ questionId: qs[0].id, choice: 2 }, { questionId: qs[1].id, text: ' Isolate and ventilate ' }]);
    expect(checked.ok).toBe(true);
    if (checked.ok) {
      const result = markExam(qs, checked.answers);
      expect(result.needsTrainer).toBe(true);
      expect(result.score).toBe(50);
      expect(result.answers[1]).toEqual({ question: 'Describe the steps after a leak.', answer: 'Isolate and ventilate' });
    }
    expect(checkSubmittedAnswers(qs, [{ questionId: qs[0].id, choice: 2 }, { questionId: qs[1].id, text: ' ' }]).ok).toBe(false);
  });
});
