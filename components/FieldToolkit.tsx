'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Camera,
  CheckSquare,
  ClipboardCheck,
  CloudOff,
  FileText,
  ScanText,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import type { InstallationChecklistSnapshot } from '@/types/index';
import { OcrNameplateScanner } from '@/components/OcrNameplateScanner';
import { ImageAnnotationWorkbench } from '@/components/ImageAnnotationWorkbench';
import ChecklistTab from '@/components/field-toolkit/ChecklistTab';
import InstallationsTab from '@/components/field-toolkit/InstallationsTab';
import GasRegisterTab, { ACTIONS, type GasRegisterPrefill } from '@/components/field-toolkit/GasRegisterTab';

type ToolkitTab = 'scan' | 'checklist' | 'installations' | 'register' | 'photos';

const TABS: Array<{ id: ToolkitTab; label: string; hint: string; icon: LucideIcon }> = [
  { id: 'scan', label: 'Scan', hint: 'Read a nameplate', icon: ScanText },
  { id: 'checklist', label: 'Checklist', hint: 'Verify the work', icon: CheckSquare },
  { id: 'installations', label: 'Installations', hint: 'Jobs and COCs', icon: ClipboardCheck },
  { id: 'register', label: 'Gas register', hint: 'Refrigerant logs', icon: FileText },
  { id: 'photos', label: 'Photo notes', hint: 'Annotate evidence', icon: Camera },
];

function parseTab(value: string | null): ToolkitTab {
  return TABS.some(tab => tab.id === value) ? (value as ToolkitTab) : 'scan';
}

/** The field toolkit shell: brand masthead, one tool strip, and each tool in its own component. */
export default function FieldToolkit() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = parseTab(searchParams.get('tab'));
  const tabRefs = useRef<Record<ToolkitTab, HTMLButtonElement | null>>({
    scan: null,
    checklist: null,
    installations: null,
    register: null,
    photos: null,
  });

  // Work that has to travel between tabs lives here: the saved checklist and the scanned refrigerant.
  const [checklist, setChecklist] = useState<InstallationChecklistSnapshot | null>(null);
  const [scanned, setScanned] = useState<{ code: string; amountKg?: number } | undefined>();

  // A voice command opens the register with details in the address. They are read once, checked, and cleared.
  const voicePrefill = useMemo<GasRegisterPrefill | undefined>(() => {
    const amountRaw = searchParams.get('amount');
    const amount = amountRaw !== null ? Number(amountRaw) : NaN;
    const action = ACTIONS.find(item => item === searchParams.get('action'));
    const code = searchParams.get('refrigerant')?.match(/^R-\d{2,4}[A-Z]{0,2}$/i)?.[0].toUpperCase();
    const client = searchParams.get('client')?.trim().slice(0, 80) || undefined;
    if (!(amount > 0 && amount <= 10000) && !action && !code && !client) return undefined;
    return { source: 'voice', code, action, client, amount: amount > 0 && amount <= 10000 ? String(amount) : undefined };
  }, [searchParams]);
  const prefill: GasRegisterPrefill | undefined = voicePrefill ?? (scanned ? { source: 'scan', code: scanned.code, amount: scanned.amountKg ? String(scanned.amountKg) : undefined } : undefined);

  const go = useCallback((tab: ToolkitTab) => {
    router.replace(`${pathname}?tab=${tab}`, { scroll: false });
  }, [pathname, router]);

  // Keep the selected tab in view on a narrow screen where the strip scrolls sideways.
  useEffect(() => {
    tabRefs.current[active]?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [active]);

  const onTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const target = event.key === 'Home' ? 0 : TABS.length - 1;
      go(TABS[target].id);
      tabRefs.current[TABS[target].id]?.focus();
      return;
    }
    const step = keys[event.key];
    if (!step) return;
    event.preventDefault();
    const target = (index + step + TABS.length) % TABS.length;
    go(TABS[target].id);
    tabRefs.current[TABS[target].id]?.focus();
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E7E5E4] bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1C1917] px-4 py-3 text-white sm:px-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[#F5B971]">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight">Field Toolkit</p>
            <p className="text-xs text-[#A8A29E]">Refrigerant work, checklists and site records</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-[#E7E5E4]">
          <CloudOff className="h-3.5 w-3.5" aria-hidden="true" />
          Offline-ready
        </span>
      </div>

      <div
        role="tablist"
        aria-label="Field toolkit"
        className="flex gap-1.5 overflow-x-auto border-b border-[#E7E5E4] bg-[#FAFAF9] px-2 py-2.5"
      >
        {TABS.map((tab, index) => {
          const Icon = tab.icon;
          const selected = active === tab.id;
          return (
            <button
              key={tab.id}
              ref={node => { tabRefs.current[tab.id] = node; }}
              type="button"
              role="tab"
              id={`toolkit-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`toolkit-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => go(tab.id)}
              onKeyDown={event => onTabKeyDown(event, index)}
              className={`flex min-w-[138px] flex-1 items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition sm:flex-none ${
                selected
                  ? 'border-[#D97706] bg-white shadow-sm'
                  : 'border-transparent hover:border-[#E7E5E4] hover:bg-white'
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${
                  selected ? 'bg-[#D97706] text-white' : 'bg-[#F5F5F4] text-[#78716C]'
                }`}
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className={`block truncate text-sm font-semibold ${selected ? 'text-[#1C1917]' : 'text-[#57534E]'}`}>
                  {tab.label}
                </span>
                <span className="block truncate text-[11px] text-[#A8A29E]">{tab.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`toolkit-panel-${active}`}
        aria-labelledby={`toolkit-tab-${active}`}
        tabIndex={0}
        className="p-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D97706] sm:p-6"
      >
        {active === 'scan' && (
          <OcrNameplateScanner
            onUseRefrigerant={(code, extra) => {
              setScanned({ code, amountKg: extra?.amountKg });
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
          <GasRegisterTab
            prefill={prefill}
            onPrefillConsumed={() => {
              setScanned(undefined);
              if (voicePrefill) router.replace(`${pathname}?tab=register`, { scroll: false });
            }}
          />
        )}
        {active === 'photos' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] p-4">
              <Camera className="mt-0.5 h-5 w-5 shrink-0 text-[#78716C]" aria-hidden="true" />
              <p className="text-sm leading-6 text-[#57534E]">
                Saved field evidence is linked to your account and available when you sign in on another device.
                Annotate nameplates, leak sites or commissioning shots before filing them.
              </p>
            </div>
            <ImageAnnotationWorkbench />
          </div>
        )}
      </div>
    </div>
  );
}
