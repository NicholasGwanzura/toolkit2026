'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Page error', error.digest ?? '', error.message);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
      <p className="text-sm leading-6 text-gray-600">
        The page could not be shown. Your information has not been lost. Try again, and if it keeps happening contact HEVACRAZ and quote the code below.
      </p>
      {error.digest && <p className="rounded border border-gray-200 bg-gray-50 px-3 py-1 font-mono text-xs text-gray-600">Reference: {error.digest}</p>}
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="min-h-11 bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800">Try again</button>
        <Link href="/dashboard" className="inline-flex min-h-11 items-center border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50">Go to dashboard</Link>
      </div>
    </main>
  );
}
