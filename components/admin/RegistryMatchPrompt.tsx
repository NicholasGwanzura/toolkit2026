'use client';

import { ApiError } from '@/lib/api';

export interface RegistryMatch {
  message: string;
  registrationNumber: string;
  name: string;
}

/** Reads a "this person is already on the registry" refusal from an approval, or null for any other error. */
export function registryMatchFrom(error: unknown): RegistryMatch | null {
  if (!(error instanceof ApiError) || error.code !== 'registry-match') return null;
  const existing = error.data?.existing as { registrationNumber?: string; name?: string } | undefined;
  return { message: error.message, registrationNumber: existing?.registrationNumber ?? 'an existing record', name: existing?.name ?? 'This person' };
}

/** Asks the administrator to link an application to the registry record that already exists for the same person. */
export function RegistryMatchPrompt({ match, busy, onConfirm, onCancel }: { match: RegistryMatch; busy: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div role="alertdialog" aria-label="Already on the registry" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="font-semibold">{match.name} is already on the registry ({match.registrationNumber}).</p>
      <p className="mt-1 leading-6">
        The email on this application matches that record. Approving will link the application to it, create their login with the password they chose, and add a membership if they have none.
        No second registry record is created, and their registration number stays {match.registrationNumber}.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onConfirm} disabled={busy} className="min-h-11 bg-gray-900 px-4 py-2 font-semibold text-white hover:bg-gray-800 disabled:opacity-50">
          {busy ? 'Approving…' : 'Approve and link to that record'}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className="min-h-11 border border-amber-400 bg-white px-4 py-2 font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-50">
          Cancel
        </button>
      </div>
    </div>
  );
}
