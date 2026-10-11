import { describe, expect, it } from 'vitest';
import { notificationTemplates as t } from './notification-templates';

describe('notification templates', () => {
  it('welcomes a new account and links to the dashboard', () => {
    expect(t.welcome('Trainer / Assessor')).toMatchObject({ kind: 'welcome', link: '/dashboard' });
    expect(t.welcome('Student').body).toContain('student account');
  });

  it('covers COC approval and rejection', () => {
    expect(t.cocDecision(true, 'Harare site')).toMatchObject({ kind: 'coc_approved', link: '/certifications' });
    expect(t.cocDecision(true, 'Harare site').body).toContain('for Harare site');
    expect(t.cocDecision(false)).toMatchObject({ kind: 'coc_rejected', link: '/jobs' });
    expect(t.cocDecision(false).body).not.toContain('for undefined');
  });

  it('covers every certificate request outcome', () => {
    expect(t.certificateRequest('issued', 'RAC Safety', 'Tendai').kind).toBe('certificate_issued');
    expect(t.certificateRequest('admin-approved', 'RAC Safety', 'Tendai').kind).toBe('certificate_approved');
    expect(t.certificateRequest('rejected', 'RAC Safety', 'Tendai').kind).toBe('certificate_rejected');
  });

  it('tells an author why a course came back, only when there is a reason', () => {
    expect(t.courseDecision('returned', 'Intro', 'Fix module 2').body).toContain('Reason: Fix module 2');
    expect(t.courseDecision('rejected', 'Intro').body).not.toContain('Reason');
    expect(t.courseDecision('approved', 'Intro').kind).toBe('course_approved');
  });

  it('reports exam results with the score', () => {
    expect(t.examGraded('Intro', true, 82)).toMatchObject({ kind: 'exam_passed', title: 'You passed' });
    expect(t.examGraded('Intro', false, 45).body).toContain('45%');
  });

  it('reports each reorder stage', () => {
    const base = { gasType: 'R-290', quantityKg: 1250.5 };
    expect(t.reorderDecision({ ...base, approved: true, stage: 'hevacraz' }).kind).toBe('reorder_stage_one');
    expect(t.reorderDecision({ ...base, approved: true, stage: 'nou' }).kind).toBe('reorder_approved');
    const rejected = t.reorderDecision({ ...base, approved: false, stage: 'nou', reason: 'Quota exceeded' });
    expect(rejected.kind).toBe('reorder_rejected');
    expect(rejected.body).toContain('Quota exceeded');
    expect(rejected.body).toContain('1,250.5 kg of R-290');
  });

  it('words reward decisions and keeps the reason', () => {
    const ok = t.rewardDecision({ fulfilled: true, rewardTitle: 'PPE Kit', points: 200 });
    expect(ok.kind).toBe('reward_fulfilled');
    const no = t.rewardDecision({ fulfilled: false, rewardTitle: 'PPE Kit', points: 200, reason: 'Out of stock' });
    expect(no.kind).toBe('reward_rejected');
    expect(no.body).toContain('Out of stock');
    expect(no.body).toContain('available again');
  });
});
