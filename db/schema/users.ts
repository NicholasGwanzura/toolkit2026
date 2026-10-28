import { pgTable, pgEnum, uuid, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', [
  'technician',
  'trainer',
  'lecturer',
  'vendor',
  'org_admin',
  'student',
  'contractor',
]);

export const userStatusEnum = pgEnum('user_status', [
  'active',
  'inactive',
  'suspended',
  'pending',
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  role: userRoleEnum('role').notNull(),
  region: text('region').notNull(),
  registrationNo: text('registration_no'),
  qrToken: text('qr_token'),
  status: userStatusEnum('status').notNull().default('active'),
  sessionVersion: integer('session_version').notNull().default(0),
  isDemo: boolean('is_demo').notNull().default(false),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
