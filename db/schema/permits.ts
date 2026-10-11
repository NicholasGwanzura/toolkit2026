import { pgEnum, pgTable, text, timestamp, numeric, uuid, integer, index } from 'drizzle-orm/pg-core';

export const permitTypeEnum = pgEnum('permit_type', ['import', 'export']);

export const permitStatusEnum = pgEnum('permit_status', [
  'pending',
  'approved',
  'rejected',
  'expired',
]);

export const tradePermits = pgTable('trade_permits', {
  id: uuid('id').primaryKey().defaultRandom(),
  permitNumber: text('permit_number').notNull().unique(),
  permitType: permitTypeEnum('permit_type').notNull(),
  applicantName: text('applicant_name').notNull(),
  applicantCompany: text('applicant_company').notNull(),
  applicantEmail: text('applicant_email').notNull(),
  refrigerantId: integer('refrigerant_id'),
  refrigerantLabel: text('refrigerant_label').notNull(),
  quantityKg: numeric('quantity_kg', { precision: 10, scale: 3 }).notNull(),
  countryOfOriginOrDestination: text('country_of_origin_or_destination').notNull(),
  status: permitStatusEnum('status').notNull().default('pending'),
  issuedDate: text('issued_date'),
  expiryDate: text('expiry_date'),
  verificationToken: text('verification_token'),
  reviewedBy: text('reviewed_by'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewNote: text('review_note'),
  notes: text('notes'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('trade_permits_status_idx').on(table.status),
  index('trade_permits_applicant_email_idx').on(table.applicantEmail),
]);
