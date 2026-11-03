"use client";

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../../lib/auth';
import { Lock, Mail, ArrowRight, Building2, PackageSearch } from 'lucide-react';

const inputCls = 'block w-full min-h-11 px-3 py-2.5 rounded-lg bg-white border border-[#E7E5E4] text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#B45309] focus:ring-2 focus:ring-[#B45309]/20 text-sm transition-colors';

type Mode = 'technician' | 'supplier';

function LoginPageContent() {
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [manualMode, setManualMode] = useState<Mode | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isSupplierFlow = searchParams.get('flow') === 'supplier';
  const activeMode: Mode = manualMode ?? (isSupplierFlow ? 'supplier' : 'technician');
  const requestedNextPath = searchParams.get('next');
  const nextPath = (() => {
    const fallback = activeMode === 'supplier' ? '/suppliers' : '/dashboard';
    if (!requestedNextPath || !requestedNextPath.startsWith('/') || requestedNextPath.startsWith('//') || requestedNextPath.includes('\\')) {
      return fallback;
    }
    if (/[\\\u0000-\u001f]/.test(requestedNextPath)) return fallback;
    return requestedNextPath;
  })();

  const redirectAfterLogin = () => {
    // Hard navigation to avoid any stale client bundle / SWR cache.
    window.location.assign(nextPath);
  };

  const handleNormalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!email) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address';
    if (!password) errors.password = 'Password is required';
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setFieldErrors({});
    setIsLoading(true);
    try {
      await login(email, password);
      redirectAfterLogin();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed.';
      setFieldErrors({ form: message });
      setIsLoading(false);
    }
  };

  const modes: { id: Mode; label: string }[] = [
    { id: 'technician', label: 'Sign in as a Technician' },
    { id: 'supplier', label: 'Sign in as a Supplier' },
  ];

  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-2">
      {/* Hero */}
      <div className="relative h-56 overflow-hidden sm:h-72 lg:sticky lg:top-0 lg:h-screen">
        <Image
          src="/images/hero/zimbabwe-hvac-rooftop.webp"
          alt="A technician servicing rooftop air-conditioning units in Harare"
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f5b66b]">National Ozone Unit platform</p>
          <p className="mt-2 max-w-md text-lg font-semibold leading-snug text-white sm:text-2xl">
            Operated by the National Ozone Unit. Supported by HEVACRAZ.
          </p>
        </div>
      </div>

      {/* Sign in */}
      <div className="flex items-center justify-center p-4 py-10 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex items-center gap-2.5" aria-label="HEVACRAZ and Ministry of Environment">
              <Image
                src="/logos/ministry-of-environment.jpeg"
                alt="Ministry of Environment, Climate and Wildlife"
                width={56}
                height={56}
                className="h-14 w-14 rounded-full object-cover"
              />
              <span className="h-9 w-px bg-[#D6D3D1]" aria-hidden="true" />
              <Image
                src="/logos/hevacraz-logo.jpeg"
                alt="HEVACRAZ"
                width={56}
                height={56}
                className="h-14 w-14 rounded-full object-cover"
              />
            </div>
            <p className="text-sm font-semibold text-[#57534E]">Zimbabwe&rsquo;s Digital <span className="whitespace-nowrap">HVAC-R</span> Registration System</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#1C1917]">Sign In</h1>
          </div>

          <div className="rounded-xl border border-[#E7E5E4] bg-white shadow-sm">
            <div className="grid grid-cols-2 gap-1 border-b border-[#E7E5E4] p-1.5" role="tablist" aria-label="Who is signing in">
              {modes.map(mode => (
                <button
                  key={mode.id}
                  type="button"
                  role="tab"
                  aria-selected={activeMode === mode.id}
                  onClick={() => { setManualMode(mode.id); setFieldErrors({}); }}
                  className={`min-h-11 rounded-lg px-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309] ${
                    activeMode === mode.id ? 'bg-[#1C1917] text-white' : 'text-[#57534E] hover:bg-[#FAFAF9] hover:text-[#1C1917]'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <div className="space-y-5 p-6">
              {fieldErrors.form && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  {fieldErrors.form}
                </div>
              )}

              <form onSubmit={handleNormalLogin} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wide text-[#78716C]">
                    {activeMode === 'supplier' ? 'Company Email' : 'Work Email'}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A8A29E]" aria-hidden="true" />
                    <input
                      id="email" type="email" autoComplete="email" required value={email}
                      onChange={e => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: '' })); }}
                      placeholder="name@company.com"
                      className={`${inputCls} pl-9 ${fieldErrors.email ? 'border-red-400' : ''}`}
                    />
                  </div>
                  {fieldErrors.email && <p className="text-xs text-red-600">{fieldErrors.email}</p>}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wide text-[#78716C]">Password</label>
                    <Link href="/forgot-password" className="text-xs font-medium text-[#B45309] hover:text-[#92400E]">Forgot?</Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A8A29E]" aria-hidden="true" />
                    <input
                      id="password" type="password" autoComplete="current-password" required value={password}
                      onChange={e => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: '' })); }}
                      placeholder="••••••••"
                      className={`${inputCls} pl-9 ${fieldErrors.password ? 'border-red-400' : ''}`}
                    />
                  </div>
                  {fieldErrors.password && <p className="text-xs text-red-600">{fieldErrors.password}</p>}
                </div>

                <button
                  type="submit" disabled={isLoading}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#B45309] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#92400E] disabled:opacity-50"
                >
                  {isLoading
                    ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    : <><span>{activeMode === 'supplier' ? 'Sign in as a Supplier' : 'Sign in as a Technician'}</span><ArrowRight className="h-4 w-4" aria-hidden="true" /></>
                  }
                </button>
              </form>

              {activeMode === 'technician' ? (
                <div className="space-y-2 border-t border-[#E7E5E4] pt-4 text-center text-xs leading-5 text-[#78716C]">
                  <p>
                    On the technician registry but never signed in?{' '}
                    <Link href="/activate-account" className="font-semibold text-[#B45309] hover:text-[#92400E]">Activate your account</Link>
                  </p>
                  <p>Students, trainers and administrators also sign in here.</p>
                </div>
              ) : (
                <div className="space-y-3 border-t border-[#E7E5E4] pt-4">
                  <div className="flex items-start gap-3 rounded-lg border border-[#E7E5E4] bg-[#FAFAF9] p-3 text-sm text-[#44403C]">
                    <Building2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#B45309]" aria-hidden="true" />
                    <span>New supplier? Supplier access is issued by secure invitation, for National Ozone Unit traceability.</span>
                  </div>
                  <Link
                    href="/contact"
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#D6D3D1] bg-white px-4 py-2.5 text-sm font-semibold text-[#1C1917] transition-colors hover:bg-[#FAFAF9]"
                  >
                    <span>Request supplier onboarding</span>
                    <PackageSearch className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              )}
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-[#A8A29E]">
            HEVACRAZ Compliance Platform · v1.4
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
