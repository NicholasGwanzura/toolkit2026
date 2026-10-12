'use client';

import { useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  ClockAlert,
  GraduationCap,
  Mail,
  MailWarning,
  Phone,
  ShieldCheck,
  UserRoundCog,
  Wrench,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { RegistryMatchPrompt, registryMatchFrom, type RegistryMatch } from '@/components/admin/RegistryMatchPrompt';
import {
  approveRegistrationApplication,
  approveStudentApplication,
  approveSupplierApplication,
  approveTechnicianApplication,
  rejectRegistrationApplication,
  rejectStudentApplication,
  rejectSupplierApplication,
  rejectTechnicianApplication,
  useRegistrationApplications,
  useStudentApplications,
  useSupplierApplications,
  useTechnicianApplications,
  type RejectionNotes,
} from '@/lib/api';
import { APPLICANT_ROLES } from '@/lib/application-roles';
import { ApplicationDocuments } from '@/components/admin/ApplicationDocuments';
import type {
  ApplicationStatus,
  RegistrationApplication,
  StudentApplication,
  TechnicianApplication,
} from '@/types/index';
import type { SupplierApplicationRecord } from '@/lib/api';

type Lane = 'students' | 'technicians' | 'professionals' | 'suppliers';
type StatusFilter = 'open' | 'approved' | 'rejected' | 'all';

const STATUS_FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'open', label: 'Needs action' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
];

/** Narrows a lane's applications by status and by a search over name and email. */
function filterApplications<T extends { status: ApplicationStatus; email: string }>(
  apps: T[],
  filter: StatusFilter,
  search: string,
  nameOf: (app: T) => string,
): T[] {
  const needle = search.trim().toLowerCase();
  return apps.filter((app) => {
    const statusOk =
      filter === 'all' ||
      (filter === 'open' ? app.status === 'submitted' || app.status === 'under-review' : app.status === filter);
    const searchOk = !needle || `${nameOf(app)} ${app.email}`.toLowerCase().includes(needle);
    return statusOk && searchOk;
  });
}

const LANE_META: Record<Lane, { label: string; icon: React.ComponentType<{ className?: string }>; accent: string }> = {
  students: { label: 'Students', icon: GraduationCap, accent: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  technicians: { label: 'Technicians', icon: Wrench, accent: 'text-blue-700 bg-blue-50 border-blue-200' },
  professionals: { label: 'Trainers, lecturers & contractors', icon: UserRoundCog, accent: 'text-violet-700 bg-violet-50 border-violet-200' },
  suppliers: { label: 'Suppliers', icon: Building2, accent: 'text-amber-700 bg-amber-50 border-amber-200' },
};

const STATUS_BADGE: Record<ApplicationStatus, string> = {
  submitted: 'bg-amber-50 text-amber-800 border-amber-200',
  'under-review': 'bg-blue-50 text-blue-800 border-blue-200',
  approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-800 border-rose-200',
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${STATUS_BADGE[status]}`}
    >
      {status.replace('-', ' ')}
    </span>
  );
}

function EmailUnconfirmedBadge() {
  return (
    <span
      title="This applicant has not clicked the link in their confirmation email yet. They cannot be approved until they do."
      className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800"
    >
      <MailWarning className="h-3 w-3" />
      Email not confirmed
    </span>
  );
}

function RejectModal({
  title,
  onConfirm,
  onCancel,
}: {
  title: string;
  onConfirm: (notes: RejectionNotes) => void;
  onCancel: () => void;
}) {
  const [applicantMessage, setApplicantMessage] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const textareaClass =
    'rounded-lg mt-2 w-full border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
        <h3 className="text-base font-semibold text-gray-900">Reject: {title}</h3>
        <label className="mt-4 block text-sm font-semibold text-gray-800">
          Message to the applicant
          <span className="ml-1 font-normal text-gray-500">(emailed to them)</span>
          <textarea
            value={applicantMessage}
            onChange={(e) => setApplicantMessage(e.target.value)}
            rows={3}
            placeholder="Explain what was missing or why this was not approved..."
            className={textareaClass}
          />
        </label>
        <label className="mt-4 block text-sm font-semibold text-gray-800">
          Internal note
          <span className="ml-1 font-normal text-gray-500">(admins only, never emailed)</span>
          <textarea
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            rows={2}
            placeholder="Optional"
            className={textareaClass}
          />
        </label>
        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() =>
              applicantMessage.trim() &&
              onConfirm({ applicantMessage: applicantMessage.trim(), internalNotes: internalNotes.trim() || undefined })
            }
            disabled={!applicantMessage.trim()}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm rejection
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ApplicationsAdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [active, setActive] = useState<Lane>('students');
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [registryMatch, setRegistryMatch] = useState<{ id: string; match: RegistryMatch } | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [search, setSearch] = useState('');
  const [rejectTarget, setRejectTarget] = useState<{
    lane: Lane;
    id: string;
    title: string;
  } | null>(null);

  const studentsResp = useStudentApplications();
  const techsResp = useTechnicianApplications();
  const suppliersResp = useSupplierApplications();
  const professionalsResp = useRegistrationApplications();

  // Only applications whose email is confirmed count as waiting for review.
  const counts = useMemo(() => {
    const ready = (apps: Array<{ status: ApplicationStatus; emailUnconfirmed?: boolean }> | undefined) =>
      (apps ?? []).filter((a) => a.status === 'submitted' && !a.emailUnconfirmed).length;
    return {
      students: ready(studentsResp.data),
      technicians: ready(techsResp.data),
      professionals: ready(professionalsResp.data),
      suppliers: ready(suppliersResp.data),
    };
  }, [studentsResp.data, techsResp.data, professionalsResp.data, suppliersResp.data]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'org_admin') {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        Access restricted. This page is for HEVACRAZ admins only.
      </div>
    );
  }

  const handleApprove = async (lane: Lane, id: string, linkToExisting = false) => {
    setActing(true);
    setActionError(null);
    setRegistryMatch(null);
    try {
      if (lane === 'students') await approveStudentApplication(id);
      else if (lane === 'technicians') await approveTechnicianApplication(id, { linkToExisting });
      else if (lane === 'professionals') await approveRegistrationApplication(id);
      else await approveSupplierApplication(id);
    } catch (err) {
      const match = lane === 'technicians' ? registryMatchFrom(err) : null;
      if (match) setRegistryMatch({ id, match });
      else setActionError(err instanceof Error ? err.message : 'Could not approve this application.');
    } finally {
      setActing(false);
    }
  };

  const handleRejectConfirm = async (notes: RejectionNotes) => {
    if (!rejectTarget) return;
    setActing(true);
    setActionError(null);
    try {
      if (rejectTarget.lane === 'students') await rejectStudentApplication(rejectTarget.id, notes);
      else if (rejectTarget.lane === 'technicians')
        await rejectTechnicianApplication(rejectTarget.id, notes);
      else if (rejectTarget.lane === 'professionals') await rejectRegistrationApplication(rejectTarget.id, notes);
      else await rejectSupplierApplication(rejectTarget.id, notes);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not reject this application.');
    } finally {
      setRejectTarget(null);
      setActing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
            HEVACRAZ admin
          </p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Registration Applications</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
          Review and approve incoming registration applications for every role. Applicants confirm
          their email address first, then wait here. Approved technicians are added to the public
          registry. Applicants are emailed when you approve or reject, so write the rejection
          message for them to read.
        </p>
      </div>

      {registryMatch && (
        <RegistryMatchPrompt
          match={registryMatch.match}
          busy={acting}
          onConfirm={() => handleApprove('technicians', registryMatch.id, true)}
          onCancel={() => setRegistryMatch(null)}
        />
      )}

      {actionError && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {actionError}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200">
        {(Object.keys(LANE_META) as Lane[]).map((lane) => {
          const meta = LANE_META[lane];
          const Icon = meta.icon;
          const isActive = active === lane;
          return (
            <button
              key={lane}
              type="button"
              onClick={() => setActive(lane)}
              className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                isActive
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              {meta.label}
              <span
                className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                  counts[lane] > 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {counts[lane]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
          {STATUS_FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setStatusFilter(option.id)}
              aria-pressed={statusFilter === option.id}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                statusFilter === option.id
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or email"
          aria-label="Search applications by name or email"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-64"
        />
      </div>

      {active === 'students' && (
        <LaneSection
          loading={studentsResp.data === undefined}
          error={studentsResp.error}
          empty="No student applications match."
        >
          {filterApplications(studentsResp.data ?? [], statusFilter, search, (a) => `${a.firstName} ${a.lastName}`).map((app) => (
            <StudentRow
              key={app.id}
              app={app}
              acting={acting}
              onApprove={() => handleApprove('students', app.id)}
              onReject={() =>
                setRejectTarget({
                  lane: 'students',
                  id: app.id,
                  title: `${app.firstName} ${app.lastName}`,
                })
              }
            />
          ))}
        </LaneSection>
      )}

      {active === 'technicians' && (
        <LaneSection
          loading={techsResp.data === undefined}
          error={techsResp.error}
          empty="No technician applications match."
        >
          {filterApplications(techsResp.data ?? [], statusFilter, search, (a) => a.name).map((app) => (
            <TechnicianRow
              key={app.id}
              app={app}
              acting={acting}
              onApprove={() => handleApprove('technicians', app.id)}
              onReject={() =>
                setRejectTarget({ lane: 'technicians', id: app.id, title: app.name })
              }
            />
          ))}
        </LaneSection>
      )}

      {active === 'professionals' && (
        <LaneSection
          loading={professionalsResp.data === undefined}
          error={professionalsResp.error}
          empty="No trainer, lecturer or contractor applications match."
        >
          {filterApplications(professionalsResp.data ?? [], statusFilter, search, (a) => `${a.firstName} ${a.lastName}`).map((app) => (
            <ProfessionalRow
              key={app.id}
              app={app}
              acting={acting}
              onApprove={() => handleApprove('professionals', app.id)}
              onReject={() =>
                setRejectTarget({
                  lane: 'professionals',
                  id: app.id,
                  title: `${app.firstName} ${app.lastName}`,
                })
              }
            />
          ))}
        </LaneSection>
      )}

      {active === 'suppliers' && (
        <LaneSection
          loading={suppliersResp.data === undefined}
          error={suppliersResp.error}
          empty="No supplier applications match."
        >
          {filterApplications(suppliersResp.data ?? [], statusFilter, search, (a) => `${a.companyName} ${a.contactName}`).map((app) => (
            <SupplierRow
              key={app.id}
              app={app}
              acting={acting}
              onApprove={() => handleApprove('suppliers', app.id)}
              onReject={() =>
                setRejectTarget({ lane: 'suppliers', id: app.id, title: app.companyName })
              }
            />
          ))}
        </LaneSection>
      )}

      {rejectTarget && (
        <RejectModal
          title={rejectTarget.title}
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectTarget(null)}
        />
      )}
    </div>
  );
}

function LaneSection({
  loading,
  error,
  empty,
  children,
}: {
  loading: boolean;
  error: unknown;
  empty: string;
  children: React.ReactNode;
}) {
  if (loading) {
    return <div className="p-8 text-sm text-gray-500">Loading...</div>;
  }
  if (error) {
    const message = error instanceof Error ? error.message : 'Failed to load.';
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        {message}
      </div>
    );
  }
  const arr = (children as React.ReactNode[]) ?? [];
  if (Array.isArray(arr) && arr.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
        {empty}
      </div>
    );
  }
  return <div className="space-y-4">{children}</div>;
}

function ActionRow({
  status,
  acting,
  emailUnconfirmed,
  onApprove,
  onReject,
}: {
  status: ApplicationStatus;
  acting: boolean;
  emailUnconfirmed?: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  if (status !== 'submitted' && status !== 'under-review') return null;
  return (
    <div className="flex flex-wrap gap-2 shrink-0">
      <button
        type="button"
        onClick={onApprove}
        disabled={acting || emailUnconfirmed}
        title={emailUnconfirmed ? 'Waiting for the applicant to confirm their email address' : undefined}
        className="inline-flex items-center gap-1.5 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        <CheckCircle2 className="h-4 w-4" />
        Approve
      </button>
      <button
        type="button"
        onClick={onReject}
        disabled={acting}
        className="inline-flex items-center gap-1.5 border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
      >
        <XCircle className="h-4 w-4" />
        Reject
      </button>
    </div>
  );
}

function MetaLine({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
      <Icon className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}

function StudentRow({
  app,
  acting,
  onApprove,
  onReject,
}: {
  app: StudentApplication;
  acting: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-gray-900">
              {app.firstName} {app.lastName}
            </span>
            <StatusBadge status={app.status} />
            {app.emailUnconfirmed && <EmailUnconfirmedBadge />}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <MetaLine icon={Mail}>{app.email}</MetaLine>
            <MetaLine icon={Phone}>{app.phone}</MetaLine>
            <MetaLine icon={GraduationCap}>
              {app.polytech} • {app.fieldOfStudy}
            </MetaLine>
          </div>
          <p className="text-xs text-gray-500">
            Student ID {app.studentIdNumber} • Enrolment year {app.enrolmentYear}
            {app.idDocumentName ? ` • ${app.idDocumentName}` : ''}
          </p>
          <p className="text-[11px] text-gray-400">Submitted {formatDate(app.submittedAt)}</p>
          <ApplicationDocuments entityType="student_application" entityId={app.id} />
          {app.reviewNote && app.status === 'rejected' && (
            <div className="mt-1 border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              <span className="font-semibold">Reason:</span> {app.reviewNote}
            </div>
          )}
        </div>
        <ActionRow status={app.status} acting={acting} emailUnconfirmed={app.emailUnconfirmed} onApprove={onApprove} onReject={onReject} />
      </div>
    </div>
  );
}

function TechnicianRow({
  app,
  acting,
  onApprove,
  onReject,
}: {
  app: TechnicianApplication;
  acting: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-gray-900">{app.name}</span>
            <span className="text-xs font-semibold text-blue-700">{app.specialization}</span>
            <StatusBadge status={app.status} />
            {app.emailUnconfirmed && <EmailUnconfirmedBadge />}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <MetaLine icon={Mail}>{app.email}</MetaLine>
            <MetaLine icon={Phone}>{app.contactNumber}</MetaLine>
            <MetaLine icon={ShieldCheck}>{app.registrationNumber}</MetaLine>
          </div>
          <p className="text-xs text-gray-500">
            {app.province} • {app.district} • {app.employmentStatus}
            {app.employer ? ` @ ${app.employer}` : ''} • {app.yearsExperience} yrs
          </p>
          {app.refrigerantsHandled.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {app.refrigerantsHandled.map((r) => (
                <span
                  key={r}
                  className="inline-flex rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-700"
                >
                  {r}
                </span>
              ))}
            </div>
          )}
          {app.certifications.length > 0 && (
            <p className="text-[11px] text-gray-500">
              {app.certifications.length} certification{app.certifications.length !== 1 ? 's' : ''}{' '}
              attached
            </p>
          )}
          <p className="text-[11px] text-gray-400">Submitted {formatDate(app.submittedAt)}</p>
          <ApplicationDocuments entityType="technician_application" entityId={app.id} />
          {app.reviewNote && app.status === 'rejected' && (
            <div className="mt-1 border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              <span className="font-semibold">Reason:</span> {app.reviewNote}
            </div>
          )}
        </div>
        <ActionRow status={app.status} acting={acting} emailUnconfirmed={app.emailUnconfirmed} onApprove={onApprove} onReject={onReject} />
      </div>
    </div>
  );
}

function SupplierRow({
  app,
  acting,
  onApprove,
  onReject,
}: {
  app: SupplierApplicationRecord;
  acting: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-gray-900">{app.companyName}</span>
            <span className="text-xs font-semibold text-amber-700">{app.supplierType}</span>
            <StatusBadge status={app.status} />
            {app.emailUnconfirmed && <EmailUnconfirmedBadge />}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <MetaLine icon={Mail}>{app.email}</MetaLine>
            <MetaLine icon={Phone}>{app.phone}</MetaLine>
            <MetaLine icon={ClockAlert}>{app.registrationNumber}</MetaLine>
          </div>
          <p className="text-xs text-gray-500">
            {app.province} • {app.city} • Contact: {app.contactName}
          </p>
          {app.refrigerantsSupplied.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {app.refrigerantsSupplied.map((r) => (
                <span
                  key={r}
                  className="inline-flex rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-700"
                >
                  {r}
                </span>
              ))}
            </div>
          )}
          <p className="text-[11px] text-gray-400">Submitted {formatDate(app.submittedAt)}</p>
          <ApplicationDocuments entityType="supplier_application" entityId={app.id} />
          {app.reviewNote && app.status === 'rejected' && (
            <div className="mt-1 border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              <span className="font-semibold">Reason:</span> {app.reviewNote}
            </div>
          )}
        </div>
        <ActionRow status={app.status} acting={acting} emailUnconfirmed={app.emailUnconfirmed} onApprove={onApprove} onReject={onReject} />
      </div>
    </div>
  );
}

function ProfessionalRow({
  app,
  acting,
  onApprove,
  onReject,
}: {
  app: RegistrationApplication;
  acting: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const details = app.details ?? {};
  const services = Array.isArray(details.servicesOffered) ? (details.servicesOffered as string[]) : [];
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-gray-900">
              {app.firstName} {app.lastName}
            </span>
            <span className="text-xs font-semibold text-violet-700">{APPLICANT_ROLES[app.role].label}</span>
            <StatusBadge status={app.status} />
            {app.emailUnconfirmed && <EmailUnconfirmedBadge />}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <MetaLine icon={Mail}>{app.email}</MetaLine>
            <MetaLine icon={Phone}>{app.phone}</MetaLine>
            {app.organisation && <MetaLine icon={Building2}>{app.organisation}</MetaLine>}
          </div>
          <p className="text-xs text-gray-500">{app.region}</p>
          <p className="whitespace-pre-line text-sm leading-6 text-gray-700">{app.experienceSummary}</p>
          {app.role === 'contractor' && (
            <p className="text-xs text-gray-500">
              {String(details.tradeSpecialization ?? '')} • {String(details.yearsInOperation ?? '')} • Team {String(details.teamSize ?? '')} • Safety certification: {String(details.hasSafetyCertification ?? '')}
              {services.length > 0 ? ` • Services: ${services.join(', ')}` : ''}
            </p>
          )}
          <p className="text-[11px] text-gray-400">Submitted {formatDate(app.submittedAt)}</p>
          <ApplicationDocuments entityType="registration_application" entityId={app.id} />
          {app.reviewNote && app.status === 'rejected' && (
            <div className="mt-1 border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              <span className="font-semibold">Reason:</span> {app.reviewNote}
            </div>
          )}
        </div>
        <ActionRow status={app.status} acting={acting} emailUnconfirmed={app.emailUnconfirmed} onApprove={onApprove} onReject={onReject} />
      </div>
    </div>
  );
}
