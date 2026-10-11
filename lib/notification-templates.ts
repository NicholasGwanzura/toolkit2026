// What each in-app notification says. Pure, so the wording and the links can be tested.

export interface NotificationContent {
  kind: string;
  title: string;
  body: string;
  /** A path inside the app that the notification opens. */
  link?: string;
}

const kgText = (kg: number) => `${kg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`;

export const notificationTemplates = {
  welcome(roleLabel: string): NotificationContent {
    return {
      kind: 'welcome',
      title: 'Welcome to the registry',
      body: `Your ${roleLabel.toLowerCase()} account is approved. Take a look around your dashboard to get started.`,
      link: '/dashboard',
    };
  },

  cocDecision(approved: boolean, location?: string): NotificationContent {
    const where = location ? ` for ${location}` : '';
    return approved
      ? { kind: 'coc_approved', title: 'COC approved', body: `Your Certificate of Compliance request${where} was approved. You can download the certificate now.`, link: '/certifications' }
      : { kind: 'coc_rejected', title: 'COC not approved', body: `Your Certificate of Compliance request${where} was not approved. Open it to see what to fix.`, link: '/jobs' };
  },

  certificateRequest(status: 'admin-approved' | 'rejected' | 'issued', courseTitle: string, technicianName: string): NotificationContent {
    if (status === 'issued') {
      return { kind: 'certificate_issued', title: 'Certificate issued', body: `${technicianName}'s certificate for ${courseTitle} has been issued.`, link: '/certifications' };
    }
    if (status === 'admin-approved') {
      return { kind: 'certificate_approved', title: 'Certificate request approved', body: `Your request for ${technicianName} (${courseTitle}) was approved and is ready to be issued.`, link: '/certifications' };
    }
    return { kind: 'certificate_rejected', title: 'Certificate request not approved', body: `Your request for ${technicianName} (${courseTitle}) was not approved.`, link: '/certifications' };
  },

  courseDecision(status: 'approved' | 'rejected' | 'returned', title: string, reason?: string): NotificationContent {
    if (status === 'approved') {
      return { kind: 'course_approved', title: 'Course approved', body: `"${title}" is approved and visible to learners.`, link: '/learn/manage' };
    }
    const why = reason ? ` Reason: ${reason}` : '';
    return status === 'returned'
      ? { kind: 'course_returned', title: 'Course returned for correction', body: `"${title}" was taken out of the catalogue for correction.${why}`, link: '/learn/manage' }
      : { kind: 'course_rejected', title: 'Course not approved', body: `"${title}" was not approved.${why}`, link: '/learn/manage' };
  },

  examGraded(courseTitle: string, passed: boolean, score: number): NotificationContent {
    return {
      kind: passed ? 'exam_passed' : 'exam_failed',
      title: passed ? 'You passed' : 'Exam result',
      body: passed
        ? `You passed the exam for "${courseTitle}" with ${score}%.`
        : `Your exam for "${courseTitle}" scored ${score}%, below the pass mark. Check the feedback and try again if you have attempts left.`,
      link: '/learn',
    };
  },

  rewardDecision(input: { fulfilled: boolean; rewardTitle: string; points: number; reason?: string }): NotificationContent {
    return input.fulfilled
      ? { kind: 'reward_fulfilled', title: 'Reward ready', body: `Your request for "${input.rewardTitle}" (${input.points} points) was fulfilled.`, link: '/rewards' }
      : { kind: 'reward_rejected', title: 'Reward request not approved', body: `Your request for "${input.rewardTitle}" was not approved${input.reason ? `: ${input.reason}` : '.'} Your ${input.points} points are available again.`, link: '/rewards' };
  },

  reorderDecision(input: { approved: boolean; stage: 'hevacraz' | 'nou'; gasType: string; quantityKg: number; reason?: string }): NotificationContent {
    const what = `${kgText(input.quantityKg)} of ${input.gasType}`;
    if (!input.approved) {
      return { kind: 'reorder_rejected', title: 'Reorder rejected', body: `Your reorder of ${what} was rejected${input.reason ? `: ${input.reason}` : '.'}`, link: '/suppliers/reorder' };
    }
    return input.stage === 'hevacraz'
      ? { kind: 'reorder_stage_one', title: 'Reorder passed HEVACRAZ review', body: `Your reorder of ${what} passed HEVACRAZ review and is now with NOU.`, link: '/suppliers/reorder' }
      : { kind: 'reorder_approved', title: 'Reorder approved', body: `Your reorder of ${what} is fully approved.`, link: '/suppliers/reorder' };
  },
} as const;
