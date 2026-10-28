'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Search, ShieldCheck, AlertCircle, Users2, UserPlus, KeyRound, X, UserX, UserCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useAdminUsers, updateAdminUser, requestAdminPasswordReset, bulkUpdateAdminUsers } from '@/lib/api';
import type { AdminUserRecord } from '@/types/index';

const PAGE_SIZE = 25;

const ROLES = [
  { value: 'technician', label: 'Technician' },
  { value: 'trainer', label: 'Trainer' },
  { value: 'lecturer', label: 'Lecturer' },
  { value: 'student', label: 'Student' },
];

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'pending', label: 'Pending' },
];

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  inactive: 'bg-gray-100 text-gray-500 border-gray-200',
  suspended: 'bg-rose-50 text-rose-700 border-rose-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
};

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function UserRow({
  user,
  isSelf,
  selected,
  onToggle,
}: {
  user: AdminUserRecord;
  isSelf: boolean;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  const [savingField, setSavingField] = useState<'role' | 'status' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetNotice, setResetNotice] = useState<string | null>(null);
  const [savingReset, setSavingReset] = useState(false);

  const selectable = !isSelf && user.role !== 'org_admin';

  const handleRoleChange = async (role: string) => {
    setError(null);
    setSavingField('role');
    try {
      await updateAdminUser(user.id, { role });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setSavingField(null);
    }
  };

  const handleStatusChange = async (status: string) => {
    setError(null);
    setSavingField('status');
    try {
      await updateAdminUser(user.id, { status: status as AdminUserRecord['status'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setSavingField(null);
    }
  };

  const handlePasswordReset = async () => {
    setResetError(null);
    setResetNotice(null);
    setSavingReset(true);
    try {
      await requestAdminPasswordReset(user.id);
      setResetNotice(`A one-time reset link was sent to ${user.email}.`);
      setResetOpen(false);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setSavingReset(false);
    }
  };

  return (
    <div className="flex gap-3 px-5 py-4">
      <input
        type="checkbox"
        checked={selectable && selected}
        disabled={!selectable}
        onChange={() => onToggle(user.id)}
        aria-label={`Select ${user.name}`}
        className="mt-1 h-4 w-4 shrink-0 accent-[#D97706] disabled:opacity-30"
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-gray-900">{user.name}</p>
              {isSelf && (
                <span className="shrink-0 border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                  You
                </span>
              )}
              {user.role === 'org_admin' && (
                <span className="shrink-0 border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-600">
                  Admin
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-xs text-gray-500">{user.email}</p>
            <p className="mt-0.5 text-[11px] text-gray-400">
              {user.region} · Joined {formatDate(user.createdAt)} ·{' '}
              {user.lastLoginAt ? `Last sign-in ${formatDate(user.lastLoginAt)}` : 'No sign-in yet'}
            </p>
            {error && <p className="mt-1 text-[11px] text-rose-600">{error}</p>}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <select
              value={user.role}
              disabled={savingField === 'role'}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="rounded border border-gray-200 bg-white px-2 py-1.5 text-xs font-semibold text-gray-700 outline-none focus:border-blue-300 disabled:opacity-50"
            >
              {user.role === 'org_admin' && <option value="org_admin">Org Admin</option>}
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>

            <select
              value={user.status}
              disabled={savingField === 'status'}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`border px-2 py-1.5 text-xs font-bold uppercase tracking-wide outline-none disabled:opacity-50 ${STATUS_STYLES[user.status] ?? 'border-gray-200 text-gray-600'}`}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setResetOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              {resetOpen ? <X className="h-3.5 w-3.5" /> : <KeyRound className="h-3.5 w-3.5" />}
              Reset Password
            </button>
          </div>
        </div>

        {resetOpen && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
            <p className="min-w-0 flex-1 text-xs text-amber-900">
              Send a single-use reset link to <strong>{user.email}</strong>. It expires after 30 minutes.
            </p>
            <button
              type="button"
              onClick={() => void handlePasswordReset()}
              disabled={savingReset}
              className="rounded bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
            >
              {savingReset ? 'Sending…' : 'Send reset link'}
            </button>
            {resetError && <p className="w-full text-[11px] text-rose-600">{resetError}</p>}
            {resetNotice && <p className="w-full text-[11px] text-emerald-700">{resetNotice}</p>}
          </div>
        )}
        {resetNotice && !resetOpen && <p className="mt-2 text-[11px] text-emerald-700">{resetNotice}</p>}
      </div>
    </div>
  );
}

const ROLE_FILTERS = [
  { value: '', label: 'All Roles' },
  { value: 'technician', label: 'Technicians' },
  { value: 'trainer', label: 'Trainers' },
  { value: 'lecturer', label: 'Lecturers' },
  { value: 'vendor', label: 'Vendors' },
  { value: 'student', label: 'Students' },
  { value: 'contractor', label: 'Contractors' },
  { value: 'org_admin', label: 'Org Admins' },
];

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState<'active' | 'suspended' | null>(null);
  const [bulkNotice, setBulkNotice] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isValidating } = useAdminUsers({
    q: search || undefined,
    role: roleFilter || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const users = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selectableUsers = users.filter((u) => u.id !== currentUser?.id && u.role !== 'org_admin');
  const allSelected = selectableUsers.length > 0 && selectableUsers.every((u) => selected.has(u.id));

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      if (allSelected) return new Set();
      const next = new Set(prev);
      for (const user of selectableUsers) next.add(user.id);
      return next;
    });
  };

  const changeFilter = (role: string) => {
    setRoleFilter(role);
    setPage(1);
    setSelected(new Set());
  };

  const changePage = (next: number) => {
    setPage(next);
    setSelected(new Set());
  };

  const handleBulk = async (status: 'active' | 'suspended') => {
    setBulkBusy(status);
    setBulkError(null);
    setBulkNotice(null);
    try {
      const result = await bulkUpdateAdminUsers([...selected], status);
      setSelected(new Set());
      const verb = status === 'active' ? 'reactivated' : 'suspended';
      setBulkNotice(
        `${result.updated} account${result.updated === 1 ? '' : 's'} ${verb}` +
          (result.skipped > 0 ? `; ${result.skipped} skipped (your account or an administrator).` : '.'),
      );
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Bulk update failed');
    } finally {
      setBulkBusy(null);
    }
  };

  const firstRow = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRow = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Users</h1>
          <p className="mt-1 text-gray-500">
            Every account on the platform, across every role. Filter by role, page through the list, or
            suspend accounts in bulk. A role or status change takes effect immediately.
          </p>
        </div>
        <Link
          href="/admin/invites"
          className="inline-flex shrink-0 items-center justify-center gap-2 bg-[#D97706] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <UserPlus className="h-4 w-4" />
          Invite users
        </Link>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name or email…"
              className="rounded-lg w-full border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-300 focus:bg-white"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {ROLE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => changeFilter(f.value)}
                className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold transition-colors ${
                  roleFilter === f.value
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#D97706]/30 bg-[#D97706]/5 px-5 py-3">
          <p className="text-sm font-semibold text-gray-900">{selected.size} selected</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleBulk('suspended')}
              disabled={bulkBusy !== null}
              className="inline-flex items-center gap-1.5 rounded border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-50"
            >
              <UserX className="h-3.5 w-3.5" />
              {bulkBusy === 'suspended' ? 'Suspending…' : 'Suspend selected'}
            </button>
            <button
              type="button"
              onClick={() => void handleBulk('active')}
              disabled={bulkBusy !== null}
              className="inline-flex items-center gap-1.5 rounded border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-50"
            >
              <UserCheck className="h-3.5 w-3.5" />
              {bulkBusy === 'active' ? 'Reactivating…' : 'Reactivate selected'}
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              disabled={bulkBusy !== null}
              className="rounded border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {(bulkNotice || bulkError) && (
        <p
          className={`rounded-lg border px-4 py-3 text-sm ${
            bulkError
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {bulkError ?? bulkNotice}
        </p>
      )}

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Users2 className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">
              {isLoading ? 'Loading…' : `${total} account${total === 1 ? '' : 's'}`}
            </h2>
            {isValidating && !isLoading && <span className="text-[11px] text-gray-400">Updating…</span>}
          </div>
          {selectableUsers.length > 0 && (
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="h-4 w-4 accent-[#D97706]"
              />
              Select this page
            </label>
          )}
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            <AlertCircle className="mx-auto mb-2 h-6 w-6 text-gray-300" />
            No users match your search or filter.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {users.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                isSelf={u.id === currentUser?.id}
                selected={selected.has(u.id)}
                onToggle={toggleOne}
              />
            ))}
          </div>
        )}

        {total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
            <span>
              Showing {firstRow}–{lastRow} of {total}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => changePage(page - 1)}
                disabled={page <= 1}
                className="rounded border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40"
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => changePage(page + 1)}
                disabled={page >= totalPages}
                className="rounded border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 border border-gray-200 bg-gray-50 p-4 text-xs text-gray-500">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
        You can&apos;t change your own role away from org_admin or deactivate your own account here —
        that guard prevents accidental lockout. Bulk actions skip your own account and other administrators.
      </div>
    </div>
  );
}
