'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Award,
  Calendar,
  CheckCircle,
  Clock,
  ExternalLink,
  Info,
  Mail,
  MapPin,
  Phone,
  Search,
  Shield,
  ShieldCheck,
  User,
} from 'lucide-react';
import { CertificateQRCode } from '@/components/CertificateQRCode';
import { SITE_URL } from '@/lib/site-url';
import type { CertificateRecord, Technician } from '@/types/index';

type SearchMode = 'registration' | 'name' | 'certificate';

type VerificationResult = {
  technician: Technician | null;
  certificate: CertificateRecord | null;
  matchSource: SearchMode;
};

function formatDate(value?: string) {
  if (!value) return 'Not available';
  return new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium' }).format(new Date(value));
}

function getInitialPortalState() {
  if (typeof window === 'undefined') {
    return {
      searchMode: 'registration' as SearchMode,
      searchQuery: '',
      verificationToken: '',
      notFound: false,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  const query = params.get('q') ?? '';
  const searchMode: SearchMode =
    mode === 'name' || mode === 'certificate' || mode === 'registration' ? mode : 'registration';

  return {
    searchMode,
    searchQuery: query,
    verificationToken: params.get('token') ?? '',
    notFound: false,
  };
}

function findVerificationResult(
  query: string,
  mode: SearchMode,
  technicians: Technician[],
  certificateRecords: CertificateRecord[],
  token?: string | null
): VerificationResult | null {
  const normalizedQuery = query.trim().toUpperCase();
  const normalizedToken = token?.trim().toLowerCase();

  if (!normalizedQuery) {
    return null;
  }

  if (mode === 'certificate') {
    const certificate = certificateRecords.find((item) => {
      const matchesQuery =
        item.certificateNumber.toUpperCase() === normalizedQuery ||
        item.certificateNumber.toUpperCase().includes(normalizedQuery) ||
        item.verificationToken.toUpperCase() === normalizedQuery;

      const matchesToken = !normalizedToken || item.verificationToken.toLowerCase() === normalizedToken;
      return matchesQuery && matchesToken;
    });

    if (!certificate) return null;

    return {
      technician: technicians.find((item) => item.id === certificate.technicianId) ?? null,
      certificate,
      matchSource: mode,
    };
  }

  const technician =
    mode === 'registration'
      ? technicians.find((item) => item.registrationNumber.toUpperCase() === normalizedQuery) ?? null
      : technicians.find((item) => item.name.toUpperCase().includes(normalizedQuery)) ?? null;

  if (!technician) {
    return null;
  }

  return {
    technician,
    certificate:
      certificateRecords.find((item) => item.technicianId === technician.id && item.status === 'valid') ?? null,
    matchSource: mode,
  };
}

interface TechnicianVerificationPortalProps {
  /** "public" keeps the standalone HEVACRAZ header; "embedded" renders inside the app shell. */
  variant?: 'public' | 'embedded';
  heading?: string;
  description?: string;
}

export default function TechnicianVerificationPortal({
  variant = 'public',
  heading = 'Public Certificate Verification Portal',
  description = 'Verify a technician by registration number or name, or validate a HEVACRAZ / CertifyZim certificate using the certificate number or QR share link.',
}: TechnicianVerificationPortalProps) {
  const router = useRouter();
  const [initialState] = useState(getInitialPortalState);
  const [searchQuery, setSearchQuery] = useState(initialState.searchQuery);
  const [searchMode, setSearchMode] = useState<SearchMode>(initialState.searchMode);
  const [searchResult, setSearchResult] = useState<VerificationResult | null>(null);
  const [notFound, setNotFound] = useState(initialState.notFound);
  const [isSearching, setIsSearching] = useState(false);
  const [verificationToken, setVerificationToken] = useState(initialState.verificationToken);
  const [showActivity, setShowActivity] = useState(false);

  const isPublic = variant === 'public';

  // Certificate records are fetched only for an exact number + secret token. Never
  // download the full issued-certificate registry into a public browser.

  // Public technician listings never include contact details (to prevent bulk PII
  // scraping) — once a specific technician is matched, fetch their single record by id
  // to fill in email/phone for display.
  const applySearchResult = (match: VerificationResult | null) => {
    setSearchResult(match);
    setNotFound(!match);
  };

  const searchTechnicians = useCallback(async (query: string): Promise<Technician[]> => {
    if (!query.trim()) return [];
    try {
      const response = await fetch(`/api/public/technicians?q=${encodeURIComponent(query.trim())}`);
      return response.ok ? await response.json() as Technician[] : [];
    } catch {
      return [];
    }
  }, []);

  const lookupCertificate = useCallback(async (query: string, token: string): Promise<VerificationResult | null> => {
    if (!query.trim() || !token.trim()) return null;
    try {
      const params = new URLSearchParams({ q: query.trim(), token: token.trim() });
      const response = await fetch(`/api/public/certificates?${params}`);
      if (!response.ok) return null;
      const records = await response.json() as CertificateRecord[];
      const certificate = records[0];
      if (!certificate) return null;
      return {
        technician: null,
        certificate,
        matchSource: 'certificate',
      };
    } catch {
      return null;
    }
  }, []);

  // Initial public lookups fetch only the exact query, never the complete registry.
  const [initialQueryRun, setInitialQueryRun] = useState(false);
  useEffect(() => {
    if (!initialQueryRun && initialState.searchQuery) {
      const token = initialState.verificationToken;
      if (initialState.searchMode === 'certificate') {
        void lookupCertificate(initialState.searchQuery, token).then((match) => {
          applySearchResult(match);
          setInitialQueryRun(true);
        });
      } else {
        void searchTechnicians(initialState.searchQuery).then((matches) => {
          applySearchResult(findVerificationResult(initialState.searchQuery, initialState.searchMode, matches, []));
          setInitialQueryRun(true);
        });
      }
    }
  }, [initialQueryRun, initialState, lookupCertificate, searchTechnicians]);

  const recentActivity = useMemo(
    () =>
      searchResult?.certificate ? [{
        id: searchResult.certificate.id,
        name: searchResult.certificate.technicianName,
        certificateNumber: searchResult.certificate.certificateNumber,
        time: formatDate(searchResult.certificate.issueDate),
        verified: searchResult.certificate.status === 'valid',
      }] : [],
    [searchResult]
  );

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setNotFound(false);

    if (searchMode === 'certificate') {
      void lookupCertificate(searchQuery, verificationToken).then((match) => {
        applySearchResult(match);
        setIsSearching(false);
      });
    } else {
      void searchTechnicians(searchQuery).then((matches) => {
        applySearchResult(findVerificationResult(searchQuery, searchMode, matches, []));
        setIsSearching(false);
      });
    }
  };

  const suggestedQueries = {
    registration: [],
    name: [],
    certificate: [],
  };

  const technician = searchResult?.technician ?? null;
  const certificate = searchResult?.certificate ?? null;

  return (
    <div className={isPublic ? 'min-h-screen bg-white' : undefined}>
      {isPublic && (
        <header className="border-b border-[#E7E5E4] bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div className="flex cursor-pointer items-center" onClick={() => router.push('/')}>
              <img
                src="/logos/hevacraz-logo.jpeg"
                alt="HEVACRAZ"
                className="h-11 w-11 rounded-full object-cover"
              />
              <div className="ml-3">
                <span className="text-xl font-bold text-slate-900">HEVACRAZ</span>
                <p className="text-xs text-slate-500">Public Certificate Verification Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowActivity((current) => !current)}
                className="flex items-center gap-2 text-[#78716C] transition-colors hover:text-[#1C1917]"
              >
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Recent Activity</span>
              </button>
              <button
                onClick={() => router.push('/')}
                className="flex items-center text-[#78716C] transition-colors hover:text-[#1C1917]"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                <span className="text-sm font-medium">Back</span>
              </button>
            </div>
          </div>
        </header>
      )}

      {isPublic && showActivity && (
        <div className="fixed right-0 top-0 z-50 h-full w-80 overflow-y-auto bg-white border-l border-[#E7E5E4] shadow-sm">
          <div className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Recent Verifications</h3>
              <button onClick={() => setShowActivity(false)} className="text-slate-400 transition hover:text-slate-600">
                <AlertCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 bg-slate-50 p-3">
                  <div className="rounded-full bg-green-100 p-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{activity.name}</p>
                    <p className="text-xs text-slate-500">{activity.certificateNumber}</p>
                    <p className="mt-1 text-xs text-slate-400">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className={isPublic ? 'mx-auto max-w-5xl px-3 py-8 sm:px-4 md:px-6 md:py-14' : 'mx-auto max-w-5xl'}>
        <div className={isPublic ? 'mb-10 text-center' : 'mb-8'}>
          <div className={`mb-6 flex h-16 w-16 items-center justify-center bg-[#D97706] ${isPublic ? 'mx-auto' : ''}`}>
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className={`mb-4 font-bold text-slate-900 ${isPublic ? 'text-4xl' : 'text-2xl'}`}>{heading}</h1>
          <p className={`text-slate-600 ${isPublic ? 'mx-auto max-w-3xl text-lg' : 'max-w-3xl text-sm'}`}>
            {description}
          </p>
        </div>

        <div className="rounded-xl mb-8 border border-[#E7E5E4] bg-white p-8 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-slate-900">VERIFY A TECHNICIAN OR CERTIFICATE</span>
          </div>

          <form onSubmit={handleSearch}>
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap border-2 border-slate-200">
                {([
                  { value: 'registration', label: 'By Registration' },
                  { value: 'name', label: 'By Name' },
                  { value: 'certificate', label: 'By Certificate' },
                ] as const).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSearchMode(option.value)}
                    className={`px-4 py-3 text-sm font-medium transition-colors ${
                      searchMode === option.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-4 md:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={
                      searchMode === 'registration'
                        ? 'Enter registration number (e.g. ZIM/TECH/2023/001)'
                        : searchMode === 'name'
                          ? 'Enter technician name'
                          : 'Enter certificate number or verification token'
                    }
                    className="w-full border-2 border-slate-200 px-6 py-4 pl-12 text-lg transition-colors focus:border-blue-500 focus:outline-none"
                  />
                </div>
                {searchMode === 'certificate' && (
                  <input
                    type="text"
                    value={verificationToken}
                    onChange={(event) => setVerificationToken(event.target.value)}
                    placeholder="Verification token"
                    aria-label="Certificate verification token"
                    className="w-full border-2 border-slate-200 px-5 py-4 font-mono focus:border-blue-500 focus:outline-none md:max-w-xs"
                  />
                )}
                <button
                  type="submit"
                  disabled={isSearching}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-4 font-semibold text-white shadow-lg shadow-orange-200 transition-all hover:from-orange-600 hover:to-orange-700 disabled:opacity-50"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-6">
            <p className="mb-3 text-sm text-slate-500">
              {searchMode === 'certificate'
                ? 'Certificate lookups require the exact certificate number and its verification token.'
                : 'Search the live registry by an exact registration number or the beginning of a technician name.'}
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedQueries[searchMode].map((entry) => (
                <button
                  key={entry}
                  onClick={() => setSearchQuery(entry)}
                  className="bg-slate-100 px-3 py-1.5 font-mono text-sm text-slate-700 transition-colors hover:bg-slate-200"
                >
                  {entry}
                </button>
              ))}
            </div>
          </div>
        </div>

        {notFound && (
          <div className="border border-red-200 bg-red-50 p-8 text-center">
            <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
            <h3 className="mb-2 text-2xl font-bold text-red-800">No Match Found</h3>
            <p className="text-slate-600">
              We couldn&apos;t find a technician or certificate matching <strong>{searchQuery}</strong>. Check the code and try
              again.
            </p>
          </div>
        )}

        {searchResult && (
          <div className="border border-[#E7E5E4] bg-white shadow-sm">
            <div className="bg-[#1C1917] px-8 py-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center">
                  <div className="rounded-full bg-white/20 p-3">
                    <ShieldCheck className="h-8 w-8 text-white" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-2xl font-bold text-white">
                      {technician?.name ?? certificate?.technicianName ?? 'Verified Record'}
                    </h3>
                    <p className="font-mono text-blue-100">
                      {certificate?.certificateNumber ?? technician?.registrationNumber ?? 'Matched record'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center bg-[#5A7D5A] px-3 py-1.5">
                  <CheckCircle className="mr-2 h-4 w-4 text-white" />
                  <span className="text-sm font-semibold text-white">Verified</span>
                </div>
              </div>
            </div>

            <div className="grid gap-6 p-8 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-6">
                {technician && (
                  <div className="space-y-4">
                    <h4 className="border-b pb-2 text-lg font-semibold text-slate-900">Technician Details</h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-slate-400" />
                        <span className="text-slate-600">{technician.region}, Zimbabwe</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Award className="h-5 w-5 text-slate-400" />
                        <span className="text-slate-600">{technician.specialization}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-slate-400" />
                        <span className="text-slate-600">{technician.contactNumber}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-slate-400" />
                        <span className="text-slate-600">{technician.email ?? 'No email published'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-slate-400" />
                        <span className="text-slate-600">Registry valid until {formatDate(technician.expiryDate)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-green-600" />
                        <span className="text-slate-600">Registry status: {technician.status}</span>
                      </div>
                    </div>
                  </div>
                )}

                {certificate && (
                  <div className="space-y-4">
                    <h4 className="border-b pb-2 text-lg font-semibold text-slate-900">Certificate Details</h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-[#E7E5E4] bg-[#FAFAF9] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Certificate</p>
                        <p className="mt-2 font-semibold text-slate-900">{certificate.certificateType}</p>
                      </div>
                      <div className="rounded-lg border border-[#E7E5E4] bg-[#FAFAF9] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Issuing Body</p>
                        <p className="mt-2 font-semibold text-slate-900">{certificate.issuingBody}</p>
                      </div>
                      <div className="rounded-lg border border-[#E7E5E4] bg-[#FAFAF9] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Issued</p>
                        <p className="mt-2 font-semibold text-slate-900">{formatDate(certificate.issueDate)}</p>
                      </div>
                      <div className="rounded-lg border border-[#E7E5E4] bg-[#FAFAF9] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Expiry</p>
                        <p className="mt-2 font-semibold text-slate-900">{formatDate(certificate.expiryDate)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        Status: {certificate.status}
                      </span>
                      <span className="bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                        Match source: {searchResult.matchSource}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {certificate ? (
                  <>
                    <CertificateQRCode
                      value={
                        certificate.verificationUrl ||
                        `${typeof window === 'undefined' ? SITE_URL : window.location.origin}/verify-technician?mode=certificate&q=${encodeURIComponent(certificate.certificateNumber)}&token=${certificate.verificationToken}`
                      }
                      title="Shareable Verification QR"
                    />
                    <div className="border border-[#E7E5E4] bg-[#FAFAF9] p-5">
                      <p className="text-sm font-semibold text-slate-900">Verification token</p>
                      <p className="mt-2 break-all font-mono text-sm text-slate-600">{certificate.verificationToken}</p>
                      {certificate.verificationUrl && (
                        <a
                          href={certificate.verificationUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#D97706] transition hover:text-[#b45309]"
                        >
                          Open shareable link
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="border border-amber-200 bg-amber-50 p-5">
                    <p className="text-sm font-semibold text-amber-900">Registry match only</p>
                    <p className="mt-2 text-sm leading-6 text-amber-800">
                      This technician is present in the National RAC Technician Verification and Competency Registry, but no
                      issued certificate record is stored locally yet.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-12 bg-gradient-to-r from-slate-800 to-slate-900 p-8 text-white">
          <div className="mb-6 flex items-center gap-3">
            <Info className="h-6 w-6 text-orange-400" />
            <h2 className="text-2xl font-bold">Why Verification Matters</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <div className="w-fit bg-white/10 p-3">
                <ShieldCheck className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="font-semibold">Consumer Protection</h3>
              <p className="text-sm text-slate-300">
                Check that your technician is listed in the national registry and carries the right credentials for the job.
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-fit bg-white/10 p-3">
                <Award className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="font-semibold">Certificate Integrity</h3>
              <p className="text-sm text-slate-300">
                QR-backed verification helps confirm issued certificates, assessment history, and expiry dates before site work.
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-fit bg-white/10 p-3">
                <CheckCircle className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="font-semibold">Compliance Confidence</h3>
              <p className="text-sm text-slate-300">
                Verified technicians and valid certificates reduce installation risk and strengthen audit-readiness for clients.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
