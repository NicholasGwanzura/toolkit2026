// Rules for the documents a technician uploads to support certification. Client-safe and pure,
// so the upload panel and the server use the same limits.

export const MAX_CERTIFICATION_DOCUMENTS = 6;

export const CERTIFICATION_DOCUMENT_HINT =
  'A copy of your national ID, plus any trade, training or assessor certificates you hold. Trainers and HEVACRAZ reviewers use these when assessing your certification.';

export function certificationDocumentSlotsLeft(existingCount: number): number {
  return Math.max(0, MAX_CERTIFICATION_DOCUMENTS - existingCount);
}
