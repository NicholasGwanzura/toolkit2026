'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Camera, CheckSquare, ClipboardCheck, FileText, ScanText, type LucideIcon } from 'lucide-react';
import { Tab, TabList, TabPanel, Tabs } from '@/components/base/tabs/tabs';
import type { InstallationChecklistSnapshot } from '@/types/index';
import { OcrNameplateScanner } from '@/components/OcrNameplateScanner';
import { ImageAnnotationWorkbench } from '@/components/ImageAnnotationWorkbench';
import ChecklistTab from '@/components/field-toolkit/ChecklistTab';
import InstallationsTab from '@/components/field-toolkit/InstallationsTab';
import GasRegisterTab, { ACTIONS, type GasRegisterPrefill } from '@/components/field-toolkit/GasRegisterTab';

type ToolkitTab = 'scan' | 'checklist' | 'installations' | 'register' | 'photos';

const TABS: Array<{ id: ToolkitTab; label: string; icon: LucideIcon }> = [
  { id: 'scan', label: 'Scan', icon: ScanText },
  { id: 'checklist', label: 'Checklist', icon: CheckSquare },
  { id: 'installations', label: 'Installations', icon: ClipboardCheck },
  { id: 'register', label: 'Gas register', icon: FileText },
  { id: 'photos', label: 'Photo notes', icon: Camera },
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
    document.querySelector<HTMLElement>('[role="tab"][data-selected]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [active]);

  return (
    <div className="border border-stone-200 bg-white shadow-sm">
      <Tabs selectedKey={active} onSelectionChange={(key) => go(parseTab(String(key)))} className="gap-0">
        <div className="overflow-x-auto bg-stone-50 px-2">
          <TabList aria-label="Field toolkit" className="min-w-max">
            {TABS.map((tab) => (
              <Tab key={tab.id} id={tab.id} icon={tab.icon} className="min-h-12 px-3">
                {tab.label}
              </Tab>
            ))}
          </TabList>
        </div>

        <TabPanel id="scan" className="p-4 sm:p-6">
          <OcrNameplateScanner
            onUseRefrigerant={(code, extra) => {
              setScanned({ code, amountKg: extra?.amountKg });
              go('register');
            }}
          />
        </TabPanel>
        <TabPanel id="checklist" className="p-4 sm:p-6">
          <ChecklistTab saved={checklist} onSave={setChecklist} onGoToInstallations={() => go('installations')} />
        </TabPanel>
        <TabPanel id="installations" className="p-4 sm:p-6">
          <InstallationsTab checklist={checklist} onChecklistUsed={() => setChecklist(null)} onGoToChecklist={() => go('checklist')} />
        </TabPanel>
        <TabPanel id="register" className="p-4 sm:p-6">
          <GasRegisterTab
            prefill={prefill}
            onPrefillConsumed={() => {
              setScanned(undefined);
              if (voicePrefill) router.replace(`${pathname}?tab=register`, { scroll: false });
            }}
          />
        </TabPanel>
        <TabPanel id="photos" className="p-4 sm:p-6">
          <div className="space-y-3">
            <p className="border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600">Photo notes are saved on this device only. To keep a photo with a job record, attach it to an installation.</p>
            <ImageAnnotationWorkbench />
          </div>
        </TabPanel>
      </Tabs>
    </div>
  );
}
