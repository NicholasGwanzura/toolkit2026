import type { ComponentType, SVGProps } from 'react';
import {
    AlertTriangle,
    Award,
    BadgeCheck,
    BarChart3,
    BookMarked,
    BookOpen,
    Briefcase,
    Calculator,
    CalendarDays,
    ClipboardCheck,
    ClipboardList,
    Contact,
    Database,
    Factory,
    FileCheck,
    FileText,
    FlaskConical,
    Gift,
    GraduationCap,
    HardHat,
    History,
    Inbox,
    Landmark,
    LayoutDashboard,
    Library,
    LifeBuoy,
    LineChart,
    Mail,
    PackagePlus,
    RefreshCcw,
    Send,
    Siren,
    ShieldCheck,
    Stamp,
    UserCheck,
    UserCog,
    UserPlus,
    Users,
    Wrench,
} from 'lucide-react';

export type BadgeKey =
    | 'applications'
    | 'emailProblems'
    | 'cocRequests'
    | 'certificateRequests'
    | 'courseApprovals'
    | 'reorderReviews'
    | 'supplierCompliance'
    | 'openAccidents'
    | 'rewardRequests';

export interface NavItem {
    name: string;
    href: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    roles: string[];
    /** Only this exact address counts as this item, for a parent of unrelated pages. */
    exact?: boolean;
    /** Shows a live count pill next to the item, taken from the admin action queue. */
    badge?: BadgeKey;
}

export interface NavSection {
    label?: string;
    items: NavItem[];
}

/** Everyone except administrators, who have their own menu below. */
export const NAV_SECTIONS: NavSection[] = [
    {
        // Always open: the same tools, in the same order, as the toolkit page.
        items: [
            { name: 'Commercial Refrigeration Digital Technical Toolkit', href: '/dashboard', icon: LayoutDashboard, roles: ['technician', 'contractor'] },
            { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['trainer', 'lecturer', 'vendor', 'student'] },
            { name: 'Field Job Planner', href: '/field-operations', icon: Wrench, roles: ['technician', 'contractor'] },
            { name: 'Field Toolkit', href: '/field-toolkit', icon: Briefcase, roles: ['technician', 'contractor'] },
            { name: 'Refrigerant Catalogue', href: '/refrigerants', icon: Database, roles: ['technician', 'contractor', 'trainer', 'lecturer', 'vendor', 'student'] },
            { name: 'Commercial Refrigeration Sizing Tool', href: '/sizing-tool', icon: Calculator, roles: ['technician', 'contractor'] },
            { name: 'Learning Hub', href: '/learn', icon: BookOpen, roles: ['technician', 'contractor', 'trainer', 'lecturer', 'student'] },
            { name: 'Events Calendar', href: '/events', icon: CalendarDays, roles: ['technician', 'contractor', 'trainer', 'lecturer', 'vendor', 'student'] },
            { name: 'Safety Center', href: '/safety-center', icon: LifeBuoy, roles: ['technician', 'contractor', 'trainer', 'lecturer', 'student'] },
            { name: 'Emergency Mode', href: '/emergency-mode', icon: Siren, roles: ['technician', 'contractor', 'trainer', 'lecturer', 'student'] },
            { name: 'WhatGas + Risk Engine', href: '/whatgas', icon: FlaskConical, roles: ['technician', 'contractor', 'trainer', 'lecturer', 'student'] },
            { name: 'Resources', href: '/resources', icon: Library, roles: ['technician', 'contractor', 'trainer', 'lecturer'] },
        ],
    },
    {
        label: 'Teaching',
        items: [
            { name: 'Manage Courses', href: '/learn/manage', icon: BookMarked, roles: ['trainer', 'lecturer'] },
            { name: 'Technician Registry', href: '/technician-registry', icon: Users, roles: ['trainer', 'lecturer'] },
        ],
    },
    {
        label: 'Compliance',
        items: [
            { name: 'Certifications', href: '/certifications', icon: Award, roles: ['technician', 'contractor', 'trainer', 'lecturer', 'student'] },
            { name: 'Public Verification Portal', href: '/certificate-verification', icon: BadgeCheck, roles: ['technician', 'contractor', 'trainer', 'lecturer', 'vendor', 'student'] },
            { name: 'Rewards', href: '/rewards', icon: Gift, roles: ['technician', 'contractor', 'vendor'] },
        ],
    },
    {
        label: 'Supply',
        items: [
            { name: 'Supply Reports', href: '/suppliers', icon: Factory, roles: ['vendor'] },
            { name: 'Gas Reorders', href: '/suppliers/reorder', icon: PackagePlus, roles: ['vendor'] },
            { name: 'Verify Buyer', href: '/suppliers/verify-buyer', icon: UserCheck, roles: ['vendor'] },
            { name: 'Supplier Compliance', href: '/supplier-compliance', icon: FileCheck, roles: ['vendor'] },
        ],
    },
];

export const ADMIN_NAV_SECTIONS: NavSection[] = [
    {
        items: [
            { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['org_admin'] },
            { name: 'Compliance Report', href: '/admin', icon: ShieldCheck, roles: ['org_admin'], exact: true },
        ],
    },
    {
        label: 'Reviews',
        items: [
            { name: 'NOU Dashboard', href: '/nou-dashboard', icon: Landmark, roles: ['org_admin'], badge: 'reorderReviews' },
            { name: 'Course Approvals', href: '/learn/approvals', icon: ClipboardCheck, roles: ['org_admin'], badge: 'courseApprovals' },
            { name: 'COC Requests', href: '/admin/coc-requests', icon: FileText, roles: ['org_admin'], badge: 'cocRequests' },
            { name: 'Accidents', href: '/admin/accidents', icon: AlertTriangle, roles: ['org_admin'], badge: 'openAccidents' },
        ],
    },
    {
        label: 'Operations & Tools',
        items: [
            { name: 'Field Job Planner', href: '/field-operations', icon: Wrench, roles: ['org_admin'] },
            { name: 'Field Toolkit', href: '/field-toolkit', icon: Briefcase, roles: ['org_admin'] },
            { name: 'Refrigerant Catalogue', href: '/refrigerants', icon: Database, roles: ['org_admin'] },
            { name: 'Commercial Refrigeration Sizing Tool', href: '/sizing-tool', icon: Calculator, roles: ['org_admin'] },
            { name: 'Learning Hub', href: '/learn', icon: BookOpen, roles: ['org_admin'] },
            { name: 'Manage Courses', href: '/learn/manage', icon: BookMarked, roles: ['org_admin'] },
            { name: 'Events Calendar', href: '/events', icon: CalendarDays, roles: ['org_admin'] },
            { name: 'Safety Center', href: '/safety-center', icon: LifeBuoy, roles: ['org_admin'] },
            { name: 'WhatGas + Risk Engine', href: '/whatgas', icon: FlaskConical, roles: ['org_admin'] },
        ],
    },
    {
        label: 'Suppliers',
        items: [
            { name: 'Supplier Management', href: '/suppliers', icon: Factory, roles: ['org_admin'] },
            { name: 'Invite Supplier', href: '/admin/suppliers/add', icon: UserPlus, roles: ['org_admin'] },
            { name: 'Supplier Compliance', href: '/supplier-compliance', icon: FileCheck, roles: ['org_admin'], badge: 'supplierCompliance' },
            { name: 'Gas Reorders', href: '/suppliers/reorder', icon: PackagePlus, roles: ['org_admin'] },
            { name: 'Verify Buyer', href: '/suppliers/verify-buyer', icon: UserCheck, roles: ['org_admin'] },
            { name: 'Supplier Approvals', href: '/suppliers/approvals', icon: Stamp, roles: ['org_admin'] },
        ],
    },
    {
        label: 'People',
        items: [
            { name: 'System Users', href: '/admin/users', icon: UserCog, roles: ['org_admin'] },
            { name: 'Applications', href: '/admin/applications', icon: Inbox, roles: ['org_admin'], badge: 'applications' },
            { name: 'Applicants', href: '/admin/applicants', icon: ClipboardList, roles: ['org_admin'] },
            { name: 'Invites', href: '/admin/invites', icon: Send, roles: ['org_admin'] },
            { name: 'Contractors', href: '/admin/contractors', icon: HardHat, roles: ['org_admin'] },
            { name: 'Student Directory', href: '/admin/students', icon: GraduationCap, roles: ['org_admin'] },
        ],
    },
    {
        label: 'Registry',
        items: [
            { name: 'Technician Registry', href: '/technician-registry', icon: Users, roles: ['org_admin'] },
            { name: 'Certifications', href: '/certifications', icon: Award, roles: ['org_admin'], badge: 'certificateRequests' },
            { name: 'Public Verification Portal', href: '/certificate-verification', icon: BadgeCheck, roles: ['org_admin'] },
            { name: 'Memberships', href: '/admin/memberships', icon: Contact, roles: ['org_admin'] },
            { name: 'Rewards', href: '/rewards', icon: Gift, roles: ['org_admin'], badge: 'rewardRequests' },
        ],
    },
    {
        label: 'Reporting & System',
        items: [
            { name: 'Reporting', href: '/admin/reporting', icon: BarChart3, roles: ['org_admin'] },
            { name: 'Refrigerant Analytics', href: '/admin/refrigerant-analytics', icon: LineChart, roles: ['org_admin'] },
            { name: 'Refrigerant Sync', href: '/admin/refrigerants', icon: RefreshCcw, roles: ['org_admin'] },
            { name: 'Email Log', href: '/admin/email-log', icon: Mail, roles: ['org_admin'], badge: 'emailProblems' },
            { name: 'Audit Trail', href: '/admin/audit-trail', icon: History, roles: ['org_admin'] },
        ],
    },
];

export const sectionsForRole = (role: string): NavSection[] =>
    (role === 'org_admin' ? ADMIN_NAV_SECTIONS : NAV_SECTIONS)
        .map(section => ({ ...section, items: section.items.filter(item => item.roles.includes(role)) }))
        .filter(section => section.items.length > 0);

/** The one item for this page: the closest match, so a page never lights up its parent too. */
export function activeHref(items: NavItem[], pathname: string): string | null {
    let best: string | null = null;
    for (const item of items) {
        const matches = pathname === item.href || (!item.exact && pathname.startsWith(`${item.href}/`));
        if (matches && (!best || item.href.length > best.length)) best = item.href;
    }
    return best;
}

/** Emergency Mode is for people working on site or teaching it: not suppliers, and not admin oversight. */
export const showsEmergencyMode = (role: string) => role !== 'org_admin' && role !== 'vendor';
