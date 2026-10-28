import { describe, expect, it } from 'vitest';
import { MAX_CERTIFICATION_DOCUMENTS, certificationDocumentSlotsLeft } from './technician-documents';

describe('certification document limits', () => {
  it('allows a technician up to the maximum number of files', () => {
    expect(MAX_CERTIFICATION_DOCUMENTS).toBe(6);
    expect(certificationDocumentSlotsLeft(0)).toBe(6);
    expect(certificationDocumentSlotsLeft(5)).toBe(1);
  });

  it('stops at the limit and never reports a negative number', () => {
    expect(certificationDocumentSlotsLeft(6)).toBe(0);
    expect(certificationDocumentSlotsLeft(9)).toBe(0);
  });
});
