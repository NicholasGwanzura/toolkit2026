// The "needs your action" list on the admin dashboard. Pure: turns raw counts into ordered items.

export interface ActionCounts {
  applications: number;
  applicationsAwaitingEmail: number;
  emailProblems: number;
  cocRequests: number;
  certificateApprovals: number;
  certificatesToIssue: number;
  courseApprovals: number;
  reorderReviews: number;
  supplierCompliance: number;
  openAccidents: number;
  rewardRequests: number;
}

export interface ActionItem {
  key: keyof ActionCounts;
  count: number;
  label: string;
  hint?: string;
  href: string;
}

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

/** Items with something waiting, most time-sensitive first. Empty when there is nothing to do. */
export function buildActionQueue(counts: ActionCounts): ActionItem[] {
  const items: ActionItem[] = [
    {
      key: 'applications',
      count: counts.applications,
      label: plural(counts.applications, 'registration application to review', 'registration applications to review'),
      hint: counts.applicationsAwaitingEmail > 0 ? `${counts.applicationsAwaitingEmail} more waiting for the applicant to confirm their email` : undefined,
      href: '/admin/applications',
    },
    {
      key: 'emailProblems',
      count: counts.emailProblems,
      label: plural(counts.emailProblems, 'email delivery problem to review', 'email delivery problems to review'),
      hint: 'Bounced, failed or marked as spam in the email log',
      href: '/admin/email-log',
    },
    { key: 'cocRequests', count: counts.cocRequests, label: plural(counts.cocRequests, 'COC request to review', 'COC requests to review'), href: '/admin/coc-requests' },
    { key: 'certificateApprovals', count: counts.certificateApprovals, label: plural(counts.certificateApprovals, 'certificate request to approve', 'certificate requests to approve'), href: '/certifications' },
    { key: 'certificatesToIssue', count: counts.certificatesToIssue, label: plural(counts.certificatesToIssue, 'approved certificate to issue', 'approved certificates to issue'), href: '/certifications' },
    { key: 'courseApprovals', count: counts.courseApprovals, label: plural(counts.courseApprovals, 'course awaiting approval', 'courses awaiting approval'), href: '/learn/approvals' },
    { key: 'reorderReviews', count: counts.reorderReviews, label: plural(counts.reorderReviews, 'refrigerant reorder to review', 'refrigerant reorders to review'), href: '/nou-dashboard' },
    { key: 'supplierCompliance', count: counts.supplierCompliance, label: plural(counts.supplierCompliance, 'supplier compliance certificate to review', 'supplier compliance certificates to review'), href: '/supplier-compliance' },
    { key: 'openAccidents', count: counts.openAccidents, label: plural(counts.openAccidents, 'accident report still open', 'accident reports still open'), href: '/admin/accidents' },
    { key: 'rewardRequests', count: counts.rewardRequests, label: plural(counts.rewardRequests, 'reward request to fulfil', 'reward requests to fulfil'), href: '/rewards' },
  ];
  return items.filter((item) => item.count > 0);
}

export function totalWaiting(items: ActionItem[]): number {
  return items.reduce((sum, item) => sum + item.count, 0);
}
