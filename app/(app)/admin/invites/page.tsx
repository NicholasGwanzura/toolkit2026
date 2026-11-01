'use client';

import { useState } from 'react';
import { UserPlus, Copy, Check, X, Clock, Mail, AlertCircle, RotateCcw } from 'lucide-react';
import { useInvites, createInvite, revokeInvite, resendSupplierInvite } from '@/lib/api';
import type { InviteStatus } from '@/types/index';

const ROLES = [
  { value: 'trainer', label: 'Trainer' },
  { value: 'lecturer', label: 'Lecturer' },
  { value: 'student', label: 'Student' },
  { value: 'org_admin', label: 'Org Admin' },
];

const STATUS_STYLES: Record<InviteStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  revoked: 'bg-gray-100 text-gray-500 border-gray-200',
  expired: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function AdminInvitesPage() {
  const { data, isLoading } = useInvites();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('lecturer');
  const [region, setRegion] = useState('Harare');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [lastEmailSent, setLastEmailSent] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const invites = data?.data ?? [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    setLastInviteUrl(null);
    try {
      const result = await createInvite({ email: email.trim(), role, region: region.trim() });
      setLastInviteUrl(result.inviteUrl);
      setLastEmailSent(result.emailSent);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invite');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeInvite(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke invite');
    }
  };

  const handleResendSupplierInvite = async (id: string) => {
    setError(null);
    try {
      const result = await resendSupplierInvite(id);
      setLastInviteUrl(result.inviteUrl);
      setLastEmailSent(result.emailSent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend supplier invite');
    }
  };

  const copyLink = (id: string, url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 2000);
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Invites</h1>
        <p className="mt-1 text-gray-500">
          Invite a new user by email and role. An email with the invite link is sent
          automatically — the link is also shown below in case you need to share it directly.
        </p>
      </div>

      <form onSubmit={handleCreate} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-300 focus:bg-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-300 focus:bg-white"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Region</label>
            <input
              type="text"
              required
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-300 focus:bg-white"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg flex items-center gap-2 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {lastInviteUrl && (
          <div className="mt-4 border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-800">
              Invite created. {lastEmailSent ? 'Email sent.' : 'Email could not be sent — share this link manually:'}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 truncate border border-emerald-200 bg-white px-3 py-2 text-xs text-gray-700">
                {lastInviteUrl}
              </code>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(lastInviteUrl)}
                className="rounded-lg inline-flex items-center gap-1.5 bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                <Copy className="h-3.5 w-3.5" /> Copy
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 bg-[#B45309] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            {submitting ? 'Creating…' : 'Create invite'}
          </button>
        </div>
      </form>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">All invites</h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
        ) : invites.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No invites yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {invites.map((invite) => {
              const url = invite.token && typeof window !== 'undefined'
                ? `${window.location.origin}/accept-invite?token=${invite.token}`
                : '';
              return (
                <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 shrink-0 text-gray-400" />
                      <p className="truncate text-sm font-semibold text-gray-900">{invite.email}</p>
                      <span className={`shrink-0 border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[invite.status]}`}>
                        {invite.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {invite.role} · {invite.region} · invited by {invite.invitedBy}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400">
                      <Clock className="h-3 w-3" />
                      Expires {new Date(invite.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {invite.status === 'pending' && (
                      <>
                        {invite.role === 'vendor' && (
                          <button
                            onClick={() => handleResendSupplierInvite(invite.id)}
                            className="inline-flex items-center gap-1.5 border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-50"
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Resend
                          </button>
                        )}
                        <button
                          disabled={!url}
                          onClick={() => copyLink(invite.id, url)}
                          className="inline-flex items-center gap-1.5 border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          {copiedId === invite.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          {copiedId === invite.id ? 'Copied' : 'Copy link'}
                        </button>
                        <button
                          onClick={() => handleRevoke(invite.id)}
                          className="inline-flex items-center gap-1.5 border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                        >
                          <X className="h-3.5 w-3.5" /> Revoke
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
