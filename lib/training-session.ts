// Shared validation for training sessions, used by both the create and update routes.
export const TRAINING_LIMITS = {
  title: 200,
  summary: 2000,
  venue: 200,
  province: 100,
  maxSeats: 100_000,
  maxFeeUsd: 1_000_000,
} as const;

export interface TrainingSessionValues {
  title: string;
  summary: string;
  venue: string;
  province: string;
  startDate: Date;
  endDate: Date;
  feeUsd: number;
  seats: number;
}

export type TrainingSessionValidation =
  | { ok: true; value: TrainingSessionValues }
  | { ok: false; error: string };

export function validateTrainingSession(input: TrainingSessionValues): TrainingSessionValidation {
  const text = (value: string) => (typeof value === 'string' ? value.trim() : '');
  const title = text(input.title);
  const summary = text(input.summary);
  const venue = text(input.venue);
  const province = text(input.province);

  if (!title) return { ok: false, error: 'Title is required.' };
  if (!summary) return { ok: false, error: 'Summary is required.' };
  if (!venue) return { ok: false, error: 'Venue is required.' };
  if (!province) return { ok: false, error: 'Province is required.' };

  if (title.length > TRAINING_LIMITS.title) return { ok: false, error: `Title must be ${TRAINING_LIMITS.title} characters or fewer.` };
  if (summary.length > TRAINING_LIMITS.summary) return { ok: false, error: `Summary must be ${TRAINING_LIMITS.summary} characters or fewer.` };
  if (venue.length > TRAINING_LIMITS.venue) return { ok: false, error: `Venue must be ${TRAINING_LIMITS.venue} characters or fewer.` };
  if (province.length > TRAINING_LIMITS.province) return { ok: false, error: `Province must be ${TRAINING_LIMITS.province} characters or fewer.` };

  if (!Number.isFinite(input.feeUsd) || input.feeUsd < 0 || input.feeUsd > TRAINING_LIMITS.maxFeeUsd) {
    return { ok: false, error: 'Fee must be a valid amount.' };
  }
  if (!Number.isInteger(input.seats) || input.seats <= 0 || input.seats > TRAINING_LIMITS.maxSeats) {
    return { ok: false, error: 'Seats must be a whole number above zero.' };
  }

  if (Number.isNaN(input.startDate.getTime())) return { ok: false, error: 'Start date is not valid.' };
  if (Number.isNaN(input.endDate.getTime())) return { ok: false, error: 'End date is not valid.' };
  if (input.endDate.getTime() <= input.startDate.getTime()) {
    return { ok: false, error: 'End date must be after the start date.' };
  }

  return {
    ok: true,
    value: { title, summary, venue, province, startDate: input.startDate, endDate: input.endDate, feeUsd: input.feeUsd, seats: input.seats },
  };
}
