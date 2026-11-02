import Link from 'next/link';
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  CalendarRange,
  Calculator,
  Database,
  LifeBuoy,
  Siren,
  WifiOff,
  type LucideIcon,
} from 'lucide-react';

interface Tool {
  href: string;
  title: string;
  detail: string;
  icon: LucideIcon;
  /** Opens with no signal. */
  offline?: boolean;
}

/** The tools a technician reaches for on site, first, so the dashboard opens straight onto the work. */
export const FIELD_TOOLS: Tool[] = [
  { href: '/field-operations?tab=planner', title: 'Field Job Planner', detail: 'Plan, start and complete jobs', icon: CalendarRange },
  { href: '/field-toolkit', title: 'Field Toolkit', detail: 'Log gas, checklists, installations and evidence', icon: Briefcase },
  { href: '/refrigerants', title: 'Refrigerant Catalogue', detail: 'Properties, GWP and safety class', icon: Database },
  { href: '/sizing-tool', title: 'Commercial Refrigeration Sizing Tool', detail: 'Cold room and freezer loads', icon: Calculator },
  { href: '/learn', title: 'Learning Hub', detail: 'Courses and exams', icon: BookOpen },
  { href: '/events', title: 'Events Calendar', detail: 'Training sessions and events', icon: CalendarDays },
  { href: '/safety-center', title: 'Safety Center', detail: 'Checks, incidents and guidance', icon: LifeBuoy },
  { href: '/emergency-mode', title: 'Emergency Mode', detail: 'Safety steps that work offline', icon: Siren, offline: true },
]

export function DigitalToolkitLauncher() {
  return (
    <nav aria-label="Toolkit quick access" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {FIELD_TOOLS.map((tool) => {
        const Icon = tool.icon;
        return (
          <Link
            key={tool.href}
            href={tool.href}
            className="group flex min-h-24 flex-col gap-2 rounded-xl border border-[#E7E5E4] bg-white p-4 shadow-sm transition hover:border-[#B45309]/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309] focus-visible:ring-offset-2"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FEF3C7] text-[#B45309] transition group-hover:bg-[#B45309] group-hover:text-white">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-[#1C1917]">{tool.title}</span>
              <span className="block text-xs leading-5 text-[#78716C]">{tool.detail}</span>
              {tool.offline && (
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  <WifiOff className="h-3 w-3" aria-hidden="true" /> Works offline
                </span>
              )}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
