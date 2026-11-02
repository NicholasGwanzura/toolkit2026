import React, { useState } from 'react';
import { UserSession, useAuth } from '@/lib/auth';
import { ZIMBABWE_PROVINCES } from '@/constants/registry';
import { X, UserCircle, Mail, MapPin, ShieldCheck, KeyRound, Save, LogOut, Pencil } from 'lucide-react';

interface UserProfileModalProps {
  user: UserSession | null;
  onClose: () => void;
  onLogout: () => void;
}

export function UserProfileModal({ user, onClose, onLogout }: UserProfileModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [region, setRegion] = useState(user?.region ?? '');
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileBusy(true);
    setProfileMessage(null);
    try {
      const res = await fetch('/api/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, region }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({})) as { error?: string; user?: UserSession };
      if (!res.ok || !data.user) {
        setProfileMessage({ kind: 'error', text: data.error ?? 'Your profile was not saved.' });
        return;
      }
      updateUser(data.user);
      setEditing(false);
      setProfileMessage({ kind: 'ok', text: 'Profile updated.' });
    } catch {
      setProfileMessage({ kind: 'error', text: 'Network error. Please try again.' });
    } finally {
      setProfileBusy(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessageType('error');
      setMessage('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setMessageType('error');
      setMessage('New password must be at least 8 characters.');
      return;
    }
    setIsSubmitting(true);
    setMessage('');
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) {
        setMessageType('error');
        setMessage(data.error ?? 'Password reset failed.');
        return;
      }
      setMessageType('success');
      setMessage('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setMessageType('error');
      setMessage('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-lg bg-white border border-[#E7E5E4] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between bg-[#1C1917] px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Profile Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
            <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded-full border-2 border-gray-200">
              <UserCircle className="w-10 h-10 text-gray-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{user.name}</p>
              <p className="text-sm font-medium text-gray-500 capitalize">{user.role.replace('_', ' ')}</p>
            </div>
          </div>

          {editing ? (
            <form onSubmit={saveProfile} className="mb-8 space-y-4 rounded-md border border-gray-200 bg-gray-50 p-4">
              <h3 className="text-sm font-bold text-gray-900">Edit your profile</h3>
              <label className="block text-xs font-semibold uppercase text-gray-500">
                Full name
                <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-normal normal-case text-gray-900 outline-none focus:border-[#B45309]" />
              </label>
              <label className="block text-xs font-semibold uppercase text-gray-500">
                Region / Province
                <select value={region} onChange={(e) => setRegion(e.target.value)} required className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-normal normal-case text-gray-900 outline-none focus:border-[#B45309]">
                  <option value="">Choose your province</option>
                  {ZIMBABWE_PROVINCES.map((province) => <option key={province.id} value={province.name}>{province.name}</option>)}
                </select>
              </label>
              <p className="text-xs text-gray-500">To change your email address or role, contact HEVACRAZ.</p>
              {profileMessage?.kind === 'error' && <p role="alert" className="text-xs font-semibold text-red-600">{profileMessage.text}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setEditing(false); setName(user?.name ?? ''); setRegion(user?.region ?? ''); setProfileMessage(null); }} className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800">Cancel</button>
                <button type="submit" disabled={profileBusy} className="min-h-11 rounded-lg bg-[#B45309] px-4 text-sm font-semibold text-white hover:bg-[#92400E] disabled:opacity-60">{profileBusy ? 'Saving…' : 'Save profile'}</button>
              </div>
            </form>
          ) : (
          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center bg-blue-50 rounded text-blue-600">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Email Address</p>
                <p className="text-sm font-medium text-gray-900">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center bg-amber-50 rounded text-amber-600">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Region / Province</p>
                <p className="text-sm font-medium text-gray-900">{user.region || 'Not specified'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center bg-emerald-50 rounded text-emerald-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Account Status</p>
                <p className="text-sm font-medium text-emerald-700">Active & Verified</p>
              </div>
            </div>
            {profileMessage?.kind === 'ok' && <p role="status" className="text-xs font-semibold text-green-600">{profileMessage.text}</p>}
            <button type="button" onClick={() => { setEditing(true); setProfileMessage(null); }} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50">
              <Pencil className="h-4 w-4" aria-hidden="true" /> Edit profile
            </button>
          </div>
          )}

          <form onSubmit={handlePasswordReset} className="space-y-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-gray-500" />
              Reset Password
            </h3>
            {message && (
              <p className={`text-xs font-semibold ${messageType === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {message}
              </p>
            )}
            <input
              type="password"
              placeholder="Current Password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              required
            />
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              required
            />
            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              required
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 bg-gray-900 text-white px-4 py-2 text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Updating…' : 'Update Password'}
            </button>
          </form>

          <div className="mt-8 flex items-center justify-end border-t border-gray-100 pt-6">
            <button
              onClick={onLogout}
              className="px-6 py-2 bg-red-50 text-red-600 hover:bg-red-100 font-semibold text-sm transition-colors border border-red-200"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
