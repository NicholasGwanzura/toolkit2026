import { pgEnum, pgTable, text, timestamp, boolean, uuid, index } from 'drizzle-orm/pg-core';

export const accidentSeverityEnum = pgEnum('accident_severity', ['Critical', 'High', 'Medium', 'Low']);

export const accidentInvestigationStatusEnum = pgEnum('accident_investigation_status', [
  'Open',
  'Under Investigation',
  'Closed',
]);

export const occupationalAccidents = pgTable('occupational_accidents', {
  id: uuid('id').primaryKey().defaultRandom(),
  technicianId: uuid('technician_id').notNull(),
  technicianName: text('technician_name').notNull(),
  date: text('date').notNull(),
  jobSite: text('job_site').notNull(),
  clientName: text('client_name').notNull(),
  severity: accidentSeverityEnum('severity').notNull(),
  description: text('description').notNull(),
  refrigerantInvolved: text('refrigerant_involved'),
  nearMissFlag: boolean('near_miss_flag').notNull().default(false),
  nouNotified: boolean('nou_notified').notNull().default(false),
  // Investigation fields — filled in by org_admin after triage
  rootCause: text('root_cause'),
  investigationDate: text('investigation_date'),
  investigatorName: text('investigator_name'),
  correctiveActions: text('corrective_actions'),
  preventiveMeasures: text('preventive_measures'),
  status: accidentInvestigationStatusEnum('status').notNull().default('Open'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('occupational_accidents_technician_id_idx').on(table.technicianId),
  index('occupational_accidents_status_idx').on(table.status),
]);
