import { z } from 'zod';

/** The checklist a technician saves with an installation. Counts must agree with the items, so a snapshot cannot claim more than it holds. */
export const checklistSchema = z.object({
  checklistType: z.enum(['installation', 'regassing']),
  version: z.string().max(40).optional(),
  completedItems: z.number().int().nonnegative(),
  totalItems: z.number().int().positive().max(100),
  completedAt: z.iso.datetime(),
  items: z.array(z.object({
    id: z.string().min(1).max(200),
    text: z.string().min(1).max(500),
    category: z.string().min(1).max(100),
    checked: z.boolean(),
    source: z.string().max(200).nullable().optional(),
  })).min(1).max(100),
}).refine((snapshot) =>
  snapshot === null || snapshot === undefined ||
  (snapshot.totalItems === snapshot.items.length && snapshot.completedItems === snapshot.items.filter((item) => item.checked).length),
  'Checklist counts must match the recorded items and checked states',
).nullable().optional();
