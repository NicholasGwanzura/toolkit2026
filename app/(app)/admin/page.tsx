'use client';

import Link from 'next/link';
import { ArrowRight, UserPlus } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import ComplianceDashboard from '@/components/ComplianceDashboard';

export default function AdminPage() {
    const { user: session, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D97706]"></div>
            </div>
        );
    }

    if (!session) return null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Compliance Report</h1>
                    <p className="mt-1 text-gray-500">
                        National compliance figures for the selected period. Operational queues live on the Admin Dashboard.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center justify-center gap-2 border border-[#E7E5E4] bg-white px-4 py-2.5 text-sm font-semibold text-[#44403C] transition hover:bg-[#FAFAF9]"
                    >
                        Admin Dashboard
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                        href="/admin/invites"
                        className="inline-flex items-center justify-center gap-2 bg-[#D97706] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                    >
                        <UserPlus className="h-4 w-4" />
                        Invite users
                    </Link>
                </div>
            </div>
            <ComplianceDashboard />
        </div>
    );
}
