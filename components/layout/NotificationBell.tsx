'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck } from 'lucide-react';
import { markNotificationsRead, useNotifications, type NotificationEntry } from '@/lib/api';

function timeAgo(iso: string, now: number = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

/** The bell in the top bar: a live unread count and the latest notifications. */
export function NotificationBell() {
  const router = useRouter();
  const { data, error } = useNotifications();
  const [open, setOpen] = useState(false);
  const unread = data?.unread ?? 0;

  async function openNotification(entry: NotificationEntry) {
    setOpen(false);
    if (!entry.read) await markNotificationsRead({ ids: [entry.id] }).catch(() => {});
    if (entry.link) router.push(entry.link);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        className="relative p-2 text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5F5F4] transition-colors"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#B45309] px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-80 max-w-[90vw] rounded-lg border border-[#E7E5E4] bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-[#E7E5E4] px-4 py-3">
              <p className="text-sm font-semibold text-[#1C1917]">Notifications</p>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => void markNotificationsRead({ all: true })}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#D97706] hover:underline"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                </button>
              )}
            </div>
            <ul className="max-h-96 divide-y divide-[#F1F0EE] overflow-y-auto">
              {error && <li className="px-4 py-6 text-center text-sm text-red-600">Could not load notifications.</li>}
              {!error && !data && <li className="px-4 py-6 text-center text-sm text-[#78716C]">Loading…</li>}
              {data && data.items.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-[#78716C]">Nothing yet. Decisions on your requests will show up here.</li>
              )}
              {data?.items.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => void openNotification(entry)}
                    className={`block w-full px-4 py-3 text-left transition hover:bg-[#FAFAF9] ${entry.read ? '' : 'bg-amber-50/60'}`}
                  >
                    <span className="flex items-start gap-2">
                      {!entry.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#B45309]" aria-hidden="true" />}
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-[#1C1917]">{entry.title}</span>
                        <span className="mt-0.5 block text-xs leading-5 text-[#57534E]">{entry.body}</span>
                        <span className="mt-1 block text-[11px] text-[#A8A29E]">{timeAgo(entry.createdAt)}</span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
