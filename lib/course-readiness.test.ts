import { describe, expect, it } from 'vitest';
import { basicsProblem, courseReadiness, formatMinutes, isDirty, moduleProblem, totalMinutes, type CourseDraft } from './course-readiness';

const good: CourseDraft = {
  title: 'Safe handling of R-290',
  description: 'Covers leak response, PPE and charging limits.',
  passMark: 70,
  cpdCredits: 12,
  modules: [{ title: 'Introduction', content: 'What R-290 is and why it is flammable.', minutes: 30 }],
};

describe('courseReadiness', () => {
  it('passes a complete course', () => {
    const result = courseReadiness(good);
    expect(result.ready).toBe(true);
    expect(result.missing).toEqual([]);
  });
  it('lists what is missing and where to fix it', () => {
    const result = courseReadiness({ ...good, title: ' ', modules: [] });
    expect(result.ready).toBe(false);
    expect(result.missing.map((item) => item.id)).toEqual(['title', 'modules', 'module-content']);
    expect(result.missing[0].section).toBe('details');
    expect(result.missing[1].section).toBe('modules');
  });
  it('flags an out-of-range pass mark or CPD value', () => {
    expect(courseReadiness({ ...good, passMark: 0 }).ready).toBe(false);
    expect(courseReadiness({ ...good, passMark: 101 }).ready).toBe(false);
    expect(courseReadiness({ ...good, cpdCredits: -1 }).ready).toBe(false);
    expect(courseReadiness({ ...good, passMark: 70.5 }).ready).toBe(false);
  });
});

describe('moduleProblem', () => {
  it('names the module and the problem, as the server does', () => {
    expect(moduleProblem([])).toBe('Add at least one module.');
    expect(moduleProblem([{ title: 'A', content: 'x', minutes: 5 }, { title: '', content: 'x', minutes: 5 }])).toBe('Module 2 needs a title.');
    expect(moduleProblem([{ title: 'A', content: ' ', minutes: 5 }])).toBe('Module 1 needs learning content.');
    expect(moduleProblem([{ title: 'A', content: 'x', minutes: 0 }])).toMatch(/minutes must be between 1 and 480/);
    expect(moduleProblem([{ title: 'A', content: 'x', minutes: 481 }])).toMatch(/minutes must be between 1 and 480/);
    expect(moduleProblem(good.modules)).toBe('');
  });
});

describe('time helpers', () => {
  it('adds and formats minutes', () => {
    expect(totalMinutes([{ minutes: 30 }, { minutes: 45 }])).toBe(75);
    expect(formatMinutes(75)).toBe('1 h 15 min');
    expect(formatMinutes(120)).toBe('2 h');
    expect(formatMinutes(20)).toBe('20 min');
    expect(formatMinutes(0)).toBe('0 min');
  });
});

describe('isDirty', () => {
  it('detects edits and ignores no-ops', () => {
    expect(isDirty(good, { ...good })).toBe(false);
    expect(isDirty(good, { ...good, title: 'Other' })).toBe(true);
    expect(isDirty(good, { ...good, modules: [{ ...good.modules[0], minutes: 31 }] })).toBe(true);
  });
});

describe('basicsProblem', () => {
  it('gives the first problem as a sentence', () => {
    expect(basicsProblem(good)).toBe('');
    expect(basicsProblem({ ...good, title: '  ' })).toBe('The course needs a title.');
    expect(basicsProblem({ ...good, description: '' })).toBe('The course needs a description.');
    expect(basicsProblem({ ...good, passMark: 0 })).toMatch(/pass mark/);
    expect(basicsProblem({ ...good, cpdCredits: 101 })).toMatch(/CPD credits/);
    expect(basicsProblem({ ...good, title: 'x'.repeat(181) })).toMatch(/180/);
  });
});
