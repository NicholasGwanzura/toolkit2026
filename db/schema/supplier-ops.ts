import { boolean, jsonb, numeric, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const supplierApplicationStatusEnum = pgEnum('supplier_application_status', [
  'submitted',
  'under-review',
  'approved',
  'rejected',
]);

export const supplierComplianceStatusEnum = pgEnum('supplier_compliance_status', [
  'draft',
  'submitted',
  'under-review',
  'approved',
  'rejected',
]);

export const supplierLedgerDirectionEnum = pgEnum('supplier_ledger_direction', [
  'purchase',
  'sale',
]);

export const counterpartyTypeEnum = pgEnum('counterparty_type', [
  'importer',
  'distributor',
  'technician',
  'contractor',
  'retailer',
  'cold-chain-client',
]);

export const supplierTypeEnum = pgEnum('supplier_type', [
  'importer',
  'wholesaler',
  'distributor',
  'manufacturer',
  'service-partner',
]);

export const certificateTypeEnum = pgEnum('certificate_type', [
  'distribution-compliance',
  'nou-reporting',
  'traceability-audit',
]);

// Matches SupplierRegistration interface
export const supplierApplications = pgTable('supplier_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyName: text('company_name').notNull(),
  tradingName: text('trading_name'),
  registrationNumber: text('registration_number').notNull().default(''),
  supplierType: supplierTypeEnum('supplier_type').notNull().default('distributor'),
  contactName: text('contact_name').notNull(),
  email: text('email').notNull(),
  passwordHash: text('password_hash'),
  // Annual import quota in kg, set by an administrator. Null means no quota has been set yet.
  importQuotaKg: numeric('import_quota_kg', { precision: 12, scale: 3 }),
  phone: text('phone').notNull().default(''),
  province: text('province').notNull().default(''),
  city: text('city').notNull().default(''),
  address: text('address').notNull().default(''),
  refrigerantsSupplied: jsonb('refrigerants_supplied').notNull().$type<string[]>().default([]),
  taxNumber: text('tax_number'),
  website: text('website'),
  notes: text('notes'),
  surveyData: jsonb('survey_data'),
  status: supplierApplicationStatusEnum('status').notNull().default('submitted'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewedBy: text('reviewed_by'),
  reviewNote: text('review_note'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  activeEmailIdx: uniqueIndex('supplier_applications_active_email_idx')
    .on(table.email)
    .where(sql`${table.status} in ('submitted', 'under-review')`),
}));

// Matches SupplierComplianceApplication interface
export const supplierComplianceApplications = pgTable('supplier_compliance_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  supplierEmail: text('supplier_email').notNull(),
  supplierName: text('supplier_name').notNull(),
  certificateType: certificateTypeEnum('certificate_type').notNull(),
  monthCoverage: text('month_coverage').notNull(),
  sitesCovered: numeric('sites_covered').notNull().default('1'),
  contactPerson: text('contact_person').notNull().default(''),
  supportingSummary: text('supporting_summary').notNull().default(''),
  status: supplierComplianceStatusEnum('status').notNull().default('submitted'),
  notes: text('notes'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('supplier_compliance_applications_supplier_email_idx').on(table.supplierEmail),
]);

// Matches SupplierLedgerEntry interface
export const supplierLedger = pgTable('supplier_ledger', {
  id: uuid('id').primaryKey().defaultRandom(),
  supplierId: text('supplier_id'),
  supplierEmail: text('supplier_email').notNull(),
  supplierName: text('supplier_name').notNull(),
  direction: supplierLedgerDirectionEnum('direction').notNull(),
  technicianId: text('technician_id'),
  technicianRegistrationNumber: text('technician_registration_number'),
  counterpartyName: text('counterparty_name').notNull(),
  counterpartyCompany: text('counterparty_company'),
  counterpartyType: counterpartyTypeEnum('counterparty_type').notNull(),
  province: text('province').notNull().default(''),
  refrigerant: text('refrigerant').notNull(),
  quantityKg: numeric('quantity_kg', { precision: 10, scale: 3 }).notNull(),
  unitPriceUsd: numeric('unit_price_usd', { precision: 10, scale: 2 }).notNull(),
  totalValueUsd: numeric('total_value_usd', { precision: 12, scale: 2 }).notNull(),
  invoiceNumber: text('invoice_number').notNull(),
  transactionDate: timestamp('transaction_date', { withTimezone: true }).notNull(),
  referenceMonth: text('reference_month').notNull(),
  reportedToNou: boolean('reported_to_nou').notNull().default(false),
  clientReported: boolean('client_reported').notNull().default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('supplier_ledger_supplier_email_transaction_date_idx').on(table.supplierEmail, table.transactionDate),
]);
