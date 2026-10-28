import Link from 'next/link';
import { ArrowRight, UploadCloud } from 'lucide-react';
import TrainingCalendar from '@/components/events/TrainingCalendar';

export default function TrainingPage() {
  return (
    <div style={{ backgroundColor: '#ffffff' }}>
      {/* Hero */}
      <section className="pt-28 sm:pt-32 pb-10 sm:pb-12 relative overflow-hidden" style={{ backgroundColor: '#ffffff' }}>
        <div
          aria-hidden
          className="absolute top-0 right-0 w-[520px] h-[240px] opacity-[0.08] pointer-events-none blur-3xl"
          style={{ background: 'radial-gradient(closest-side, #5A7D5A, transparent 70%)' }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.24em]" style={{ color: '#5A7D5A' }}>
                Training Calendar
              </p>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mt-3 tracking-tight leading-[1.08]" style={{ color: '#1C1917' }}>
                Upcoming sessions,
                <br className="hidden sm:block" /> all in one place.
              </h1>
              <p className="mt-4 max-w-2xl text-gray-600 leading-relaxed text-base sm:text-lg">
                Browse the month, filter by province or topic, and reserve a seat. Sessions run at
                HEVACRAZ centres and partner Polytechnics across Zimbabwe.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Link
                href="/login"
                className="group inline-flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:brightness-110 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] focus-visible:ring-offset-2"
                style={{ backgroundColor: '#1C1917' }}
              >
                View Training Center
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/login?next=%2Flearn%2Fmanage"
                className="inline-flex items-center justify-center gap-2 border px-5 py-3.5 text-sm font-semibold transition-all duration-200 hover:bg-[#FAFAF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] focus-visible:ring-offset-2"
                style={{ borderColor: '#E5E0DB', color: '#1C1917' }}
              >
                <UploadCloud className="h-4 w-4" />
                Upload courses
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2">
        <TrainingCalendar reserveHref="/login" />
      </div>
    </div>
  );
}
