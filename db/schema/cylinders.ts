import { pgEnum, pgTable, text, timestamp, numeric, uuid, integer, index } from 'drizzle-orm/pg-core';

export const cylinderStatusEnum = pgEnum('cylinder_status', [
  'full',
  'partial',
  'empty',
  'in-service',
  'scrapped',
]);

export const cylinderOwnerTypeEnum = pgEnum('cylinder_owner_type', [
  'technician',
  'supplier',
  'company',
]);

export const cylinders = pgTable('cylinders', {
  id: uuid('id').primaryKey().defaultRandom(),
  cylinderCode: text('cylinder_code').notNull().unique(),
  refrigerantId: integer('refrigerant_id'),
  refrigerantLabel: text('refrigerant_label').notNull(),
  ownerType: cylinderOwnerTypeEnum('owner_type').notNull(),
  ownerId: text('owner_id'),
  ownerName: text('owner_name').notNull(),
  capacityKg: numeric('capacity_kg', { precision: 8, scale: 2 }).notNull(),
  currentFillKg: numeric('current_fill_kg', { precision: 8, scale: 2 }).notNull().default('0'),
  status: cylinderStatusEnum('status').notNull().default('empty'),
  province: text('province').notNull().default(''),
  lastFilledDate: text('last_filled_date'),
  lastInspectionDate: text('last_inspection_date'),
  nextInspectionDue: text('next_inspection_due'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('cylinders_owner_id_idx').on(table.ownerId),
]);
