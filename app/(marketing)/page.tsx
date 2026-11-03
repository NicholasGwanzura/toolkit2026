'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  CheckCircle,
  Landmark,
  UserCheck,
  Globe,
  Users,
  Wrench,
  Mic,
  GitBranch,
  LayoutDashboard,
  QrCode,
  Search,
  Cpu,
  Award,
  Briefcase,
  ExternalLink,
} from 'lucide-react';

const HERO_TAGS = [
  'NOU Operated',
  'UNEP Aligned',
  'Montreal Protocol',
  'Kigali Amendment',
  'SI 49 of 2023',
];

const HERO_SLIDES = [
  {
    src: '/images/hero/zimbabwe-hvac-rooftop.webp',
    alt: 'Zimbabwean HVAC technician inspecting rooftop units in Harare',
    label: 'Harare rooftop',
  },
  {
    src: '/images/hero/zimbabwe-cold-chain-market.webp',
    alt: 'Zimbabwean refrigeration technician checking a market cold room',
    label: 'Cold chain',
  },
  {
    src: '/images/hero/zimbabwe-hvac-training.webp',
    alt: 'Zimbabwean HVAC-R trainees reviewing an air conditioning training rig',
    label: 'Skills training',
  },
];

const WHY = [
  {
    icon: <Landmark className="h-7 w-7" />,
    eyebrow: 'For the NOU',
    body:
      'Real-time oversight of every authorised HFC and HCFC handler in Zimbabwe. Auto-generated UNEP reports. Grey market detection. Supply chain enforcement.',
  },
  {
    icon: <UserCheck className="h-7 w-7" />,
    eyebrow: 'For Technicians',
    body:
      'Digital certifications, AI safety guidance, refrigerant tracking, job planner, and client reports in one tool. Accessible from any device.',
  },
  {
    icon: <Globe className="h-7 w-7" />,
    eyebrow: 'For Zimbabwe',
    body:
      'Stronger environmental compliance. Reduced illegal venting. Traceable refrigerant consumption. Credible Montreal Protocol reporting.',
  },
];

const STATS = [
  { v: '10', l: 'Zimbabwe provinces covered' },
  { v: '34', l: 'Modules across three integrated systems' },
  { v: '6', l: 'User roles for different stakeholders' },
  { v: '100%', l: 'Compliance reporting automated for UNEP submission' },
];

const PLATFORMS = [
  {
    icon: <Users className="h-6 w-6" />,
    name: 'HEVACRAZ',
    sub: 'HVAC-R Association of Zimbabwe',
    body: 'Registry, training, and field tools for the country’s refrigeration and air-conditioning trade.',
  },
  {
    icon: <Cpu className="h-6 w-6" />,
    name: 'RAC Field Companion',
    sub: 'AI-powered field intelligence for technicians',
    body: 'Safety guidance, sizing, and job-planning support grounded in ASHRAE and UNEP documentation.',
  },
  {
    icon: <Award className="h-6 w-6" />,
    name: 'CertifyZim',
    sub: 'Digital certification engine',
    body: 'QR-verified, tamper-proof certificates and COCs aligned with UNEP and NOU submission formats.',
  },
];

const FEATURES = [
  {
    icon: <Search className="h-6 w-6" />,
    title: 'National Registry',
    body: 'Every certified refrigerant handler in Zimbabwe, verifiable by QR code.',
  },
  {
    icon: <Wrench className="h-6 w-6" />,
    title: 'Field Toolkit',
    body: 'Installation records, COC generation, and refrigerant tracking for every job.',
  },
  {
    icon: <Mic className="h-6 w-6" />,
    title: 'Voice AI',
    body:
      'Real-time safety guidance grounded in ASHRAE 15, ASHRAE 34, and UNEP-ASHRAE procedures, nothing invented.',
  },
  {
    icon: <GitBranch className="h-6 w-6" />,
    title: 'Supply Chain Tracking',
    body: 'Every kilogram of refrigerant from approved supplier to technician to field deployment.',
  },
  {
    icon: <LayoutDashboard className="h-6 w-6" />,
    title: 'NOU Compliance Dashboard',
    body: 'Live regulatory oversight with automated UNEP reporting.',
  },
  {
    icon: <QrCode className="h-6 w-6" />,
    title: 'Certifications',
    body: 'Digital, tamper-proof, QR-verified. No more paper certificates.',
  },
];

const PARTNERS = [
  { icon: <Landmark className="h-5 w-5" />, name: 'National Ozone Unit Zimbabwe' },
  { logo: '/logos/hevacraz-logo.jpeg', name: 'HEVACRAZ' },
  { icon: <Globe className="h-5 w-5" />, name: 'UNEP OzonAction' },
  { logo: '/logos/ministry-of-environment.jpeg', name: 'Ministry of Environment, Climate and Tourism' },
  { icon: <Briefcase className="h-5 w-5" />, name: 'Multilateral Fund for the Implementation of the Montreal Protocol' },
];

const INSTITUTIONAL_LINKS: {
  label: string;
  href: string;
  external?: boolean;
}[] = [
  { label: 'About the Platform', href: '/about' },
  { label: 'Verify a Technician', href: '/verify-technician' },
  { label: 'NOU', href: 'https://www.unep.org/ozonaction', external: true },
  { label: 'HEVACRAZ', href: '/membership' },
  { label: 'UNEP OzonAction', href: 'https://www.unep.org/ozonaction', external: true },
  { label: 'Contact', href: '/contact' },
];

export default function HomePage() {
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  // How far the carousel has got: slides up to the next one are loaded, and stay loaded so they can fade out.
  const [loadedSlides, setLoadedSlides] = useState(2);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveHeroSlide((current) => {
        const next = (current + 1) % HERO_SLIDES.length;
        setLoadedSlides((loaded) => Math.max(loaded, next + 2));
        return next;
      });
    }, 5500);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ffffff' }}>
      {/* Hero */}
      <section className="relative min-h-[88vh] sm:min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          {HERO_SLIDES.map((slide, index) => (
            // A slide is fetched once the carousel is about to show it, so the page does not download every photo up front.
            index < loadedSlides ? (
              <Image
                key={slide.src}
                src={slide.src}
                alt={slide.alt}
                fill
                priority={index === 0}
                sizes="100vw"
                className={`object-cover object-center scale-105 motion-safe:animate-[slowZoom_24s_ease-out_infinite_alternate] transition-opacity duration-1000 ${
                activeHeroSlide === index ? 'opacity-100' : 'opacity-0'
              }`}
              />
            ) : null
          ))}
          <div className="absolute inset-0 bg-black/65" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/90 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[#D97706]/10" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28 sm:py-36 md:py-40">
          <div className="max-w-5xl">
            <div className="flex flex-wrap items-center gap-3 mb-5 sm:mb-6">
              <p className="inline-flex items-center gap-3 text-[#D97706] text-xs sm:text-sm font-semibold tracking-[0.18em] sm:tracking-[0.22em] uppercase">
                <span className="inline-block w-6 h-px bg-[#D97706]" />
                National Ozone Unit Platform
              </p>
              <span
                className="inline-flex items-center px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] border"
                style={{
                  borderColor: 'rgba(217,119,6,0.45)',
                  color: '#f5b66b',
                  backgroundColor: 'rgba(217,119,6,0.1)',
                }}
              >
                Live Now
              </span>
            </div>

            <h1 className="text-[2.5rem] leading-[1.08] sm:text-6xl md:text-7xl font-bold text-white mb-5 sm:mb-6 tracking-tight text-balance">
              Zimbabwe’s Digital{' '}
              <span className="bg-gradient-to-r from-white via-white to-[#f5b66b] bg-clip-text text-transparent">
                <span className="whitespace-nowrap">HVAC-R</span> <span className="whitespace-nowrap">Registration System</span>
              </span>
            </h1>
            <p className="text-white/80 text-base sm:text-lg md:text-xl mb-8 sm:mb-10 leading-relaxed max-w-2xl">
              Operated by the National Ozone Unit. Supported by HEVACRAZ. Built for every certified
              technician in the field.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link
                href="/join"
                className="group inline-flex min-h-12 items-center justify-center gap-2 font-semibold py-4 px-8 text-base text-white shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30 hover:brightness-110 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                style={{ backgroundColor: '#B45309' }}
              >
                Join Now
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/40 hover:border-white hover:bg-white/10 text-white font-medium py-4 px-8 text-base transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                Sign in
              </Link>
            </div>

            <p className="mt-5 text-xs sm:text-sm text-white/60 tracking-wide">
              Aligned with the Kigali Amendment · Montreal Protocol · SI 49 of 2023
            </p>

          </div>
        </div>

        {/* Institutional trust bar */}
        <div className="absolute bottom-0 left-0 right-0 z-10 border-t border-white/10 backdrop-blur-sm bg-black/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-[11px] sm:text-xs font-medium text-white/70 uppercase tracking-[0.18em]">
              {HERO_TAGS.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-[#D97706] shrink-0" />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why This Platform Exists */}
      <section className="py-20 sm:py-24" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 sm:mb-16">
            <p className="text-[#D97706] text-xs font-semibold tracking-[0.24em] uppercase mb-3">
              Why This Platform Exists
            </p>
            <h2
              className="text-3xl sm:text-4xl md:text-[2.75rem] font-bold tracking-tight"
              style={{ color: '#1C1917' }}
            >
              Value for every stakeholder
            </h2>
            <div className="w-20 h-[3px] mx-auto mt-5" style={{ backgroundColor: '#D97706' }} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {WHY.map((w) => (
              <div
                key={w.eyebrow}
                className="group relative p-7 sm:p-8 bg-white border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-[#D97706]/40"
                style={{ borderColor: '#E5E0DB' }}
              >
                <div
                  className="inline-flex p-3.5 mb-6 transition-colors duration-300 group-hover:bg-[#D97706]/10"
                  style={{ backgroundColor: '#FAFAF9' }}
                >
                  <span
                    className="transition-colors duration-300 group-hover:text-[#D97706]"
                    style={{ color: '#5A7D5A' }}
                  >
                    {w.icon}
                  </span>
                </div>
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gray-500 mb-2">
                  {w.eyebrow}
                </p>
                <p className="text-sm sm:text-[15px] text-gray-700 leading-relaxed">{w.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Numbers */}
      <section
        className="relative py-20 sm:py-24 overflow-hidden"
        style={{ backgroundColor: '#1C1917' }}
      >
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(217,119,6,0.5), transparent)' }}
        />
        <div
          aria-hidden
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] opacity-20 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(closest-side, #D97706, transparent 70%)' }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-14">
            <p className="text-[#D97706] text-xs font-semibold tracking-[0.24em] uppercase mb-3">
              The Numbers
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-[2.75rem] font-bold tracking-tight text-white">
              The scope of the platform
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
            {STATS.map((s) => (
              <div key={s.l} className="group">
                <p className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight transition-colors duration-300 group-hover:text-[#D97706]">
                  {s.v}
                </p>
                <p className="mt-3 text-[11px] sm:text-xs text-white/55 uppercase tracking-[0.18em] leading-relaxed">
                  {s.l}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Three Integrated Platforms */}
      <section className="py-20 sm:py-24" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 sm:mb-16 max-w-3xl mx-auto">
            <p className="text-[#D97706] text-xs font-semibold tracking-[0.24em] uppercase mb-3">
              Architecture
            </p>
            <h2
              className="text-3xl sm:text-4xl md:text-[2.75rem] font-bold tracking-tight"
              style={{ color: '#1C1917' }}
            >
              Three integrated platforms, one unified system
            </h2>
            <div className="w-20 h-[3px] mx-auto mt-5" style={{ backgroundColor: '#D97706' }} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {PLATFORMS.map((p) => (
              <div
                key={p.name}
                className="group relative p-7 sm:p-8 bg-white border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-[#D97706]/40"
                style={{ borderColor: '#E5E0DB' }}
              >
                <div
                  className="inline-flex p-3 mb-6 transition-colors duration-300 group-hover:bg-[#D97706]/10"
                  style={{ backgroundColor: '#FAFAF9', color: '#5A7D5A' }}
                >
                  <span className="transition-colors duration-300 group-hover:text-[#D97706]">
                    {p.icon}
                  </span>
                </div>
                <h3
                  className="text-lg sm:text-xl font-bold tracking-tight"
                  style={{ color: '#1C1917' }}
                >
                  {p.name}
                </h3>
                <p
                  className="mt-1 text-[11px] font-semibold tracking-[0.16em] uppercase"
                  style={{ color: '#D97706' }}
                >
                  {p.sub}
                </p>
                <p className="mt-4 text-sm sm:text-[15px] text-gray-700 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>

          <p className="mt-10 sm:mt-12 text-center text-sm text-gray-500 max-w-3xl mx-auto leading-relaxed">
            Built on a single database, unified authentication, and one deployment, so the NOU sees
            every handler, every certification, and every refrigerant kilogram in one view.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 sm:py-24" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 sm:mb-16">
            <p className="text-[#D97706] text-xs font-semibold tracking-[0.24em] uppercase mb-3">
              Platform Capabilities
            </p>
            <h2
              className="text-3xl sm:text-4xl md:text-[2.75rem] font-bold tracking-tight"
              style={{ color: '#1C1917' }}
            >
              What the platform delivers
            </h2>
            <div className="w-20 h-[3px] mx-auto mt-5" style={{ backgroundColor: '#D97706' }} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group relative p-7 sm:p-8 bg-white border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-[#D97706]/40"
                style={{ borderColor: '#E5E0DB' }}
              >
                <div
                  className="inline-flex p-3 mb-6 transition-colors duration-300 group-hover:bg-[#D97706]/10"
                  style={{ backgroundColor: '#FAFAF9' }}
                >
                  <span
                    className="transition-colors duration-300 group-hover:text-[#D97706]"
                    style={{ color: '#5A7D5A' }}
                  >
                    {f.icon}
                  </span>
                </div>
                <h3
                  className="text-lg sm:text-xl font-bold mb-3 tracking-tight"
                  style={{ color: '#1C1917' }}
                >
                  {f.title}
                </h3>
                <p className="text-sm sm:text-[15px] text-gray-600 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Backed By */}
      <section className="py-16 sm:py-20" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12">
            <p className="text-[#D97706] text-xs font-semibold tracking-[0.24em] uppercase mb-3">
              Backed By
            </p>
            <h2
              className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight"
              style={{ color: '#1C1917' }}
            >
              The institutions behind the platform
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {PARTNERS.map((p) => (
              <div
                key={p.name}
                className="group flex flex-col items-start gap-3 bg-white border p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-[#D97706]/40"
                style={{ borderColor: '#E5E0DB' }}
              >
                <span
                  className="inline-flex p-2 transition-colors group-hover:bg-[#D97706]/10"
                  style={{ backgroundColor: '#FAFAF9', color: '#5A7D5A' }}
                >
                  {p.logo ? (
                    <Image src={p.logo} alt={p.name} width={20} height={20} className="h-5 w-5 rounded-full object-cover" />
                  ) : (
                    <span className="transition-colors group-hover:text-[#D97706]">{p.icon}</span>
                  )}
                </span>
                <p
                  className="text-[13px] sm:text-sm font-semibold tracking-tight leading-snug"
                  style={{ color: '#1C1917' }}
                >
                  {p.name}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-xs sm:text-sm text-gray-500 max-w-2xl mx-auto leading-relaxed">
            This platform operationalises Zimbabwe’s international commitments under the Montreal
            Protocol and the Kigali Amendment.
          </p>
        </div>
      </section>

      {/* Institutional attribution band */}
      <section className="relative py-16 sm:py-20 overflow-hidden" style={{ backgroundColor: '#1C1917' }}>
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(217,119,6,0.5), transparent)' }}
        />
        <div
          aria-hidden
          className="absolute -bottom-32 -left-24 w-[520px] h-[520px] opacity-[0.08] pointer-events-none"
          style={{ background: 'radial-gradient(closest-side, #D97706, transparent 70%)' }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
            <div>
              <p className="text-[#D97706] text-xs font-semibold tracking-[0.24em] uppercase mb-4">
                Institutional attribution
              </p>
              <p className="text-base sm:text-lg text-white/75 leading-relaxed max-w-xl">
                This platform is operated by the National Ozone Unit (NOU) under the Ministry of
                Environment, Climate and Tourism, with professional support from the HVAC-R
                Association of Zimbabwe (HEVACRAZ). It implements Zimbabwe’s obligations under the
                Montreal Protocol and the Kigali Amendment.
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-white/50 mb-5">
                Institutional links
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {INSTITUTIONAL_LINKS.map((l) =>
                  l.external ? (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-2 text-sm text-white/80 hover:text-[#D97706] transition-colors"
                      >
                        <span>{l.label}</span>
                        <ExternalLink className="h-3.5 w-3.5 opacity-60 transition-opacity group-hover:opacity-100" />
                      </a>
                    </li>
                  ) : (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="group inline-flex items-center gap-2 text-sm text-white/80 hover:text-[#D97706] transition-colors"
                      >
                        <span>{l.label}</span>
                        <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
