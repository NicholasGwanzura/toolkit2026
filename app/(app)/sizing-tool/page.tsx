'use client';

import Link from 'next/link';
import { ArrowRight, FlaskConical } from 'lucide-react';

import SizingTool from '@/components/SizingTool';

export default function SizingToolPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Commercial Refrigeration Sizing Tool</h1>
                    <p className="text-gray-500 mt-1">Build a transparent preliminary load estimate from site and product data</p>
                </div>
                <Link
                    href="/whatgas"
                    className="inline-flex items-center gap-2 border border-[#E5E0DB] bg-white px-4 py-2 text-sm font-semibold text-[#1C1917] hover:border-[#D97706] hover:text-[#D97706] transition-colors"
                >
                    <FlaskConical className="h-4 w-4" />
                    WhatGas + Risk Engine
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
            <SizingTool />
        </div>
    );
}
