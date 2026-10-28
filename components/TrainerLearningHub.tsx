'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, MapPin, Pencil, Plus, Save, Ticket, Users, XCircle } from 'lucide-react';
import {
  useTrainingSessions,
  createTrainingSession,
  updateTrainingSession,
  cancelTrainingSession,
} from '@/lib/api';
import type { UserSession } from '@/lib/auth';

type SessionFormState = {
  title: string;
  summary: string;
  venue: string;
  province: string;
  startDate: string;
  endDate: string;
  feeUsd: string;
  seats: string;
};

function emptyForm(region: string): SessionFormState {
  return { title: '', summary: '', venue: '', province: region, startDate: '', endDate: '', feeUsd: '120', seats: '20' };
}

function toDateTimeInput(value: string) {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-ZW', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function TrainerLearningHub({ session }: { session: UserSession }) {
  const { data: sessionsData, isLoading: sessionsLoading } = useTrainingSessions();
  const sessions = useMemo(() => sessionsData ?? [], [sessionsData]);
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [summaryReferenceTime] = useState(() => Date.now());
  const [form, setForm] = useState<SessionFormState>(() => emptyForm(session.region));

  const isAdmin = session.role === 'org_admin';
  const trainerSessions = useMemo(() => {
    return isAdmin ? sessions : sessions.filter(entry => entry.trainerEmail === session.email);
  }, [isAdmin, session.email, sessions]);

  const summary = useMemo(() => ({
    upcoming: trainerSessions.filter(entry => new Date(entry.startDate).getTime() >= summaryReferenceTime).length,
    seatsRemaining: trainerSessions.reduce((sum, entry) => sum + entry.seatsRemaining, 0),
    expectedRevenue: trainerSessions.reduce((sum, entry) => sum + ((entry.seats - entry.seatsRemaining) * entry.feeUsd), 0),
    provinces: new Set(trainerSessions.map(entry => entry.province)).size,
  }), [summaryReferenceTime, trainerSessions]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title || !form.venue || !form.summary || !form.startDate || !form.endDate) {
      setNotice('Complete the title, venue, schedule, and summary before saving the training.');
      return;
    }

    const seats = Number(form.seats);
    const feeUsd = Number(form.feeUsd);
    if (!Number.isFinite(seats) || seats <= 0 || !Number.isFinite(feeUsd) || feeUsd < 0) {
      setNotice('Seats must be above zero and fee must be a valid amount.');
      return;
    }

    const payload = {
      title: form.title.trim(),
      summary: form.summary.trim(),
      venue: form.venue.trim(),
      province: form.province.trim(),
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
      feeUsd,
      seats,
    };

    setSubmitting(true);
    try {
      if (editingId) {
        const updated = await updateTrainingSession(editingId, payload);
        setNotice(`${updated.title} updated on the calendar.`);
      } else {
        const created = await createTrainingSession(payload);
        setNotice(`${created.title} added to the training calendar.`);
      }
      setEditingId(null);
      setForm(emptyForm(session.region));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Failed to save the training session.');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (entry: (typeof sessions)[number]) => {
    setEditingId(entry.id);
    setNotice('');
    setForm({
      title: entry.title,
      summary: entry.summary,
      venue: entry.venue,
      province: entry.province,
      startDate: toDateTimeInput(entry.startDate),
      endDate: toDateTimeInput(entry.endDate),
      feeUsd: String(entry.feeUsd),
      seats: String(entry.seats),
    });
  };

  const stopEdit = () => {
    setEditingId(null);
    setForm(emptyForm(session.region));
  };

  const handleCancelTraining = async (entry: (typeof sessions)[number]) => {
    if (!window.confirm(`Cancel "${entry.title}"? It will be removed from the training calendar.`)) return;
    try {
      await cancelTrainingSession(entry.id);
      if (editingId === entry.id) stopEdit();
      setNotice(`${entry.title} cancelled.`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Failed to cancel the training session.');
    }
  };

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Upcoming Trainings" value={summary.upcoming} hint="Sessions still ahead on the calendar" icon={CalendarDays} />
        <MetricCard label="Seats Open" value={summary.seatsRemaining} hint="Remaining trainer-managed seats" icon={Users} />
        <MetricCard label="Expected Revenue" value={`$${summary.expectedRevenue}`} hint="Projected from booked seats" icon={Ticket} />
        <MetricCard label="Active Provinces" value={summary.provinces} hint="Regions with scheduled trainings" icon={MapPin} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Training calendar</p>
            <h2 className="mt-2 text-2xl font-bold text-gray-900">Upcoming sessions with venue and fees</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Anything you add here also appears in the public landing-page training schedule.
            </p>
          </div>

          <div className="space-y-3">
            {sessionsLoading && <p className="text-sm text-gray-500">Loading training sessions…</p>}
            {!sessionsLoading && trainerSessions.length === 0 && (
              <p className="text-sm text-gray-500">No training sessions scheduled yet.</p>
            )}
            {trainerSessions.map((sessionItem) => (
              <div key={sessionItem.id} className="border border-gray-200 bg-gray-50 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{sessionItem.title}</p>
                    <p className="mt-1 text-sm text-gray-500">{sessionItem.summary}</p>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
                      <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" /> {formatDate(sessionItem.startDate)}</span>
                      <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" /> {sessionItem.venue}, {sessionItem.province}</span>
                      <span className="inline-flex items-center gap-2"><Ticket className="h-4 w-4" /> ${sessionItem.feeUsd}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                    <div className="border border-gray-200 bg-white px-4 py-3 text-right">
                      <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Seats</p>
                      <p className="mt-1 text-lg font-bold text-gray-900">{sessionItem.seatsRemaining}/{sessionItem.seats}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(sessionItem)}
                        className="inline-flex items-center gap-1.5 border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancelTraining(sessionItem)}
                        className="inline-flex items-center gap-1.5 border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">{editingId ? 'Edit training' : 'Add training'}</p>
            <h2 className="mt-2 text-2xl font-bold text-gray-900">{editingId ? 'Update this training course' : 'Create a new training course'}</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {editingId ? 'Change the details and save; the calendar updates immediately.' : 'Add the course details, date, venue, and fee.'}
            </p>
          </div>

          <div className="grid gap-4">
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Course title"
              className="border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              value={form.summary}
              onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
              placeholder="Course details and learner outcomes"
              rows={4}
              className="border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                value={form.venue}
                onChange={(event) => setForm((current) => ({ ...current, venue: event.target.value }))}
                placeholder="Venue"
                className="border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                value={form.province}
                onChange={(event) => setForm((current) => ({ ...current, province: event.target.value }))}
                placeholder="Province"
                className="border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="datetime-local"
                value={form.startDate}
                onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
                className="border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="datetime-local"
                value={form.endDate}
                onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
                className="border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                min="0"
                step="1"
                value={form.feeUsd}
                onChange={(event) => setForm((current) => ({ ...current, feeUsd: event.target.value }))}
                placeholder="Fee USD"
                className="border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                min="1"
                step="1"
                value={form.seats}
                onChange={(event) => setForm((current) => ({ ...current, seats: event.target.value }))}
                placeholder="Seats"
                className="border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-[#FF6B35] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {submitting ? 'Saving…' : editingId ? 'Save Changes' : 'Add Training Course'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={stopEdit}
                disabled={submitting}
                className="inline-flex items-center gap-2 border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Discard changes
              </button>
            )}
          </div>

          {notice && (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              {notice}
            </div>
          )}
        </form>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  hint: string;
  icon: typeof CalendarDays;
}) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="bg-slate-50 p-3 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-xs uppercase tracking-[0.16em] text-gray-400">{hint}</p>
    </article>
  );
}
