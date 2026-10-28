'use client';

import Link from 'next/link';
import { CalendarDays, MapPin, ArrowRight } from 'lucide-react';
import { useTrainingSessions } from '@/lib/api';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-ZW', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-ZW', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

export default function DashboardEventsCalendar() {
  const { data: sessions, error, isLoading } = useTrainingSessions();
  const now = Date.now();
  const upcoming = (sessions ?? [])
    .filter((session) => session.status !== 'completed' && new Date(session.endDate).getTime() >= now)
    .slice(0, 4);

  return (
    <section className="overflow-hidden rounded-lg border border-[#E7E5E4] bg-white" aria-labelledby="dashboard-events-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7E5E4] px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
            <CalendarDays className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="dashboard-events-title" className="text-base font-semibold text-[#1C1917]">Upcoming Events</h2>
            <p className="mt-0.5 text-xs text-[#78716C]">Training sessions and events open to all dashboard users</p>
          </div>
        </div>
        <Link href="/training" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-[#D97706] hover:text-[#b45309] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]">
          Open full calendar <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {isLoading ? (
        <p className="px-5 py-6 text-sm text-[#78716C]">Loading upcoming events…</p>
      ) : error ? (
        <p role="alert" className="px-5 py-6 text-sm text-red-700">Events could not be loaded. Open the full calendar to try again.</p>
      ) : upcoming.length === 0 ? (
        <p className="px-5 py-6 text-sm text-[#78716C]">No upcoming events are scheduled yet.</p>
      ) : (
        <ul className="divide-y divide-[#E7E5E4]">
          {upcoming.map((session) => (
            <li key={session.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#1C1917]">{session.title}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#78716C]">{session.summary}</p>
              </div>
              <div className="shrink-0 space-y-1 text-xs text-[#57534E] sm:text-right">
                <p>{formatDate(session.startDate)}{new Date(session.startDate).toDateString() !== new Date(session.endDate).toDateString() ? ` – ${formatDate(session.endDate)}` : ''}</p>
                <p>{formatTime(session.startDate)} – {formatTime(session.endDate)}</p>
                <p className="inline-flex items-center gap-1 sm:justify-end"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{session.venue}, {session.province}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}