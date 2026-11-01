import { Check } from 'lucide-react';
import { JOURNEY_STEPS, journeyStep, type CourseStage } from '@/lib/course-journey';

/** Modules, exam, result, certificate: where the learner is, and what is still ahead. */
export function CourseStepper({ stage }: { stage: CourseStage }) {
  const current = journeyStep(stage);
  return (
    <ol aria-label="Your progress through this course" className="flex items-center gap-1 sm:gap-2">
      {JOURNEY_STEPS.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={step} aria-current={active ? 'step' : undefined} className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-emerald-600 text-white' : active ? 'bg-[#B45309] text-white' : 'bg-gray-200 text-gray-600'}`}>
              {done ? <Check className="h-3.5 w-3.5" aria-label="Done" /> : index + 1}
            </span>
            <span className={`truncate text-xs sm:text-sm ${active ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>{step}</span>
            {index < JOURNEY_STEPS.length - 1 && <span className="hidden h-px flex-1 bg-gray-200 sm:block" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
