import { pgEnum, pgTable, text, timestamp, uuid, boolean, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { InstallationChecklistSnapshot } from '@/types/index';

export const cocRequestStatusEnum = pgEnum('coc_request_status', [
  'submitted',
  'approved',
  'rejected',
]);

// Certificate of Conformity requests — a technician submits one per completed installation
// job; an org_admin (National Admin) reviews and, on approval, the request becomes a
// verifiable issued certificate (same PDF+QR pattern as trade permits).
export const cocRequests = pgTable('coc_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  certificateNumber: text('certificate_number').notNull().unique(),
  plannerJobId: uuid('planner_job_id'),
  installationId: uuid('installation_id'),
  technicianId: uuid('technician_id').notNull(),
  technicianName: text('technician_name').notNull(),
  clientName: text('client_name').notNull(),
  location: text('location').notNull(),
  equipmentType: text('equipment_type').notNull(),
  serialNumber: text('serial_number'),
  installationDate: text('installation_date').notNull(),
  details: text('details'),
  checklistSnapshot: jsonb('checklist_snapshot').$type<InstallationChecklistSnapshot | null>(),
  evidenceImages: jsonb('evidence_images').notNull().$type<string[]>().default([]),
  complianceCheck: boolean('compliance_check').notNull().default(false),
  status: cocRequestStatusEnum('status').notNull().default('submitted'),
  verificationToken: text('verification_token'),
  reviewedBy: text('reviewed_by'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewNote: text('review_note'),
  issuedDate: text('issued_date'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('coc_requests_technician_id_idx').on(table.technicianId),
  index('coc_requests_status_idx').on(table.status),
  // One installation can produce at most one certificate of conformity.
  uniqueIndex('coc_requests_installation_id_unique')
    .on(table.installationId)
    .where(sql`${table.installationId} is not null`),
]);
