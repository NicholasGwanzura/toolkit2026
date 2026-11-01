'use client';

import { useState } from 'react';
import { logout } from '@/lib/auth';
import { useClientSession } from '@/lib/useClientSession';
import { Menu, LogOut, User, ChevronDown } from 'lucide-react';
import { NotificationBell } from '@/components/layout/NotificationBell';

export function Topbar({ onMenuClick, title }: { onMenuClick: () => void; title?: string }) {
    const session = useClientSession();
    const [showUserMenu, setShowUserMenu] = useState(false);

    return (
        <header className="sticky top-0 z-30 h-14 bg-white border-b border-[#E7E5E4] flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden p-1.5 text-[#78716C] hover:text-[#1C1917] transition-colors"
                    aria-label="Open menu"
                >
                    <Menu className="h-5 w-5" />
                </button>
                {title && (
                    <h1 className="text-sm font-semibold text-[#1C1917] tracking-wide">{title}</h1>
                )}
            </div>

            <div className="flex items-center gap-2">
                {session && <NotificationBell />}

                {session && (
                    <div className="relative">
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-[#1C1917] hover:bg-[#F5F5F4] transition-colors"
                        >
                            <div className="h-7 w-7 bg-[#B45309] flex items-center justify-center text-white text-xs font-bold">
                                {session.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="hidden md:block">{session.name.split(' ')[0]}</span>
                            <span className={`hidden md:inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                session.role === 'org_admin' ? 'bg-amber-100 text-amber-700' :
                                session.role === 'lecturer' ? 'bg-cyan-100 text-cyan-700' :
                                session.role === 'trainer' ? 'bg-blue-100 text-blue-700' :
                                session.role === 'vendor' ? 'bg-green-100 text-green-700' :
                                'bg-slate-100 text-slate-600'
                            }`}>
                                {session.role.replace('_', ' ')}
                            </span>
                            <ChevronDown className="h-3.5 w-3.5 text-[#78716C]" />
                        </button>

                        {showUserMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowUserMenu(false)}
                                />
                                <div className="absolute right-0 mt-1 w-56 rounded-lg bg-white border border-[#E7E5E4] shadow-sm py-1 z-50">
                                    <div className="px-4 py-3 border-b border-[#E7E5E4]">
                                        <p className="text-sm font-semibold text-[#1C1917]">{session.name}</p>
                                        <p className="text-xs text-[#78716C]">{session.email}</p>
                                        <span className="mt-1.5 inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#D97706]/10 text-[#D97706]">
                                            {session.role.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#44403C] hover:bg-[#F5F5F4] transition-colors">
                                        <User className="h-4 w-4" />
                                        My Profile
                                    </button>
                                    <button
                                        onClick={() => logout()}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#78716C] hover:bg-[#F5F5F4] hover:text-[#1C1917] transition-colors"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Sign out
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
}
