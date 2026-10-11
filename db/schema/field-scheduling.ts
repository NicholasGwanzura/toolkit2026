import { pgEnum, pgTable, text, timestamp, uuid, jsonb, integer, index } from 'drizzle-orm/pg-core';

export const equipmentStatusEnum = pgEnum('equipment_status', ['normal', 'due-soon', 'overdue']);

export const equipmentRecords = pgTable('equipment_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  equipmentId: text('equipment_id').notNull(),
  clientId: text('client_id'),
  clientName: text('client_name').notNull(),
  manufacturer: text('manufacturer'),
  model: text('model'),
  province: text('province').notNull(),
  refrigerantId: integer('refrigerant_id'),
  refrigerantType: text('refrigerant_type').notNull(),
  refrigerantClass: text('refrigerant_class'),
  ashraeSafetyClass: text('ashrae_safety_class').notNull(),
  serialNumber: text('serial_number'),
  healthStatus: text('health_status'),
  lastServiceDate: text('last_service_date').notNull(),
  nextServiceDue: text('next_service_due').notNull(),
  status: equipmentStatusEnum('status').notNull().default('normal'),
  technicianName: text('technician_name').notNull(),
  serviceHistory: jsonb('service_history').notNull().default([]),
  predictedFailureReason: text('predicted_failure_reason'),
  recommendedAction: text('recommended_action'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('equipment_records_equipment_id_idx').on(table.equipmentId),
]);
