import { db } from '@/db/client';
import { applicationAuditLog } from '@/db/schema/index';

export type AuditEntityType =
  | 'technician_application'
  | 'student_application'
  | 'supplier_application'
  | 'registration_application'
  | 'membership'
  | 'user'
  | 'course'
  | 'exam_submission'
  | 'certificate_request'
  | 'coc_request'
  | 'supplier_reorder'
  | 'trade_permit'
  | 'supplier_compliance'
  | 'accident';

export interface RecordAuditEventInput {
  entityType: AuditEntityType;
  entityId: string;
  action: string;
  previousStatus?: string;
  newStatus?: string;
  performedBy: string;
  performedByRole?: string;
  notes?: string;
}

/** Single insert helper reused by every mutating route that touches an audited entity. */
export async function recordAuditEvent(input: RecordAuditEventInput): Promise<void> {
  await db.insert(applicationAuditLog).values({
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    previousStatus: input.previousStatus ?? null,
    newStatus: input.newStatus ?? null,
    performedBy: input.performedBy,
    performedByRole: input.performedByRole ?? null,
    notes: input.notes ?? null,
  });
}

/**
 * Same as recordAuditEvent, but a failure to write the trail is logged and swallowed so it can
 * never turn an already-saved review decision into an error for the admin.
 */
export async function recordAuditEventSafe(input: RecordAuditEventInput): Promise<void> {
  try {
    await recordAuditEvent(input);
  } catch (error) {
    console.error('Audit trail write failed', input.entityType, input.entityId, error);
  }
}
