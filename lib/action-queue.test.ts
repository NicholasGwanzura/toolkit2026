import { describe, expect, it } from 'vitest';
import { buildActionQueue, totalWaiting, type ActionCounts } from './action-queue';

const zero: ActionCounts = {
  applications: 0, applicationsAwaitingEmail: 0, cocRequests: 0, certificateApprovals: 0, certificatesToIssue: 0,
  courseApprovals: 0, reorderReviews: 0, supplierCompliance: 0, openAccidents: 0, rewardRequests: 0,
};

describe('buildActionQueue', () => {
  it('is empty when nothing is waiting', () => {
    expect(buildActionQueue(zero)).toEqual([]);
    expect(totalWaiting([])).toBe(0);
  });

  it('lists only what is waiting, with the right links, applications first', () => {
    const items = buildActionQueue({ ...zero, cocRequests: 3, applications: 2, courseApprovals: 1 });
    expect(items.map((item) => item.key)).toEqual(['applications', 'cocRequests', 'courseApprovals']);
    expect(items[0]).toMatchObject({ count: 2, href: '/admin/applications', label: 'registration applications to review' });
    expect(items[2]).toMatchObject({ count: 1, label: 'course awaiting approval', href: '/learn/approvals' });
    expect(totalWaiting(items)).toBe(6);
  });

  it('mentions applicants who still have to confirm their email', () => {
    const [item] = buildActionQueue({ ...zero, applications: 1, applicationsAwaitingEmail: 4 });
    expect(item.label).toBe('registration application to review');
    expect(item.hint).toBe('4 more waiting for the applicant to confirm their email');
  });

  it('does not list applications that are only waiting on the applicant', () => {
    expect(buildActionQueue({ ...zero, applicationsAwaitingEmail: 4 })).toEqual([]);
  });

  it('separates approving certificates from issuing them', () => {
    const items = buildActionQueue({ ...zero, certificateApprovals: 2, certificatesToIssue: 1 });
    expect(items.map((item) => item.label)).toEqual(['certificate requests to approve', 'approved certificate to issue']);
  });
});
