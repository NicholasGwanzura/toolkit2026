"use client";

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../../lib/auth';
import { Lock, Mail, ArrowRight, Building2, PackageSearch } from 'lucide-react';

const inputCls = 'block w-full px-3 py-2.5 rounded-lg bg-white border border-[#E7E5E4] text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706] transition-colors text-sm';

function LoginPageContent() {
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [manualMode, setManualMode] = useState<'signin' | 'supplier' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isSupplierFlow = searchParams.get('flow') === 'supplier';
  const activeMode = manualMode ?? (isSupplierFlow ? 'supplier' : 'signin');
  const requestedNextPath = searchParams.get('next');
  const nextPath = (() => {
    const fallback = isSupplierFlow ? '/suppliers' : '/dashboard';
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

  const tabs: { id: typeof activeMode; label: string }[] = [
    { id: 'signin',   label: 'Sign In' },
    { id: 'supplier', label: 'Supplier' },
  ];

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-lg">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="mb-4 inline-flex items-center gap-2.5" aria-label="HEVACRAZ and Ministry of Environment">
            <img
              src="/logos/ministry-of-environment.jpeg"
              alt="Ministry of Environment, Climate and Wildlife"
              className="h-12 w-12 rounded-full object-cover"
            />
            <span className="h-8 w-px bg-[#D6D3D1]" aria-hidden="true" />
            <img
              src="/logos/hevacraz-logo.jpeg"
              alt="HEVACRAZ"
              className="h-12 w-12 rounded-full object-cover"
            />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#1C1917]">HEVACRAZ</h1>
          <p className="mt-1 text-sm text-[#78716C]">HVAC-R Professionals Zimbabwe Member Portal</p>
        </div>

        {/* Card */}
        <div className="rounded-lg bg-white border border-[#E7E5E4] shadow-sm">

          {/* Tabs */}
          <div className="flex border-b border-[#E7E5E4]">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setManualMode(tab.id as 'signin' | 'supplier')}
                className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeMode === tab.id
                    ? 'border-[#D97706] text-[#1C1917]'
                    : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6 space-y-5">
            {activeMode === 'signin' && (
              <div className="space-y-5">
                {fieldErrors.form && (
                  <div className="border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                    {fieldErrors.form}
                  </div>
                )}

                <form onSubmit={handleNormalLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wide text-[#78716C]">Work Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A8A29E]" />
                    <input
                      id="email" type="email" required value={email}
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
                    <Link href="/forgot-password" className="text-xs font-medium text-[#D97706] hover:text-[#b45309]">Forgot?</Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A8A29E]" />
                    <input
                      id="password" type="password" required value={password}
                      onChange={e => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: '' })); }}
                      placeholder="••••••••"
                      className={`${inputCls} pl-9 ${fieldErrors.password ? 'border-red-400' : ''}`}
                    />
                  </div>
                  {fieldErrors.password && <p className="text-xs text-red-600">{fieldErrors.password}</p>}
                </div>

                <button
                  type="submit" disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 bg-[#D97706] text-white text-sm font-semibold py-2.5 px-4 hover:bg-[#b45309] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading
                    ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><span>Sign In</span><ArrowRight className="h-4 w-4" /></>
                  }
                </button>
                </form>

                <p className="border-t border-[#E7E5E4] pt-4 text-center text-xs leading-5 text-[#78716C]">
                  On the technician registry but never signed in?{' '}
                  <Link href="/activate-account" className="font-semibold text-[#D97706] hover:text-[#b45309]">Activate your account</Link>
                </p>
              </div>
            )}

            {activeMode === 'supplier' && (
              <div className="space-y-4">
                <div className="border border-[#E7E5E4] bg-[#FAFAF9] p-3 flex items-start gap-3 text-sm text-[#44403C]">
                  <Building2 className="h-4 w-4 text-[#D97706] mt-0.5 flex-shrink-0" />
                  <span><strong className="font-semibold text-[#1C1917]">Supplier Onboarding</strong> Supplier access is issued by secure invitation for NOU traceability.</span>
                </div>
                <p className="text-sm text-[#78716C] leading-relaxed">
                  Ask HEVACRAZ or your organisation administrator for an invitation. The secure link lets
                  you create your account and complete the supplier questionnaire.
                </p>
                <Link
                  href="/contact"
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#D97706] text-white text-sm font-semibold py-2.5 px-4 hover:bg-[#b45309] transition-colors"
                >
                  <span>Request supplier onboarding</span>
                  <PackageSearch className="h-4 w-4" />
                </Link>
                <p className="text-center text-sm text-[#78716C]">
                  Already an approved supplier?{' '}
                  <button
                    type="button"
                    onClick={() => setManualMode('signin')}
                    className="font-semibold text-[#D97706] hover:underline"
                  >
                    Sign in instead
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-[#A8A29E] mt-6">
          HEVACRAZ Compliance Platform · v1.4
        </p>
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
