import { pgEnum, pgTable, text, timestamp, numeric, uuid, jsonb, boolean, integer, index } from 'drizzle-orm/pg-core';

export const plannerJobStatusEnum = pgEnum('planner_job_status', [
  'scheduled',
  'in-progress',
  'completed',
  'follow-up',
  'cancelled',
]);

export const plannerJobs = pgTable('planner_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: text('client_id').notNull(),
  clientName: text('client_name').notNull(),
  // Register id of the equipment this job services, when it came from an equipment alert.
  equipmentId: text('equipment_id'),
  location: text('location').notNull(),
  province: text('province').notNull(),
  district: text('district'),
  technicianId: uuid('technician_id').notNull(),
  technicianName: text('technician_name').notNull(),
  jobType: text('job_type').notNull(),
  refrigerantClass: text('refrigerant_class').notNull(),
  refrigerantId: integer('refrigerant_id'),
  refrigerantType: text('refrigerant_type'),
  amount: numeric('amount', { precision: 10, scale: 3 }),
  scheduledDate: text('scheduled_date').notNull(),
  status: plannerJobStatusEnum('status').notNull().default('scheduled'),
  preJobChecklistComplete: boolean('pre_job_checklist_complete').notNull().default(false),
  checklistItems: jsonb('checklist_items').notNull().default([]),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('planner_jobs_technician_id_scheduled_date_idx').on(table.technicianId, table.scheduledDate),
  index('planner_jobs_status_idx').on(table.status),
]);
