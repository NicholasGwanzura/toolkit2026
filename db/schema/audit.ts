import { pgTable, text, timestamp, uuid, index } from 'drizzle-orm/pg-core';

// Generic audit trail — one table for every entity type this phase needs (technician
// applications, memberships), rather than a bespoke table per entity. entityType/entityId
// is a soft reference (no FK), consistent with how this codebase already links records
// (e.g. technician_applications.approvedTechnicianId).
export const applicationAuditLog = pgTable('application_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: text('entity_type').notNull(), // 'technician_application' | 'membership'
  entityId: uuid('entity_id').notNull(),
  action: text('action').notNull(),
  previousStatus: text('previous_status'),
  newStatus: text('new_status'),
  performedBy: text('performed_by').notNull(),
  performedByRole: text('performed_by_role'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('application_audit_log_entity_id_idx').on(table.entityId),
  index('application_audit_log_created_at_idx').on(table.createdAt),
]);
