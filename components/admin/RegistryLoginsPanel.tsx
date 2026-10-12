'use client';

import { useState } from 'react';
import useSWR from 'swr';

interface Summary {
  total: number;
  waiting: number;
  emailedAwaiting: number;
  hasAccount: number;
  noEmail: number;
  undeliverable: number;
}

interface SendResult {
  sent: number;
  failed: Array<{ name: string; reason: string }>;
  stoppedForQuota: boolean;
  remaining: number;
}

const fetcher = async (url: string): Promise<Summary> => {
  const response = await fetch(url, { credentials: 'same-origin' });
  if (!response.ok) throw new Error('Could not load the login summary.');
  return response.json();
};

/** For administrators: how many imported registry technicians cannot sign in yet, and a button to email them a link. */
export function RegistryLoginsPanel() {
  const { data, error, mutate } = useSWR<Summary>('/api/admin/technicians/activation-invites', fetcher);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [problem, setProblem] = useState('');

  const send = async () => {
    setSending(true);
    setProblem('');
    try {
      const response = await fetch('/api/admin/technicians/activation-invites', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const body = await response.json().catch(() => ({})) as Partial<SendResult> & { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Could not send the activation links.');
      setResult({ sent: body.sent ?? 0, failed: body.failed ?? [], stoppedForQuota: body.stoppedForQuota ?? false, remaining: body.remaining ?? 0 });
      await mutate();
    } catch (cause) {
      setProblem(cause instanceof Error ? cause.message : 'Could not send the activation links.');
    } finally {
      setSending(false);
    }
  };

  if (error) return <p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error.message}</p>;
  if (!data) return null;
  if (data.waiting === 0 && data.emailedAwaiting === 0 && data.noEmail === 0 && !result) return null;

  return (
    <section aria-label="Technician logins" className="border border-amber-200 bg-amber-50 p-4">
      <h2 className="text-sm font-bold text-amber-950">Technicians who cannot sign in yet</h2>
      <p className="mt-1 text-sm leading-6 text-amber-900">
        {data.waiting.toLocaleString()} registry technician{data.waiting === 1 ? ' needs' : 's need'} an activation link: they have an email address and no login, and have not been emailed in the last 7 days (or the last email failed). Links last 14 days, and technicians can also request one themselves from the login page.
      </p>
      <ul className="mt-2 text-xs leading-5 text-amber-900">
        <li>{data.hasAccount.toLocaleString()} of {data.total.toLocaleString()} can already sign in.</li>
        {data.emailedAwaiting > 0 && <li>{data.emailedAwaiting.toLocaleString()} were emailed a link in the last 7 days and have not used it yet. They are not emailed again.</li>}
        {data.noEmail > 0 && <li>{data.noEmail.toLocaleString()} have no email on their record. Add one on their profile, then send a link.</li>}
        {data.undeliverable > 0 && <li>{data.undeliverable.toLocaleString()} have a placeholder email that cannot receive mail.</li>}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={send}
          disabled={sending || data.waiting === 0}
          className="min-h-11 bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {sending ? 'Sending…' : `Send activation links (up to 40 at a time)`}
        </button>
        {result && (
          <span role="status" className="text-sm text-amber-950">
            Sent {result.sent}.{result.stoppedForQuota ? ' Stopped because the email provider\'s daily limit was reached. Try again tomorrow, or raise the limit in the Resend account.' : result.remaining > 0 ? ` ${result.remaining} still waiting. Click again to send the next batch.` : ' All done.'}
          </span>
        )}
      </div>
      {result && result.failed.length > 0 && (
        <p className="mt-2 text-xs text-red-800">Not sent: {result.failed.map((f) => `${f.name} (${f.reason})`).join('; ')}</p>
      )}
      {problem && <p role="alert" className="mt-2 text-sm text-red-800">{problem}</p>}
    </section>
  );
}
