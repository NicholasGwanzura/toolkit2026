import type { rewardRedemptions } from '@/db/schema/index';
import type { RewardRedemption } from '@/types/index';

export function toRewardRedemption(row: typeof rewardRedemptions.$inferSelect): RewardRedemption {
  return {
    id: row.id,
    userId: row.userId,
    userName: row.userName,
    userEmail: row.userEmail,
    userRole: row.userRole,
    rewardId: row.rewardId,
    rewardTitle: row.rewardTitle,
    pointsCost: row.pointsCost,
    status: row.status as RewardRedemption['status'],
    requestedAt: row.requestedAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? undefined,
    resolvedBy: row.resolvedBy ?? undefined,
    notes: row.notes ?? undefined,
  };
}
