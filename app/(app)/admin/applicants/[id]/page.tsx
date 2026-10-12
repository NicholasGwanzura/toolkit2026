'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  MapPin,
  Award,
  FileWarning,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTechnicianApplications, useMemberships, approveTechnicianApplication, rejectTechnicianApplication } from '@/lib/api';
import { RegistryMatchPrompt, registryMatchFrom, type RegistryMatch } from '@/components/admin/RegistryMatchPrompt';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/Toast';
import { AuditTrail } from '@/components/admin/AuditTrail';
import type { ApplicationStatus } from '@/types/index';

const TABS = [
  'overview',
  'personal',
  'contact',
  'survey',
  'skills',
  'documents',
  'membership',
  'audit',
] as const;
type Tab = typeof TABS[number];

const TAB_LABELS: Record<Tab, string> = {
  overview: 'Overview',
  personal: 'Personal Information',
  contact: 'Contact & Location',
  survey: 'Survey Questions & Answers',
  skills: 'Skills & Specializations',
  documents: 'Uploaded Documents',
  membership: 'Membership Information',
  audit: 'Audit Trail',
};

const STATUS_BADGE: Record<ApplicationStatus, string> = {
  submitted: 'bg-amber-50 text-amber-800 border-amber-200',
  'under-review': 'bg-blue-50 text-blue-800 border-blue-200',
  approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-800 border-rose-200',
};

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-sm text-gray-900">{value || value === 0 ? String(value) : '—'}</p>
    </div>
  );
}

function surveyLabel(key: string) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^\w/, (c) => c.toUpperCase());
}

export default function ApplicantDrilldownPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { success, error: toastError } = useToast();
  const { data: applications } = useTechnicianApplications();
  const { data: memberships } = useMemberships();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [acting, setActing] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [registryMatch, setRegistryMatch] = useState<RegistryMatch | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectInternalNotes, setRejectInternalNotes] = useState('');
  const [rejectApplicantMessage, setRejectApplicantMessage] = useState('');

  const app = useMemo(() => applications?.find((a) => a.id === params.id), [applications, params.id]);
  const membership = useMemo(
    () => memberships?.find((m) => m.applicationId === params.id || m.technicianId === app?.approvedTechnicianId),
    [memberships, params.id, app?.approvedTechnicianId],
  );

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

  if (!applications) {
    return <div className="p-8 text-center text-sm text-gray-500">Loading…</div>;
  }

  if (!app) {
    return (
      <div className="space-y-4">
        <Link href="/admin/applicants" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> Back to applicants
        </Link>
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">Applicant not found.</div>
      </div>
    );
  }

  const canReview = app.status === 'submitted' || app.status === 'under-review';

  const handleApprove = async (linkToExisting = false) => {
    setActing(true);
    try {
      await approveTechnicianApplication(app.id, { linkToExisting });
      success(linkToExisting ? 'Application approved and linked to the existing registry record.' : 'Application approved and membership created.');
      setShowApprove(false);
      setRegistryMatch(null);
    } catch (err) {
      const match = registryMatchFrom(err);
      if (match) {
        setShowApprove(false);
        setRegistryMatch(match);
      } else {
        toastError(err instanceof Error ? err.message : 'Failed to approve application.');
      }
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    setActing(true);
    try {
      await rejectTechnicianApplication(app.id, {
        reason: rejectReason,
        internalNotes: rejectInternalNotes || undefined,
        applicantMessage: rejectApplicantMessage || undefined,
      });
      success('Application rejected.');
      setShowReject(false);
      setRejectReason('');
      setRejectInternalNotes('');
      setRejectApplicantMessage('');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to reject application.');
    } finally {
      setActing(false);
    }
  };

  const surveyEntries = app.surveyData ? Object.entries(app.surveyData).filter(([, v]) => v !== undefined && v !== null && v !== '') : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button onClick={() => router.push('/admin/applicants')} className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" /> Back to applicants
          </button>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{app.name}</h1>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${STATUS_BADGE[app.status]}`}>
              {app.status.replace('-', ' ')}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">{app.specialization} · {app.province} · Submitted {formatDate(app.submittedAt)}</p>
        </div>

        {canReview && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowApprove(true)}
              disabled={acting}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" /> Approve Application
            </button>
            <button
              onClick={() => setShowReject(true)}
              disabled={acting}
              className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-5 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
            >
              <XCircle className="h-4 w-4" /> Reject Application
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === tab ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Full name" value={app.name} />
            <Field label="Specialization" value={app.specialization} />
            <Field label="Registration number" value={app.registrationNumber} />
            <Field label="Employment status" value={app.employmentStatus} />
            <Field label="Years of experience" value={app.yearsExperience} />
            <Field label="Certifications attached" value={app.certifications.length} />
            <Field label="Reviewed by" value={app.reviewedBy} />
            <Field label="Reviewed at" value={formatDate(app.reviewedAt)} />
            {app.reviewNote && (
              <div className="sm:col-span-2 lg:col-span-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Internal review note</p>
                <div className="mt-1 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{app.reviewNote}</div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'personal' && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Full name" value={app.name} />
            <Field label="National ID" value={app.nationalId} />
            <Field label="Gender" value={app.surveyData?.gender} />
            <Field label="Age group" value={app.surveyData?.ageGroup} />
            <Field label="Education level" value={app.surveyData?.educationLevel} />
            <Field label="Preferred language" value={app.surveyData?.preferredLanguage} />
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-start gap-2"><Mail className="mt-0.5 h-4 w-4 text-gray-400" /><Field label="Email" value={app.email} /></div>
            <div className="flex items-start gap-2"><Phone className="mt-0.5 h-4 w-4 text-gray-400" /><Field label="Phone" value={app.contactNumber} /></div>
            <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-gray-400" /><Field label="Province" value={app.province} /></div>
            <Field label="District" value={app.district} />
            <Field label="Region" value={app.region} />
            <Field label="Employer" value={app.employer} />
          </div>
        )}

        {activeTab === 'survey' && (
          surveyEntries.length === 0 ? (
            <p className="text-sm text-gray-500">This applicant did not answer the optional sector survey.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {surveyEntries.map(([key, value]) => (
                <Field key={key} label={surveyLabel(key)} value={String(value)} />
              ))}
            </div>
          )
        )}

        {activeTab === 'skills' && (
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Specialization</p>
              <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">{app.specialization}</span>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Refrigerants handled</p>
              {app.refrigerantsHandled.length === 0 ? (
                <p className="text-sm text-gray-500">None specified.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {app.refrigerantsHandled.map((r) => (
                    <span key={r} className="rounded border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700">{r}</span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Certifications ({app.certifications.length})</p>
              {app.certifications.length === 0 ? (
                <p className="text-sm text-gray-500">None attached.</p>
              ) : (
                <div className="space-y-2">
                  {app.certifications.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                      <Award className="h-4 w-4 text-amber-600" />
                      <span className="font-semibold text-gray-900">{c.name}</span>
                      <span className="text-gray-500">· {c.issuingBody}</span>
                      {c.certificateNumber && <span className="text-gray-400">· #{c.certificateNumber}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
            <FileWarning className="mx-auto mb-2 h-6 w-6 text-gray-300" />
            <p className="text-sm text-gray-500">
              No documents attached. File upload is not yet supported in the application form.
            </p>
          </div>
        )}

        {activeTab === 'membership' && (
          membership ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Membership number" value={membership.membershipNumber} />
              <Field label="Type" value={membership.membershipType} />
              <Field label="Status" value={membership.status} />
              <Field label="Province" value={membership.province} />
              <Field label="Start date" value={membership.startDate} />
              <Field label="Expiry date" value={membership.expiryDate} />
              <Field label="Approved by" value={membership.approvedBy} />
              <Field label="Approved at" value={formatDate(membership.approvedAt)} />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
              <UserIcon className="mx-auto mb-2 h-6 w-6 text-gray-300" />
              <p className="text-sm text-gray-500">
                {app.status === 'approved' ? 'No membership record found for this application.' : 'A membership is created automatically when this application is approved.'}
              </p>
            </div>
          )
        )}

        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Application history</p>
              <AuditTrail entityType="technician_application" entityId={app.id} />
            </div>
            {membership && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Membership history</p>
                <AuditTrail entityType="membership" entityId={membership.id} />
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        open={showApprove}
        title="Approve application"
        description={`Approve ${app.name}'s application? This creates their technician registry record and an active HEVACRAZ membership (valid through 31 December ${new Date().getFullYear()}).`}
        confirmLabel={acting ? 'Approving…' : 'Approve'}
        variant="default"
        onConfirm={() => handleApprove(false)}
        onCancel={() => setShowApprove(false)}
      />

      {registryMatch && (
        <RegistryMatchPrompt match={registryMatch} busy={acting} onConfirm={() => handleApprove(true)} onCancel={() => setRegistryMatch(null)} />
      )}

      {showReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">Reject: {app.name}</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Rejection reason (internal)</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={2}
                  placeholder="Why is this application being rejected?"
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Internal admin notes (optional)</label>
                <textarea
                  value={rejectInternalNotes}
                  onChange={(e) => setRejectInternalNotes(e.target.value)}
                  rows={2}
                  placeholder="Notes for other admins — never sent to the applicant"
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Message to applicant (optional)</label>
                <textarea
                  value={rejectApplicantMessage}
                  onChange={(e) => setRejectApplicantMessage(e.target.value)}
                  rows={2}
                  placeholder="Only this text is ever included in the rejection email"
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowReject(false)}
                disabled={acting}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={!rejectReason.trim() || acting}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                {acting ? 'Rejecting…' : 'Confirm rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
