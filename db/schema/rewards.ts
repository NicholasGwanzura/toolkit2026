import { pgEnum, pgTable, text, timestamp, integer, uuid, index } from 'drizzle-orm/pg-core';
import { userRoleEnum } from './users';

export const rewardRedemptionStatusEnum = pgEnum('reward_redemption_status', [
  'requested',
  'fulfilled',
  'rejected',
]);

// Points are computed on the fly from real activity (exam passes, CoC approvals, completed
// jobs, gas-log entries) rather than stored — this table only tracks the debit side (what a
// user has requested/spent), so available balance = computed earned total - reserved/fulfilled.
export const rewardRedemptions = pgTable('reward_redemptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  userName: text('user_name').notNull(),
  userEmail: text('user_email').notNull(),
  userRole: userRoleEnum('user_role').notNull(),
  rewardId: text('reward_id').notNull(),
  rewardTitle: text('reward_title').notNull(),
  pointsCost: integer('points_cost').notNull(),
  status: rewardRedemptionStatusEnum('status').notNull().default('requested'),
  requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolvedBy: text('resolved_by'),
  notes: text('notes'),
}, (table) => [
  index('reward_redemptions_user_id_idx').on(table.userId),
]);
