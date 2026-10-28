import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowRight, FlaskConical, ScanText, ShieldCheck, Wrench } from 'lucide-react';
import FieldToolkit from '@/components/FieldToolkit';

const HIGHLIGHTS = [
    { icon: ScanText, label: 'Nameplate scan' },
    { icon: ShieldCheck, label: 'Compliance checklists' },
    { icon: Wrench, label: 'Offline logging' },
];

export default function FieldToolkitPage() {
    return (
        <div className="space-y-6">
            <header className="relative overflow-hidden rounded-2xl border border-[#E7E5E4] bg-gradient-to-br from-[#FAFAF9] via-white to-[#FEF3C7]/50 p-5 sm:p-6">
                <div
                    aria-hidden
                    className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-[#D97706]/10 blur-3xl"
                />
                <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#1C1917] text-[#F5B971] shadow-sm">
                            <Wrench className="h-7 w-7" aria-hidden="true" />
                        </span>
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#b45309]">Field operations</p>
                            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#1C1917]">Field Toolkit</h1>
                            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#78716C]">
                                Scan nameplates, work through compliance checklists, record installations and log refrigerant.
                                Everything keeps working when the site signal drops.
                            </p>
                            <ul className="mt-3 flex flex-wrap gap-2">
                                {HIGHLIGHTS.map(item => (
                                    <li key={item.label} className="inline-flex items-center gap-1.5 rounded-full border border-[#E7E5E4] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#57534E]">
                                        <item.icon className="h-3.5 w-3.5 text-[#D97706]" aria-hidden="true" />
                                        {item.label}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <Link
                        href="/whatgas"
                        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-[#1C1917] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#292524] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] focus-visible:ring-offset-2 lg:self-center"
                    >
                        <FlaskConical className="h-4 w-4" aria-hidden="true" />
                        WhatGas + Risk Engine
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                </div>
            </header>
            <Suspense fallback={null}>
                <FieldToolkit />
            </Suspense>
        </div>
    );
}
