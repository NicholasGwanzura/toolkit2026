import { pgEnum, pgTable, text, timestamp, uuid, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import type { InstallationChecklistSnapshot } from '@/types/index';

export const installationStatusEnum = pgEnum('installation_status', [
  'pending',
  'approved',
  'rejected',
]);

export const jobTypeEnum = pgEnum('job_type', [
  'COLD_ROOM',
  'C40_FREEZER',
  'C60_FREEZER',
  'C90_FREEZER',
  'FREEZER_ROOM',
]);

export const installations = pgTable('installations', {
  id: uuid('id').primaryKey().defaultRandom(),
  technicianId: uuid('technician_id').notNull(),
  technicianName: text('technician_name').notNull(),
  clientName: text('client_name').notNull(),
  location: text('location'),
  jobDetails: text('job_details').notNull(),
  floorSpace: text('floor_space'),
  jobType: jobTypeEnum('job_type').notNull(),
  installationDate: timestamp('installation_date', { withTimezone: true }).defaultNow().notNull(),
  equipmentId: uuid('equipment_id'),
  status: installationStatusEnum('status').notNull().default('pending'),
  images: jsonb('images').notNull().$type<string[]>().default([]),
  checklistSnapshot: jsonb('checklist_snapshot').$type<InstallationChecklistSnapshot | null>(),
  cocRequested: boolean('coc_requested').notNull().default(false),
  cocApproved: boolean('coc_approved').notNull().default(false),
  cocRequestId: uuid('coc_request_id'),
  cocApprovalDate: timestamp('coc_approval_date', { withTimezone: true }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('installations_technician_id_idx').on(table.technicianId),
]);
