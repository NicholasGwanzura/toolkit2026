import { CalendarDays } from 'lucide-react';
import TrainingCalendar from '@/components/events/TrainingCalendar';

export default function EventsCalendarPage() {
  return (
    <div className="space-y-6">
      <header className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
          <CalendarDays className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1C1917]">Events Calendar</h1>
          <p className="mt-1 text-sm text-[#78716C]">
            Browse training sessions and events at HEVACRAZ centres and partner polytechnics, filtered by province, topic or date.
          </p>
        </div>
      </header>

      <TrainingCalendar reserveHref={null} />
    </div>
  );
}
