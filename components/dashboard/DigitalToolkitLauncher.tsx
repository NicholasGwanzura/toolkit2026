import Link from 'next/link';
import {
  Award,
  BookOpen,
  Briefcase,
  CalendarRange,
  Calculator,
  Camera,
  CheckSquare,
  ClipboardCheck,
  Database,
  FileText,
  FlaskConical,
  LifeBuoy,
  ScanText,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

interface Tool {
  href: string;
  title: string;
  detail: string;
  icon: LucideIcon;
}

/** The tools a technician reaches for on site, first, so the dashboard opens straight onto the work. */
export const FIELD_TOOLS: Tool[] = [
  { href: '/field-toolkit', title: 'Field Toolkit', detail: 'Scan, log gas, checklists and evidence', icon: Briefcase },
  { href: '/field-operations?tab=planner', title: 'Field Job Planner', detail: 'Plan, start and complete jobs', icon: CalendarRange },
  { href: '/refrigerants', title: 'Refrigerant Catalogue', detail: 'Properties, GWP and safety class', icon: Database },
  { href: '/field-toolkit?tab=scan', title: 'Scan a nameplate', detail: 'Read gas and charge from the label', icon: ScanText },
  { href: '/field-toolkit?tab=register', title: 'Gas register', detail: 'Log a charge, recovery or repair', icon: FileText },
  { href: '/field-toolkit?tab=checklist', title: 'Installation checklist', detail: 'Verify the work step by step', icon: CheckSquare },
  { href: '/field-toolkit?tab=installations', title: 'Installations & COCs', detail: 'Record a job and request a COC', icon: ClipboardCheck },
  { href: '/field-toolkit?tab=photos', title: 'Photo notes', detail: 'Annotate site evidence', icon: Camera },
  { href: '/field-operations?tab=schedule', title: 'Equipment register', detail: 'Equipment and service alerts', icon: Wrench },
  { href: '/sizing-tool', title: 'Commercial Refrigeration Sizing Tool', detail: 'Cold room and freezer loads', icon: Calculator },
  { href: '/whatgas', title: 'WhatGas + Risk Engine', detail: 'Identify a gas and its risks', icon: FlaskConical },
  { href: '/safety-center', title: 'Safety Center', detail: 'Checks, incidents and guidance', icon: LifeBuoy },
  { href: '/learn', title: 'Learning Hub', detail: 'Courses and exams', icon: BookOpen },
  { href: '/certifications', title: 'Certifications', detail: 'Your certificates and COCs', icon: Award },
];

export function DigitalToolkitLauncher() {
  return (
    <nav aria-label="Toolkit quick access" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
