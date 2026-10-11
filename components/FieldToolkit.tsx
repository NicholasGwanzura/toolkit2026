'use client';

import { useCallback, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Camera, CheckSquare, ClipboardCheck, FileText, ScanText, type LucideIcon } from 'lucide-react';
import type { InstallationChecklistSnapshot } from '@/types/index';
import { OcrNameplateScanner } from '@/components/OcrNameplateScanner';
import { ImageAnnotationWorkbench } from '@/components/ImageAnnotationWorkbench';
import ChecklistTab from '@/components/field-toolkit/ChecklistTab';
import InstallationsTab from '@/components/field-toolkit/InstallationsTab';
import GasRegisterTab from '@/components/field-toolkit/GasRegisterTab';

type ToolkitTab = 'scan' | 'checklist' | 'installations' | 'register' | 'photos';

const TABS: Array<{ id: ToolkitTab; label: string; hint: string; icon: LucideIcon }> = [
  { id: 'scan', label: 'Scan', hint: 'Read a nameplate', icon: ScanText },
  { id: 'checklist', label: 'Checklist', hint: 'Install or service', icon: CheckSquare },
  { id: 'installations', label: 'Installations', hint: 'Evidence and COC', icon: ClipboardCheck },
  { id: 'register', label: 'Gas register', hint: 'Charge and recovery', icon: FileText },
  { id: 'photos', label: 'Photo notes', hint: 'Mark up a photo', icon: Camera },
];

function parseTab(value: string | null): ToolkitTab {
  return TABS.some(tab => tab.id === value) ? (value as ToolkitTab) : 'scan';
}

/** The field toolkit shell: one tab bar, and each tool in its own component. */
export default function FieldToolkit() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = parseTab(searchParams.get('tab'));

  // Work that has to travel between tabs lives here: the saved checklist and the scanned refrigerant.
  const [checklist, setChecklist] = useState<InstallationChecklistSnapshot | null>(null);
  const [prefillCode, setPrefillCode] = useState<string | undefined>();

  const go = useCallback((tab: ToolkitTab) => {
    router.replace(`${pathname}?tab=${tab}`, { scroll: false });
  }, [pathname, router]);

  const onTabKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const next = TABS[(index + (event.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
    go(next.id);
    document.getElementById(`toolkit-tab-${next.id}`)?.focus();
  };

  return (
    <div className="border border-stone-200 bg-white shadow-sm">
      <div role="tablist" aria-label="Field toolkit" className="flex overflow-x-auto border-b border-stone-200 bg-stone-50">
        {TABS.map((tab, index) => {
          const Icon = tab.icon;
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              id={`toolkit-tab-${tab.id}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`toolkit-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => go(tab.id)}
              onKeyDown={event => onTabKeyDown(event, index)}
              className={`flex min-h-14 shrink-0 flex-1 items-center justify-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${selected ? 'border-[#D97706] bg-white text-[#b45309]' : 'border-transparent text-stone-600 hover:bg-stone-100 hover:text-stone-900'}`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="text-left">
                {tab.label}
                <span className="hidden text-[11px] font-normal text-stone-500 lg:block">{tab.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div id={`toolkit-panel-${active}`} role="tabpanel" aria-labelledby={`toolkit-tab-${active}`} className="p-4 sm:p-6">
        {active === 'scan' && (
          <OcrNameplateScanner
            onUseRefrigerant={code => {
              setPrefillCode(code);
              go('register');
            }}
          />
        )}
        {active === 'checklist' && (
          <ChecklistTab saved={checklist} onSave={setChecklist} onGoToInstallations={() => go('installations')} />
        )}
        {active === 'installations' && (
          <InstallationsTab checklist={checklist} onChecklistUsed={() => setChecklist(null)} onGoToChecklist={() => go('checklist')} />
        )}
        {active === 'register' && (
          <GasRegisterTab prefillCode={prefillCode} onPrefillConsumed={() => setPrefillCode(undefined)} />
        )}
        {active === 'photos' && (
          <div className="space-y-3">
            <p className="border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600">Photo notes are saved on this device only. To keep a photo with a job record, attach it to an installation.</p>
            <ImageAnnotationWorkbench />
          </div>
        )}
      </div>
    </div>
  );
}
