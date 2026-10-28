'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ComponentType, SVGProps, useState } from 'react';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    CalendarDays,
    Library,
    BookOpen,
    Calculator,
    Factory,
    Wrench,
    ClipboardList,
    Award,
    Users,
    ShieldCheck,
    X,
    AlertTriangle,
    WifiOff,
    UserCircle,
    FlaskConical,
    ShieldAlert,
    BarChart3,
    Database,
    FileText,
    UserPlus,
    Mail,
    ChevronDown,
    HardHat,
} from 'lucide-react';
import { useAuth, logout } from '@/lib/auth';
import { useEmergencyMode } from '@/lib/emergencyMode';
import { UserProfileModal } from '@/components/UserProfileModal';
import { useApplicationCounts } from '@/lib/api';

interface NavItem {
    name: string;
    href: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    roles: string[];
    exact?: boolean;
    children?: NavItem[];
    /** Shows a live count pill next to the item. */
    badge?: 'applications';
}

interface NavSection {
    label?: string;
    items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
    {
        items: [
            { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['technician', 'trainer', 'lecturer', 'vendor', 'org_admin', 'student', 'contractor'] },
        ],
    },
    {
        label: 'Operations',
        items: [
            { name: 'Learning Hub', href: '/learn', icon: BookOpen, roles: ['technician', 'contractor', 'trainer', 'lecturer', 'org_admin', 'student'] },
            { name: 'Events Calendar', href: '/training', icon: CalendarDays, roles: ['technician', 'contractor', 'trainer', 'lecturer', 'vendor', 'org_admin', 'student'] },
            { name: 'Manage Courses', href: '/learn/manage', icon: BookOpen, roles: ['trainer', 'lecturer'] },
            { name: 'Safety Center', href: '/safety-center', icon: ShieldCheck, roles: ['technician', 'contractor', 'trainer', 'lecturer', 'student'] },
            { name: 'Resources', href: '/resources', icon: Library, roles: ['technician', 'contractor', 'trainer', 'lecturer'] },
            { name: 'Field Operations', href: '/field-operations', icon: Wrench, roles: ['technician', 'contractor', 'org_admin'] },
        ],
    },
    {
        label: 'Field Tools',
        items: [
            { name: 'Field Toolkit', href: '/field-toolkit', icon: Wrench, roles: ['technician', 'contractor', 'org_admin'] },
        ],
    },
    {
        label: 'Tools',
        items: [
            { name: 'WhatGas + Risk Engine', href: '/whatgas', icon: FlaskConical, roles: ['technician', 'contractor', 'trainer', 'lecturer', 'org_admin', 'student'] },
            { name: 'Sizing Tool', href: '/sizing-tool', icon: Calculator, roles: ['technician', 'contractor'] },
        ],
    },
    {
        label: 'Refrigerants',
        items: [
            { name: 'Refrigerant Catalogue', href: '/refrigerants', icon: Database, roles: ['technician', 'contractor', 'trainer', 'lecturer', 'vendor', 'org_admin', 'student'] },
        ],
    },
    {
        label: 'Compliance',
        items: [
            { name: 'Certification', href: '/certifications', icon: Award, roles: ['technician', 'contractor', 'trainer', 'lecturer', 'org_admin', 'student'] },
            { name: 'Rewards', href: '/rewards', icon: Award, roles: ['technician', 'contractor', 'vendor', 'org_admin'] },
            { name: 'Supplier Compliance', href: '/supplier-compliance', icon: ShieldCheck, roles: ['vendor'] },
            { name: 'Supply Reports', href: '/suppliers', icon: Factory, roles: ['vendor', 'org_admin'] },
            { name: 'Vendor Reorder', href: '/suppliers/reorder', icon: Factory, roles: ['vendor'] },
            { name: 'Verify Buyer', href: '/suppliers/verify-buyer', icon: ShieldCheck, roles: ['vendor'] },
            { name: 'Supplier Approvals', href: '/suppliers/approvals', icon: ShieldCheck, roles: ['org_admin'] },
        ],
    },
    {
        label: 'Registry',
        items: [
            { name: 'Technician Registry', href: '/technician-registry', icon: Users, roles: ['trainer', 'lecturer', 'org_admin'] },
            { name: 'Certificate Verification', href: '/verify-technician', icon: ShieldCheck, roles: ['trainer', 'lecturer', 'vendor', 'org_admin', 'contractor'] },
        ],
    },
    {
        label: 'People',
        items: [
            { name: 'System Users', href: '/admin/users', icon: Users, roles: ['org_admin'] },
            { name: 'Applications', href: '/admin/applications', icon: ShieldCheck, roles: ['org_admin'], badge: 'applications' },
            { name: 'Invites', href: '/admin/invites', icon: UserPlus, roles: ['org_admin'] },
        ],
    },
    {
        label: 'Admin Reviews',
        items: [
            { name: 'NOU Dashboard', href: '/nou-dashboard', icon: AlertTriangle, roles: ['org_admin'] },
            { name: 'Course Approvals', href: '/learn/approvals', icon: ShieldCheck, roles: ['org_admin'] },
            { name: 'COC Requests', href: '/admin/coc-requests', icon: FileText, roles: ['org_admin'] },
            { name: 'Accidents Module', href: '/admin/accidents', icon: AlertTriangle, roles: ['org_admin'] },
        ],
    },
    {
        label: 'Reporting & Data',
        items: [
            { name: 'Reporting', href: '/admin/reporting', icon: BarChart3, roles: ['org_admin'] },
            { name: 'Refrigerant Analytics', href: '/admin/refrigerant-analytics', icon: BarChart3, roles: ['org_admin'] },
            { name: 'Refrigerants (WhatGas Sync)', href: '/admin/refrigerants', icon: Database, roles: ['org_admin'] },
        ],
    },
];

const ADMIN_NAV_SECTIONS: NavSection[] = [
    {
        items: [
            { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['org_admin'] },
            { name: 'Compliance Dashboard', href: '/admin', icon: ShieldCheck, roles: ['org_admin'], exact: true },
        ],
    },
    {
        label: 'Operations',
        items: [
            { name: 'Learning Hub', href: '/learn', icon: BookOpen, roles: ['org_admin'], exact: true },
            { name: 'Manage Courses', href: '/learn/manage', icon: BookOpen, roles: ['org_admin'] },
            { name: 'Field Operations', href: '/field-operations', icon: Wrench, roles: ['org_admin'] },
            { name: 'Field Toolkit', href: '/field-toolkit', icon: Wrench, roles: ['org_admin'] },
            { name: 'Safety Center', href: '/safety-center', icon: ShieldCheck, roles: ['org_admin'] },
        ],
    },
    {
        label: 'Tools',
        items: [
            { name: 'WhatGas + Risk Engine', href: '/whatgas', icon: FlaskConical, roles: ['org_admin'] },
            { name: 'Sizing Tool', href: '/sizing-tool', icon: Calculator, roles: ['org_admin'] },
        ],
    },
    {
        label: 'Refrigerants',
        items: [
            { name: 'Refrigerant Catalogue', href: '/refrigerants', icon: Database, roles: ['org_admin'] },
        ],
    },
    {
        label: 'Suppliers',
        items: [
            { name: 'Supplier Management', href: '/suppliers', icon: Factory, roles: ['org_admin'], exact: true },
            { name: 'Invite Supplier', href: '/admin/suppliers/add', icon: UserPlus, roles: ['org_admin'] },
            { name: 'Supplier Compliance', href: '/supplier-compliance', icon: ShieldCheck, roles: ['org_admin'] },
            { name: 'Vendor Reorder', href: '/suppliers/reorder', icon: Factory, roles: ['org_admin'] },
            { name: 'Verify Buyer', href: '/suppliers/verify-buyer', icon: ShieldCheck, roles: ['org_admin'] },
            { name: 'Supplier Approvals', href: '/suppliers/approvals', icon: ShieldCheck, roles: ['org_admin'] },
        ],
    },
    {
        label: 'Registry & People',
        items: [
            { name: 'Technician Registry', href: '/technician-registry', icon: Users, roles: ['org_admin'] },
            { name: 'Certificate Verification', href: '/verify-technician', icon: ShieldCheck, roles: ['org_admin'] },
            { name: 'Certifications', href: '/certifications', icon: Award, roles: ['org_admin'] },
            { name: 'Rewards', href: '/rewards', icon: Award, roles: ['org_admin'] },
            { name: 'System Users', href: '/admin/users', icon: Users, roles: ['org_admin'] },
            { name: 'Applications', href: '/admin/applications', icon: ShieldCheck, roles: ['org_admin'], badge: 'applications' },
            { name: 'Applicants', href: '/admin/applicants', icon: ClipboardList, roles: ['org_admin'] },
            { name: 'Memberships', href: '/admin/memberships', icon: Award, roles: ['org_admin'] },
            { name: 'Email Log', href: '/admin/email-log', icon: Mail, roles: ['org_admin'] },
            { name: 'Audit Trail', href: '/admin/audit-trail', icon: ClipboardList, roles: ['org_admin'] },
            { name: 'Contractors', href: '/admin/contractors', icon: HardHat, roles: ['org_admin'] },
            { name: 'Invites', href: '/admin/invites', icon: UserPlus, roles: ['org_admin'] },
        ],
    },
    {
        label: 'Reviews & Data',
        items: [
            { name: 'NOU Dashboard', href: '/nou-dashboard', icon: AlertTriangle, roles: ['org_admin'] },
            { name: 'Course Approvals', href: '/learn/approvals', icon: ShieldCheck, roles: ['org_admin'] },
            { name: 'COC Requests', href: '/admin/coc-requests', icon: FileText, roles: ['org_admin'] },
            { name: 'Accidents Module', href: '/admin/accidents', icon: AlertTriangle, roles: ['org_admin'] },
            { name: 'Reporting', href: '/admin/reporting', icon: BarChart3, roles: ['org_admin'] },
            { name: 'Refrigerant Analytics', href: '/admin/refrigerant-analytics', icon: BarChart3, roles: ['org_admin'] },
            { name: 'Refrigerants (WhatGas Sync)', href: '/admin/refrigerants', icon: Database, roles: ['org_admin'] },
        ],
    },
];

interface SidebarProps {
    onClose?: () => void;
}

function NavLink({ item, pathname, onClose }: { item: NavItem; pathname: string; onClose?: () => void }) {
    const { data: applicationCounts } = useApplicationCounts(item.badge === 'applications');
    const badgeCount = item.badge === 'applications' ? applicationCounts?.total.awaitingReview ?? 0 : 0;
    const isActive = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
    return (
        <Link
            href={item.href}
            onClick={onClose}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
                'group flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1C1917]',
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
                    aria-label={`${badgeCount} applications waiting for review`}
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
    pathname,
    isOpen,
    onToggle,
    onClose,
}: {
    section: NavSection;
    index: number;
    pathname: string;
    isOpen: boolean;
    onToggle: () => void;
    onClose?: () => void;
}) {
    const hasActiveItem = section.items.some(item => item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));

    if (!section.label) {
        return (
            <div>
                <div className="space-y-0.5">
                    {section.items.map(item => (
                        <NavLink key={item.href} item={item} pathname={pathname} onClose={onClose} />
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
                <ChevronDown
                    className={cn(
                        'ml-auto h-3.5 w-3.5 transition-transform',
                        isOpen ? 'rotate-180 text-[#F59E0B]' : 'text-[#78716C]'
                    )}
                    aria-hidden="true"
                />
            </button>
            {isOpen && (
                <div className="mt-1 space-y-0.5">
                    {section.items.map(item => (
                        <NavLink key={item.href} item={item} pathname={pathname} onClose={onClose} />
                    ))}
                </div>
            )}
        </div>
    );
}

export function Sidebar({ className, onClose }: SidebarProps & { className?: string }) {
    const pathname = usePathname();
    const { user } = useAuth();
    const role = user?.role ?? 'technician';
    const { emergencyMode, toggleEmergencyMode } = useEmergencyMode();
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

    const navSections = role === 'org_admin' ? ADMIN_NAV_SECTIONS : NAV_SECTIONS;
    const visibleSections = navSections.map(section => ({
        ...section,
        items: section.items.filter(item => item.roles.includes(role)),
    })).filter(section => section.items.length > 0);

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
                <div className="space-y-1">
                    {visibleSections.map((section, i) => {
                        const key = section.label ?? `primary-${i}`;
                        const hasActiveItem = section.items.some(item => item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));
                        const isOpen = !section.label || (expandedSections[key] ?? hasActiveItem);

                        return (
                            <NavSectionGroup
                                key={key}
                                section={section}
                                index={i}
                                pathname={pathname}
                                isOpen={isOpen}
                                onToggle={() => setExpandedSections(prev => ({ ...prev, [key]: !isOpen }))}
                                onClose={onClose}
                            />
                        );
                    })}
                </div>
            </nav>

            {/* Emergency Mode — field-technician concept, not relevant to admin oversight roles */}
            {role !== 'org_admin' && (
                <div className="px-2 pb-2 flex-shrink-0">
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
                    className="flex min-h-10 w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1C1917]"
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
