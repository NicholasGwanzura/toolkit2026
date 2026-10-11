import { pgTable, pgEnum, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';

export const membershipStatusEnum = pgEnum('membership_status', [
  'active',
  'expired',
  'suspended',
  'revoked',
]);

// Membership is deliberately a separate entity from technician registration
// (technicians.registrationNumber) — a technician can be registered without being an active
// HEVACRAZ member. Linked to technicians.id by application-level convention (soft link, no FK
// constraint), matching how technician_applications.approvedTechnicianId already works.
export const memberships = pgTable('memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  technicianId: uuid('technician_id').notNull(),
  applicationId: uuid('application_id'),
  membershipNumber: text('membership_number').notNull().unique(),
  membershipType: text('membership_type').notNull().default('standard'),
  province: text('province').notNull(),
  status: membershipStatusEnum('status').notNull().default('active'),
  startDate: text('start_date').notNull(),
  expiryDate: text('expiry_date').notNull(),
  approvedBy: text('approved_by'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('memberships_technician_id_idx').on(table.technicianId),
  index('memberships_expiry_date_idx').on(table.expiryDate),
]);
