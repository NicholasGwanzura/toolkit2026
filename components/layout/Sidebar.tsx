'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ComponentType, SVGProps, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, ChevronDown, LifeBuoy, UserCircle, WifiOff, X } from 'lucide-react';
import { useAuth, logout } from '@/lib/auth';
import { useEmergencyMode } from '@/lib/emergencyMode';
import { UserProfileModal } from '@/components/UserProfileModal';
import { useAdminActionQueue, type AdminActionItem } from '@/lib/api';
import { activeHref, sectionsForRole, showsEmergencyMode, type BadgeKey, type NavItem, type NavSection } from './sidebar-nav';

interface SidebarProps {
    onClose?: () => void;
}

function badgeCountsFromQueue(items: AdminActionItem[] | undefined): Record<BadgeKey, number> {
    const count = (key: string) => items?.find((item) => item.key === key)?.count ?? 0;
    return {
        applications: count('applications'),
        emailProblems: count('emailProblems'),
        cocRequests: count('cocRequests'),
        certificateRequests: count('certificateApprovals') + count('certificatesToIssue'),
        courseApprovals: count('courseApprovals'),
        reorderReviews: count('reorderReviews'),
        supplierCompliance: count('supplierCompliance'),
        openAccidents: count('openAccidents'),
        rewardRequests: count('rewardRequests'),
    };
}

function NavLink({
    item,
    current,
    badges,
    onClose,
}: {
    item: NavItem;
    current: string | null;
    badges: Record<BadgeKey, number>;
    onClose?: () => void;
}) {
    const badgeCount = item.badge ? badges[item.badge] : 0;
    const isActive = item.href === current;
    return (
        <Link
            href={item.href}
            onClick={onClose}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
                'group flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1C1917]',
                isActive
                    ? 'bg-white/[0.12] text-white shadow-sm'
                    : 'text-[#D6D3D1] hover:bg-white/[0.08] hover:text-white'
            )}
        >
            <item.icon
                className={cn(
                    'w-4 h-4 flex-shrink-0 transition-colors',
                    isActive ? 'text-[#F59E0B]' : 'text-[#A8A29E] group-hover:text-white'
                )}
            />
            <span className="truncate">{item.name}</span>
            {badgeCount > 0 && (
                <span
                    className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F59E0B] px-1.5 text-[11px] font-bold text-[#1C1917]"
                    aria-label={`${badgeCount} items waiting for review`}
                >
                    {badgeCount}
                </span>
            )}
            {isActive && <span className={cn('w-1.5 h-1.5 rounded-full bg-[#F59E0B] flex-shrink-0', badgeCount === 0 && 'ml-auto')} />}
        </Link>
    );
}

function NavSectionGroup({
    section,
    index,
    current,
    waiting,
    badges,
    isOpen,
    onToggle,
    onClose,
}: {
    section: NavSection;
    index: number;
    current: string | null;
    /** Items waiting for review anywhere in this section. */
    waiting: number;
    badges: Record<BadgeKey, number>;
    isOpen: boolean;
    onToggle: () => void;
    onClose?: () => void;
}) {
    const hasActiveItem = section.items.some(item => item.href === current);

    if (!section.label) {
        return (
            <div>
                <div className="space-y-0.5">
                    {section.items.map(item => (
                        <NavLink key={item.href} item={item} current={current} badges={badges} onClose={onClose} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div>
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={isOpen}
                className={cn(
                    'mt-1 flex min-h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-[11px] font-bold uppercase tracking-[0.16em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1C1917]',
                    hasActiveItem ? 'text-white' : 'text-[#A8A29E] hover:bg-white/[0.06] hover:text-white',
                    index === 0 && 'mt-0'
                )}
            >
                <span className="truncate">{section.label}</span>
                {hasActiveItem && <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" aria-hidden="true" />}
                {waiting > 0 && (
                    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F59E0B] px-1.5 text-[11px] font-bold tracking-normal text-[#1C1917]" aria-label={`${waiting} items waiting for review`}>
                        {waiting}
                    </span>
                )}
                <ChevronDown
                    className={cn(
                        'h-3.5 w-3.5 transition-transform',
                        waiting === 0 && 'ml-auto',
                        isOpen ? 'rotate-180 text-[#F59E0B]' : 'text-[#78716C]'
                    )}
                    aria-hidden="true"
                />
            </button>
            {isOpen && (
                <div className="mt-1 space-y-0.5">
                    {section.items.map(item => (
                        <NavLink key={item.href} item={item} current={current} badges={badges} onClose={onClose} />
                    ))}
                </div>
            )}
        </div>
    );
}

export function Sidebar({ className, onClose }: SidebarProps & { className?: string }) {
    const pathname = usePathname();
    const { user } = useAuth();
    // No role yet means still loading: show nothing rather than guessing the wrong menu.
    const role = user?.role ?? null;
    const { emergencyMode, toggleEmergencyMode } = useEmergencyMode();
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
    const { data: actionQueue } = useAdminActionQueue(role === 'org_admin');
    const badges = useMemo(() => badgeCountsFromQueue(actionQueue?.items), [actionQueue]);

    const visibleSections = useMemo(() => (role ? sectionsForRole(role) : []), [role]);
    const current = useMemo(() => activeHref(visibleSections.flatMap(section => section.items), pathname), [visibleSections, pathname]);

    return (
        <div className={cn('flex flex-col h-full bg-[#1C1917] text-white', className)}>
            {/* Logo */}
            <div className="h-16 flex items-center px-5 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center justify-between w-full">
                    <Link href="/dashboard" className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1C1917]" aria-label="Go to dashboard">
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <img
                                src="/logos/ministry-of-environment.jpeg"
                                alt="Ministry of Environment, Climate and Wildlife"
                                className="h-7 w-7 rounded-full object-cover"
                            />
                            <span className="h-6 w-px bg-white/20" />
                            <img
                                src="/logos/hevacraz-logo.jpeg"
                                alt="HEVACRAZ"
                                className="h-7 w-7 rounded-full object-cover"
                            />
                        </div>
                    </Link>
                    {onClose && (
                        <button
                            onClick={onClose}
                            aria-label="Close navigation"
                            className="lg:hidden flex h-10 w-10 items-center justify-center rounded-lg text-[#D6D3D1] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1C1917]"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-2 py-3 [scrollbar-color:#57534E_transparent]" aria-label="Primary navigation">
                {!role && (
                    <div className="space-y-2 px-1" aria-label="Loading navigation">
                        {[0, 1, 2, 3, 4].map(item => <div key={item} className="h-9 animate-pulse rounded-lg bg-white/[0.06]" />)}
                    </div>
                )}
                <div className="space-y-1">
                    {visibleSections.map((section, i) => {
                        const key = section.label ?? `primary-${i}`;
                        const hasActiveItem = section.items.some(item => item.href === current);
                        const waiting = section.items.reduce((sum, item) => sum + (item.badge ? badges[item.badge] : 0), 0);
                        // Work waiting for review must never sit inside a closed section unnoticed.
                        const isOpen = !section.label || (expandedSections[key] ?? (hasActiveItem || waiting > 0));

                        return (
                            <NavSectionGroup
                                key={key}
                                section={section}
                                index={i}
                                current={current}
                                waiting={waiting}
                                badges={badges}
                                isOpen={isOpen}
                                onToggle={() => setExpandedSections(prev => ({ ...prev, [key]: !isOpen }))}
                                onClose={onClose}
                            />
                        );
                    })}
                </div>
            </nav>

            {/* Emergency Mode — for people on site or teaching it, not suppliers or admin oversight */}
            {role && showsEmergencyMode(role) && (
                <div className="space-y-1 px-2 pb-2 flex-shrink-0">
                    {emergencyMode && (
                        <Link href="/emergency-mode" onClick={onClose} className="flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1C1917]">
                            <LifeBuoy className="h-4 w-4 flex-shrink-0 text-[#F59E0B]" aria-hidden="true" />
                            Open emergency guide
                        </Link>
                    )}
                    <button
                        type="button"
                        onClick={toggleEmergencyMode}
                        className={cn(
                            'w-full flex min-h-11 items-center gap-3 rounded-lg border px-3 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1C1917]',
                            emergencyMode
                                ? 'bg-rose-600 border-rose-500 text-white hover:bg-rose-700'
                                : 'bg-[#292524] border-white/10 text-[#D6D3D1] hover:bg-white/[0.08] hover:text-white'
                        )}
                    >
                        {emergencyMode
                            ? <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            : <WifiOff className="w-4 h-4 flex-shrink-0" />
                        }
                        <span className="truncate">
                            {emergencyMode ? 'Emergency Active' : 'Emergency Mode'}
                        </span>
                        {emergencyMode && (
                            <span className="ml-auto w-2 h-2 bg-white animate-pulse flex-shrink-0" />
                        )}
                    </button>
                </div>
            )}

            {/* User / Logout */}
            <div className="p-3 border-t border-white/10 flex-shrink-0">
                <button
                    onClick={() => setIsProfileModalOpen(true)}
                    className="flex min-h-11 w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1C1917]"
                >
                    <div className="w-8 h-8 flex items-center justify-center bg-[#292524] flex-shrink-0 rounded-full">
                        <UserCircle className="w-5 h-5 text-[#D6D3D1]" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{user?.name ?? ' '}</p>
                        <p className="text-xs font-medium text-[#A8A29E] capitalize truncate">
                            {user?.role?.replace('_', ' ') ?? ''}
                        </p>
                    </div>
                </button>
            </div>

            {isProfileModalOpen && (
                <UserProfileModal
                    user={user}
                    onClose={() => setIsProfileModalOpen(false)}
                    onLogout={logout}
                />
            )}
        </div>
    );
}
