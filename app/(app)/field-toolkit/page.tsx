import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowRight, FlaskConical } from 'lucide-react';
import FieldToolkit from '@/components/FieldToolkit';

export default function FieldToolkitPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Field Toolkit</h1>
                    <p className="mt-1 text-gray-500">Scan nameplates, work through checklists, record installations and log refrigerant. Works offline.</p>
                </div>
                <Link
                    href="/whatgas"
                    className="inline-flex items-center gap-2 border border-[#E5E0DB] bg-white px-4 py-2 text-sm font-semibold text-[#1C1917] transition-colors hover:border-[#D97706] hover:text-[#D97706]"
                >
                    <FlaskConical className="h-4 w-4" />
                    WhatGas + Risk Engine
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
            <Suspense fallback={null}>
                <FieldToolkit />
            </Suspense>
        </div>
    );
}
