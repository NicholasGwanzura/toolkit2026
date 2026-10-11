'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { ArrowLeft, Hash, Mail } from 'lucide-react';

const inputClass = 'block w-full rounded-lg border border-[#E7E5E4] bg-white px-3 py-2.5 text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:border-[#D97706] focus:outline-none focus:ring-2 focus:ring-[#D97706]/20';

export default function ActivateAccountPage() {
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/auth/activate-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationNumber, email }),
      });
      const data = await response.json().catch(() => ({})) as { message?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Unable to process the request. Try again later.');
      setMessage(data.message ?? 'If those details match the registry, an activation link is on its way.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to process the request. Try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-white p-4">
      <section className="w-full max-w-md rounded-lg border border-[#E7E5E4] p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-[#1C1917]">Activate your account</h1>
        <p className="mt-2 text-sm leading-6 text-[#78716C]">
          Already on the HEVACRAZ technician registry but never signed in? Enter your registration number and the email address on your registry record. We will send a link to that address so you can choose a password.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="activate-reg" className="block text-xs font-semibold uppercase tracking-wide text-[#78716C]">Registration number</label>
            <div className="relative mt-1.5">
              <Hash aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A8A29E]" />
              <input id="activate-reg" type="text" required maxLength={40} autoComplete="off" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} className={`${inputClass} pl-9`} placeholder="As shown on your registry certificate" />
            </div>
          </div>
          <div>
            <label htmlFor="activate-email" className="block text-xs font-semibold uppercase tracking-wide text-[#78716C]">Email on your registry record</label>
            <div className="relative mt-1.5">
              <Mail aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A8A29E]" />
              <input id="activate-email" type="email" required maxLength={254} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputClass} pl-9`} placeholder="name@example.com" />
            </div>
          </div>
          {message && <p role="status" className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>}
          {error && <p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={submitting} className="w-full rounded bg-[#D97706] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#b45309] disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? 'Sending…' : 'Send activation link'}
          </button>
        </form>
        <p className="mt-5 text-xs leading-5 text-[#78716C]">
          Nothing arrived, or your email has changed? Contact HEVACRAZ and quote your registration number so an administrator can update your record.
        </p>
        <Link href="/login" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#78716C] hover:text-[#1C1917]">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
      </section>
    </main>
  );
}
