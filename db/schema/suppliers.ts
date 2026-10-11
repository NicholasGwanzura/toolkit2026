import { pgTable, pgEnum, uuid, text, numeric, timestamp, index } from 'drizzle-orm/pg-core';

export const reorderStatusEnum = pgEnum('reorder_status', [
  'pending_hevacraz',
  'pending_nou',
  'approved',
  'rejected',
]);

export const rejectedByEnum = pgEnum('rejected_by', [
  'hevacraz',
  'nou',
]);

export const verificationMethodEnum = pgEnum('verification_method', [
  'reg_number',
  'qr',
  'name',
]);

export const verificationResultEnum = pgEnum('verification_result', [
  'valid',
  'expired',
  'revoked',
  'not_found',
]);

// Matches SupplierReorder interface
export const supplierReorders = pgTable('supplier_reorders', {
  id: uuid('id').primaryKey().defaultRandom(),
  vendorId: uuid('vendor_id').notNull(),
  vendorName: text('vendor_name').notNull(),
  gasType: text('gas_type').notNull(),
  quantityKg: numeric('quantity_kg', { precision: 10, scale: 3 }).notNull(),
  purpose: text('purpose').notNull(),
  // 'purchase' (new stock) or 'recovery' (reclaimed refrigerant returned). Replaces guessing from the purpose text.
  reorderType: text('reorder_type').notNull().default('purchase'),
  supplierNotes: text('supplier_notes').notNull().default(''),
  status: reorderStatusEnum('status').notNull().default('pending_hevacraz'),
  hevacrazReviewerId: uuid('hevacraz_reviewer_id'),
  hevacrazReviewedAt: timestamp('hevacraz_reviewed_at', { withTimezone: true }),
  nouReviewerId: uuid('nou_reviewer_id'),
  nouReviewedAt: timestamp('nou_reviewed_at', { withTimezone: true }),
  rejectionReason: text('rejection_reason'),
  rejectedBy: rejectedByEnum('rejected_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('supplier_reorders_vendor_id_idx').on(table.vendorId),
  index('supplier_reorders_status_idx').on(table.status),
]);

// Matches TechnicianVerification interface
export const technicianVerifications = pgTable('technician_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  vendorId: uuid('vendor_id').notNull(),
  vendorName: text('vendor_name').notNull(),
  method: verificationMethodEnum('method').notNull(),
  query: text('query').notNull(),
  technicianId: uuid('technician_id'),
  result: verificationResultEnum('result').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
