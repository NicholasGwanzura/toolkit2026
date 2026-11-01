import { describe, expect, it } from 'vitest';
import { courseStage, courseToContinue, journeyStep, nextModuleIndex } from './course-journey';

const exam = { hasExam: true, passed: false, waitingForGrading: false, attemptsLeft: 3 };
const done = { started: true, completedModules: [0, 1], moduleCount: 2 };

describe('courseStage', () => {
  it('follows the learner through the course', () => {
    expect(courseStage({ started: false, completedModules: [], moduleCount: 2 })).toBe('not-started');
    expect(courseStage({ started: true, completedModules: [0], moduleCount: 2, exam })).toBe('in-progress');
    expect(courseStage({ ...done, exam })).toBe('exam-ready');
    expect(courseStage({ ...done, exam: { ...exam, waitingForGrading: true } })).toBe('awaiting-result');
    expect(courseStage({ ...done, exam: { ...exam, passed: true } })).toBe('passed');
  });
  it('says when the exam cannot be taken', () => {
    expect(courseStage({ ...done, exam: { ...exam, hasExam: false } })).toBe('no-exam');
    expect(courseStage({ ...done, exam: { ...exam, attemptsLeft: 0 } })).toBe('attempts-used');
  });
  it('does not claim the exam is ready before it has loaded', () => {
    expect(courseStage(done)).toBe('in-progress');
  });
  it('keeps a pass even if a module is later unticked', () => {
    expect(courseStage({ started: true, completedModules: [], moduleCount: 2, exam: { ...exam, passed: true } })).toBe('passed');
  });
});

describe('journeyStep', () => {
  it('maps each stage to a step', () => {
    expect(journeyStep('in-progress')).toBe(0);
    expect(journeyStep('exam-ready')).toBe(1);
    expect(journeyStep('attempts-used')).toBe(1);
    expect(journeyStep('awaiting-result')).toBe(2);
    expect(journeyStep('passed')).toBe(3);
  });
});

describe('nextModuleIndex', () => {
  it('finds the first unfinished module, even out of order', () => {
    expect(nextModuleIndex([0, 2], 4)).toBe(1);
    expect(nextModuleIndex([], 3)).toBe(0);
  });
  it('stays on the last module when all are done', () => {
    expect(nextModuleIndex([0, 1, 2], 3)).toBe(2);
    expect(nextModuleIndex([], 0)).toBe(0);
  });
});

describe('courseToContinue', () => {
  const a = { id: 'a', modules: [1, 2] };
  const b = { id: 'b', modules: [1] };
  it('prefers a course already begun', () => {
    expect(courseToContinue([b, a], [{ courseId: 'a', completedModules: [0] }])).toEqual({ course: a, begun: true });
  });
  it('moves past finished courses', () => {
    expect(courseToContinue([a, b], [{ courseId: 'a', completedModules: [0, 1] }])).toEqual({ course: b, begun: false });
  });
  it('has nothing to offer when everything is finished', () => {
    expect(courseToContinue([b], [{ courseId: 'b', completedModules: [0] }])).toBeNull();
  });
});
