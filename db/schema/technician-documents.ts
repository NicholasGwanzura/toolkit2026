import { customType, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { technicians } from './technicians';
import { users } from './users';

const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return 'bytea';
  },
});

// Documents a registered technician uploads from their own account to support certification:
// national ID, trade certificates, qualifications. Stored in the database like applicant proof
// documents; readable by the technician and by reviewers (trainers, lecturers, administrators).
export const technicianDocuments = pgTable('technician_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  technicianId: uuid('technician_id').notNull().references(() => technicians.id, { onDelete: 'cascade' }),
  uploadedByUserId: uuid('uploaded_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  fileName: text('file_name').notNull(),
  fileType: text('file_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  data: bytea('data').notNull(),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('technician_documents_technician_idx').on(table.technicianId),
]);
