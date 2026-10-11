import { pgEnum, pgTable, text, timestamp, numeric, uuid, integer, index } from 'drizzle-orm/pg-core';

export const reclamationStatusEnum = pgEnum('reclamation_status', [
  'pending',
  'passed',
  'failed',
]);

export const reclamationRecords = pgTable('reclamation_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  batchNumber: text('batch_number').notNull().unique(),
  refrigerantId: integer('refrigerant_id'),
  refrigerantLabel: text('refrigerant_label').notNull(),
  sourceDescription: text('source_description').notNull(),
  quantityKg: numeric('quantity_kg', { precision: 10, scale: 3 }).notNull(),
  purityPercent: numeric('purity_percent', { precision: 5, scale: 2 }),
  testMethod: text('test_method'),
  facilityName: text('facility_name').notNull(),
  technicianId: uuid('technician_id'),
  technicianName: text('technician_name').notNull(),
  status: reclamationStatusEnum('status').notNull().default('pending'),
  testedDate: text('tested_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('reclamation_records_technician_id_idx').on(table.technicianId),
]);
