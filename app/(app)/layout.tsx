'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { FloatingVoiceButton } from '@/components/FloatingVoiceButton';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Once per visit while online, save Emergency Mode and the Field Toolkit for use without signal.
    useEffect(() => {
        if (!('serviceWorker' in navigator) || !navigator.onLine) return;
        try {
            if (sessionStorage.getItem('coolpro_offline_warmed')) return;
            sessionStorage.setItem('coolpro_offline_warmed', '1');
        } catch {
            // Storage blocked: warm anyway.
        }
        navigator.serviceWorker.ready
            .then((registration) => registration.active?.postMessage({ type: 'warm-offline-pages' }))
            .catch(() => {});
    }, []);

    return (
        <div className="min-h-screen bg-white">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Desktop sidebar */}
            <div className="hidden lg:block">
                <aside className="fixed left-0 top-0 z-40 h-screen w-64">
                    <Sidebar />
                </aside>
            </div>

            {/* Mobile sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:hidden ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <Sidebar onClose={() => setSidebarOpen(false)} />
            </aside>

            {/* Main content */}
            <div className="lg:ml-64 flex flex-col min-h-screen">
                <Topbar onMenuClick={() => setSidebarOpen(true)} />
                <main className="flex-1 p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
            <FloatingVoiceButton />
        </div>
    );
}
