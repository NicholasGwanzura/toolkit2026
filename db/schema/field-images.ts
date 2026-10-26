import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';
import type { ImageRecord } from '@/types/index';

export const fieldImageRecords = pgTable('field_image_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  technicianId: uuid('technician_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: text('job_id').notNull(),
  beforeAfter: text('before_after').notNull().$type<ImageRecord['beforeAfter']>(),
  annotationsJson: jsonb('annotations_json').notNull().$type<ImageRecord['annotationsJson']>().default([]),
  gpsTag: text('gps_tag'),
  imageDataUrl: text('image_data_url').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('field_image_records_technician_created_idx').on(table.technicianId, table.createdAt),
]);
