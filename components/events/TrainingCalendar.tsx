'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Clock,
  Users,
  ArrowRight,
  CalendarDays,
  User,
  DollarSign,
  Filter,
  X,
} from 'lucide-react';
import { useTrainingSessions } from '@/lib/api';
import type { TrainingSession } from '@/types/index';

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function topicFromTitle(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('co2') || t.includes('r-744')) return 'R-744 / CO2';
  if (t.includes('hydrocarbon') || t.includes('r-290') || t.includes('r-600')) return 'Hydrocarbons';
  if (t.includes('ammonia') || t.includes('r-717')) return 'Ammonia';
  if (t.includes('heat pump')) return 'Heat pump';
  if (t.includes('cold room')) return 'Cold chain';
  if (t.includes('recovery') || t.includes('reclaim')) return 'Recovery';
  if (t.includes('low gwp')) return 'Low-GWP';
  if (t.includes('coc')) return 'COC issuance';
  if (t.includes('student') || t.includes('apprentice')) return 'Student track';
  return 'General';
}

function fmtDate(d: Date, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-ZW', opts).format(d);
}

function dateRangeLabel(start: Date, end: Date) {
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  if (sameDay) {
    return `${fmtDate(start, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`;
  }
  const sameMonth =
    start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${fmtDate(start, { day: 'numeric' })} to ${fmtDate(end, { day: 'numeric', month: 'long', year: 'numeric' })}`;
  }
  return `${fmtDate(start, { day: 'numeric', month: 'short' })} to ${fmtDate(end, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function timeLabel(start: Date, end: Date) {
  const s = fmtDate(start, { hour: '2-digit', minute: '2-digit', hour12: false });
  const e = fmtDate(end, { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${s} – ${e}`.replace('–', 'to');
}

function getCalendarGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const firstDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ date: Date; inMonth: boolean }> = [];
  for (let i = 0; i < firstDay; i++) {
    const d = new Date(year, month, -(firstDay - 1 - i));
    cells.push({ date: d, inMonth: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ date: new Date(year, month, i), inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    const next = new Date(last);
    next.setDate(last.getDate() + 1);
    cells.push({ date: next, inMonth: false });
  }
  return cells;
}

interface TrainingCalendarProps {
  /** Where the seat CTA should point. Pass null to hide the CTA (e.g. inside the app shell). */
  reserveHref?: string | null;
}

export default function TrainingCalendar({ reserveHref = '/login' }: TrainingCalendarProps) {
  const [referenceTime] = useState(() => Date.now());
  const [provinceFilter, setProvinceFilter] = useState<string>('all');
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarMonthOffset, setCalendarMonthOffset] = useState(0);

  const { data: storedSessionsData } = useTrainingSessions();
  const storedSessions = storedSessionsData ?? [];

  const upcomingSessions = useMemo(
    () =>
      [...storedSessions]
        .filter((s) => new Date(s.startDate).getTime() >= referenceTime - 86_400_000)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    [storedSessions, referenceTime]
  );

  const provinces = useMemo(() => {
    const set = new Set(upcomingSessions.map((s) => s.province));
    return Array.from(set).sort();
  }, [upcomingSessions]);

  const topics = useMemo(() => {
    const set = new Set(upcomingSessions.map((s) => topicFromTitle(s.title)));
    return Array.from(set).sort();
  }, [upcomingSessions]);

  const filteredSessions = useMemo(() => {
    return upcomingSessions.filter((s) => {
      if (provinceFilter !== 'all' && s.province !== provinceFilter) return false;
      if (topicFilter !== 'all' && topicFromTitle(s.title) !== topicFilter) return false;
      if (selectedDate) {
        const d = new Date(s.startDate);
        const dKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (dKey !== selectedDate) return false;
      }
      return true;
    });
  }, [upcomingSessions, provinceFilter, topicFilter, selectedDate]);

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, TrainingSession[]>();
    upcomingSessions.forEach((s) => {
      const start = new Date(s.startDate);
      const end = new Date(s.endDate);
      const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      while (cursor <= last) {
        const k = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
        const arr = map.get(k) ?? [];
        arr.push(s);
        map.set(k, arr);
        cursor.setDate(cursor.getDate() + 1);
      }
    });
    return map;
  }, [upcomingSessions]);

  const now = new Date();
  const calMonth = new Date(now.getFullYear(), now.getMonth() + calendarMonthOffset, 1);
  const calGrid = getCalendarGrid(calMonth.getFullYear(), calMonth.getMonth());

  const groupedByMonth = useMemo(() => {
    const map = new Map<string, TrainingSession[]>();
    filteredSessions.forEach((s) => {
      const k = monthKey(new Date(s.startDate));
      const arr = map.get(k) ?? [];
      arr.push(s);
      map.set(k, arr);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredSessions]);

  const hasActiveFilters =
    provinceFilter !== 'all' || topicFilter !== 'all' || selectedDate !== null;

  return (
    <div className="space-y-6 pb-20 sm:pb-24">
      {/* Calendar */}
      <div className="bg-white border shadow-sm" style={{ borderColor: '#E5E0DB' }}>
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b" style={{ borderColor: '#E5E0DB' }}>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" style={{ color: '#5A7D5A' }} />
            <h2 className="text-lg sm:text-xl font-bold tracking-tight" style={{ color: '#1C1917' }}>
              {MONTH_LABELS[calMonth.getMonth()]} {calMonth.getFullYear()}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCalendarMonthOffset((v) => v - 1)}
              className="px-3 py-1.5 text-sm border transition-colors hover:bg-[#FAFAF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
              style={{ borderColor: '#E5E0DB', color: '#1C1917' }}
              aria-label="Previous month"
            >
              ‹
            </button>
            <button
              onClick={() => setCalendarMonthOffset(0)}
              className="px-3 py-1.5 text-sm border transition-colors hover:bg-[#FAFAF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
              style={{ borderColor: '#E5E0DB', color: '#1C1917' }}
            >
              Today
            </button>
            <button
              onClick={() => setCalendarMonthOffset((v) => v + 1)}
              className="px-3 py-1.5 text-sm border transition-colors hover:bg-[#FAFAF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
              style={{ borderColor: '#E5E0DB', color: '#1C1917' }}
              aria-label="Next month"
            >
              ›
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 text-center text-[11px] sm:text-xs font-semibold uppercase tracking-widest border-b" style={{ borderColor: '#E5E0DB', color: '#1C1917' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-2.5 text-gray-500">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {calGrid.map((cell, i) => {
            const k = `${cell.date.getFullYear()}-${String(cell.date.getMonth() + 1).padStart(2, '0')}-${String(cell.date.getDate()).padStart(2, '0')}`;
            const sessions = sessionsByDay.get(k) ?? [];
            const isToday =
              cell.date.getFullYear() === now.getFullYear() &&
              cell.date.getMonth() === now.getMonth() &&
              cell.date.getDate() === now.getDate();
            const isSelected = selectedDate === k;
            const hasSession = sessions.length > 0;

            return (
              <button
                key={i}
                onClick={() => {
                  if (!hasSession && !isSelected) return;
                  setSelectedDate((cur) => (cur === k ? null : k));
                  const list = document.getElementById('sessions-list');
                  if (list) list.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                disabled={!hasSession && !isSelected}
                className={`relative min-h-[72px] sm:min-h-[88px] p-1.5 sm:p-2 text-left border-t border-l first:border-l-0 transition-colors ${
                  isSelected ? 'bg-[#D97706]/10' : hasSession ? 'hover:bg-[#FAFAF9]' : ''
                } ${!cell.inMonth ? 'opacity-35' : ''} ${!hasSession && !isSelected ? 'cursor-default' : 'cursor-pointer'}`}
                style={{ borderColor: '#E5E0DB' }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center justify-center text-xs sm:text-sm font-semibold ${
                      isToday ? 'w-6 h-6 text-white' : ''
                    }`}
                    style={{
                      color: isToday ? 'white' : '#1C1917',
                      backgroundColor: isToday ? '#D97706' : undefined,
                    }}
                  >
                    {cell.date.getDate()}
                  </span>
                  {hasSession && (
                    <span
                      className="hidden sm:inline-block text-[10px] font-semibold px-1.5"
                      style={{ backgroundColor: 'rgba(90,125,90,0.15)', color: '#5A7D5A' }}
                    >
                      {sessions.length}
                    </span>
                  )}
                </div>
                <div className="mt-1 space-y-0.5">
                  {sessions.slice(0, 2).map((s) => (
                    <span
                      key={s.id}
                      className="block text-[10px] sm:text-[11px] leading-tight truncate px-1 py-0.5 text-white"
                      style={{ backgroundColor: '#D97706' }}
                      title={s.title}
                    >
                      {s.title}
                    </span>
                  ))}
                  {sessions.length > 2 && (
                    <span className="block text-[10px] text-gray-500">+{sessions.length - 2} more</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: '#1C1917' }}>
          <Filter className="h-4 w-4" />
          Filter
        </div>

        <select
          value={provinceFilter}
          onChange={(e) => setProvinceFilter(e.target.value)}
          className="px-3 py-2 text-sm border bg-white focus:outline-none focus:ring-2 focus:ring-[#D97706] focus:border-transparent"
          style={{ borderColor: '#E5E0DB' }}
          aria-label="Filter by province"
        >
          <option value="all">All provinces</option>
          {provinces.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <select
          value={topicFilter}
          onChange={(e) => setTopicFilter(e.target.value)}
          className="px-3 py-2 text-sm border bg-white focus:outline-none focus:ring-2 focus:ring-[#D97706] focus:border-transparent"
          style={{ borderColor: '#E5E0DB' }}
          aria-label="Filter by topic"
        >
          <option value="all">All topics</option>
          {topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {selectedDate && (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border"
            style={{ borderColor: '#E5E0DB', color: '#1C1917', backgroundColor: 'white' }}
          >
            <CalendarDays className="h-3.5 w-3.5" style={{ color: '#D97706' }} />
            {new Intl.DateTimeFormat('en-ZW', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            }).format(new Date(selectedDate))}
            <button
              onClick={() => setSelectedDate(null)}
              className="ml-1 hover:bg-[#FAFAF9] rounded"
              aria-label="Clear selected date"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        )}

        {hasActiveFilters && (
          <button
            onClick={() => {
              setProvinceFilter('all');
              setTopicFilter('all');
              setSelectedDate(null);
            }}
            className="text-sm font-medium underline underline-offset-2"
            style={{ color: '#D97706' }}
          >
            Clear all
          </button>
        )}

        <span className="ml-auto text-sm text-gray-500">
          {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Sessions list */}
      <section id="sessions-list">
        {filteredSessions.length === 0 ? (
          <div className="text-center py-20 border bg-white" style={{ borderColor: '#E5E0DB' }}>
            <p className="text-lg font-semibold" style={{ color: '#1C1917' }}>
              No sessions match your filters.
            </p>
            <p className="mt-2 text-sm text-gray-500">Try clearing the filters or pick a different month.</p>
          </div>
        ) : (
          <div className="space-y-10 sm:space-y-12">
            {groupedByMonth.map(([mKey, items]) => {
              const [y, m] = mKey.split('-').map(Number);
              return (
                <div key={mKey}>
                  <h3
                    className="text-sm font-semibold uppercase tracking-[0.2em] mb-5 pb-2 border-b"
                    style={{ color: '#1C1917', borderColor: '#E5E0DB' }}
                  >
                    {MONTH_LABELS[m - 1]} {y}
                    <span className="ml-2 text-gray-400 normal-case tracking-normal text-xs">
                      {items.length} session{items.length !== 1 ? 's' : ''}
                    </span>
                  </h3>
                  <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {items.map((session) => {
                      const start = new Date(session.startDate);
                      const end = new Date(session.endDate);
                      const nearlyFull = session.seatsRemaining <= 5 && session.seatsRemaining > 0;
                      const isFull = session.seatsRemaining === 0;
                      const isFree = session.feeUsd === 0;
                      const topic = topicFromTitle(session.title);

                      return (
                        <article
                          key={session.id}
                          className="group relative flex flex-col border bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-[#D97706]/40"
                          style={{ borderColor: '#E5E0DB' }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div
                              className="inline-flex flex-col items-center justify-center px-3 py-2 leading-none"
                              style={{ backgroundColor: '#1C1917', color: 'white' }}
                            >
                              <span className="text-[9px] uppercase tracking-[0.22em] text-white/60">
                                {fmtDate(start, { month: 'short' })}
                              </span>
                              <span className="mt-0.5 text-2xl font-bold">{start.getDate()}</span>
                            </div>
                            <span
                              className="px-3 py-1 text-xs font-semibold tracking-tight text-white"
                              style={{ backgroundColor: isFree ? '#5A7D5A' : '#D97706' }}
                            >
                              {isFree ? 'Free' : `$${session.feeUsd}`}
                            </span>
                          </div>

                          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#D97706' }}>
                            {topic}
                          </p>
                          <h4 className="mt-1 text-lg sm:text-xl font-bold tracking-tight" style={{ color: '#1C1917' }}>
                            {session.title}
                          </h4>
                          <p className="mt-2 text-sm leading-6 text-gray-600 flex-1">{session.summary}</p>

                          <dl className="mt-5 pt-4 border-t grid grid-cols-1 gap-2.5 text-sm text-gray-600" style={{ borderColor: '#F1F0EE' }}>
                            <div className="flex items-center gap-2">
                              <CalendarDays className="h-4 w-4 text-gray-400 shrink-0" />
                              <dd className="truncate">{dateRangeLabel(start, end)}</dd>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                              <dd>{timeLabel(start, end)} CAT</dd>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                              <dd className="truncate">
                                {session.venue}, <span className="text-gray-500">{session.province}</span>
                              </dd>
                            </div>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-400 shrink-0" />
                              <dd className="truncate">Led by {session.trainerName}</dd>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-gray-400 shrink-0" />
                              <dd
                                className={
                                  isFull
                                    ? 'font-semibold text-gray-400'
                                    : nearlyFull
                                    ? 'font-semibold text-[#D97706]'
                                    : ''
                                }
                              >
                                {isFull
                                  ? 'Waitlist only'
                                  : `${session.seatsRemaining} of ${session.seats} seats left`}
                                {nearlyFull && !isFull && (
                                  <span className="ml-2 text-[10px] uppercase tracking-wider">Almost full</span>
                                )}
                              </dd>
                            </div>
                            {!isFree && (
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-gray-400 shrink-0" />
                                <dd>${session.feeUsd} USD per seat</dd>
                              </div>
                            )}
                          </dl>

                          {reserveHref && (
                            <Link
                              href={reserveHref}
                              className="group/btn mt-6 inline-flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold text-white transition-all duration-200 hover:brightness-110 shadow-sm hover:shadow-md"
                              style={{ backgroundColor: isFull ? '#6B7280' : '#D97706' }}
                            >
                              {isFull ? 'Join Waitlist' : 'Reserve Seat'}
                              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover/btn:translate-x-1" />
                            </Link>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
