import { CheckCircle2, Clock, FileEdit, RotateCcw } from 'lucide-react';
import type { CourseStatus } from '@/lib/platformStore';
import { cn } from '@/lib/utils';

export const STATUS_META: Record<CourseStatus, { label: string; hint: string; className: string; icon: typeof Clock }> = {
  draft: { label: 'Draft', hint: 'Only you can see it. Not yet submitted.', className: 'border-stone-200 bg-stone-100 text-stone-700', icon: FileEdit },
  pending_nou: { label: 'Awaiting approval', hint: 'An administrator is reviewing it. You cannot edit it meanwhile.', className: 'border-amber-200 bg-amber-50 text-amber-800', icon: Clock },
  approved: { label: 'Approved', hint: 'Live for learners. Ask an administrator if it needs changing.', className: 'border-emerald-200 bg-emerald-50 text-emerald-800', icon: CheckCircle2 },
  rejected: { label: 'Needs changes', hint: 'An administrator sent it back. Fix what they asked for and submit again.', className: 'border-rose-200 bg-rose-50 text-rose-800', icon: RotateCcw },
};

/** The status as a label with an icon, so it never depends on colour alone. */
export function StatusPill({ status, className }: { status: CourseStatus; className?: string }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold', meta.className, className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export const isEditable = (status: CourseStatus) => status === 'draft' || status === 'rejected';
