'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Globe,
  UserCheck,
  ShieldCheck,
  Users,
  GitBranch,
  Award,
  Wrench,
  FileCheck,
  Scale,
  BookOpen,
  Landmark,
  Briefcase,
  Mail,
  ArrowRight,
  ExternalLink,
  CheckCircle,
} from 'lucide-react';
import { FinalCTA } from '@/components/marketing/FinalCTA';

const HERO_TAGS = [
  'NOU Operated',
  'UNEP Aligned',
  'Montreal Protocol',
  'Kigali Amendment',
  'SI 49 of 2023',
];

const PURPOSE = [
  {
    icon: <Globe className="h-7 w-7" />,
    title: 'Protect the Ozone Layer',
    body:
      'Zimbabwe committed to the Montreal Protocol in 1992 and the Kigali Amendment in 2017. This platform operationalises those commitments by giving the National Ozone Unit real-time visibility into every kilogram of controlled refrigerant in the country, from approved supplier through certified technician to field deployment and recovery.',
  },
  {
    icon: <UserCheck className="h-7 w-7" />,
    title: 'Professionalise the Trade',
    body:
      'HEVACRAZ, the HVAC-R Association of Zimbabwe, has long worked to raise the standard of refrigeration and air-conditioning work across the country. This platform gives every HEVACRAZ-affiliated technician the digital tools, certifications, and continuous professional development they need to operate safely, legally, and competitively.',
  },
  {
    icon: <ShieldCheck className="h-7 w-7" />,
    title: 'Enable National Compliance',
    body:
      'Statutory Instrument 49 of 2023 implements Zimbabwe’s HFC and HCFC phase-down obligations. The platform automates compliance reporting, certification issuance, refrigerant tracking, and UNEP submissions, reducing manual administration while strengthening enforcement.',
  },
];

const PLATFORM_CAPABILITIES = [
  {
    icon: <Users className="h-6 w-6" />,
    title: 'National Technician Registry',
    body: 'Every certified refrigerant handler in Zimbabwe listed, verified, and searchable by the public, businesses, and NOU regulators.',
    eyebrow: 'Identity',
  },
  {
    icon: <GitBranch className="h-6 w-6" />,
    title: 'Refrigerant Supply Chain Tracking',
    body: 'End-to-end chain of custody from approved supplier to field deployment.',
    eyebrow: 'Chain of custody',
  },
  {
    icon: <Award className="h-6 w-6" />,
    title: 'Digital Certification and COC Issuance',
    body: 'QR-verified certificates with tamper-proof authentication.',
    eyebrow: 'Output',
  },
  {
    icon: <Wrench className="h-6 w-6" />,
    title: 'Field Intelligence and Safety Tools',
    body: 'RAG AI grounded in ASHRAE and UNEP guidance for every technician in the field, with offline access for remote sites.',
    eyebrow: 'In the field',
  },
  {
    icon: <FileCheck className="h-6 w-6" />,
    title: 'UNEP and Montreal Protocol Reporting',
    body: 'Automated annual compliance reports formatted for submission to the Ozone Secretariat and the Multilateral Fund.',
    eyebrow: 'Reporting',
  },
];

const LEGAL_FRAMEWORK = [
  {
    icon: <Scale className="h-5 w-5" />,
    title: 'Statutory Instrument 49 of 2023',
    body:
      'Zimbabwe’s implementation of the Kigali Amendment. Establishes quotas and phase-down schedules for HFCs, prohibits specific high-GWP refrigerants, and sets penalties for non-compliance. The platform operationalises SI 49 by tracking every import, purchase, usage, and recovery event.',
  },
  {
    icon: <FileCheck className="h-5 w-5" />,
    title: 'The Kigali Amendment (2016)',
    body:
      'International agreement to phase down hydrofluorocarbons (HFCs). Zimbabwe ratified the Kigali Amendment and is obligated to reduce HFC consumption by 85% by 2047. The platform’s supply chain tracking directly supports this obligation.',
  },
  {
    icon: <Globe className="h-5 w-5" />,
    title: 'Montreal Protocol on Substances that Deplete the Ozone Layer',
    body:
      'The founding international environmental treaty governing ozone-depleting substances. Zimbabwe has been a party since 1992. Annual reporting to the Ozone Secretariat is a legal obligation, the platform automates this.',
  },
  {
    icon: <BookOpen className="h-5 w-5" />,
    title: 'UNEP OzonAction Programme',
    body:
      'The United Nations Environment Programme’s capacity-building initiative supporting developing countries to meet Montreal Protocol obligations. This platform aligns with OzonAction’s digital transformation agenda for national ozone units.',
  },
];

const PARTNERS = [
  {
    icon: <Landmark className="h-6 w-6" />,
    name: 'National Ozone Unit Zimbabwe',
    role: 'Operating authority',
  },
  {
    logo: '/logos/hevacraz-logo.jpeg',
    name: 'HEVACRAZ',
    role: 'Industry partner',
  },
  {
    icon: <Globe className="h-6 w-6" />,
    name: 'UNEP',
    role: 'International partner',
  },
  {
    icon: <Briefcase className="h-6 w-6" />,
    name: 'Multilateral Fund for the Implementation of the Montreal Protocol',
    role: 'Funding mechanism',
  },
  {
    logo: '/logos/ministry-of-environment.jpeg',
    name: 'Ministry of Environment, Climate and Tourism',
    role: 'Government oversight',
  },
];

const CONTACTS = [
  {
    label: 'National Ozone Unit',
    purpose: 'Institutional and regulatory queries',
    email: 'nou@environment.gov.zw',
    address: 'Ministry of Environment, Water and Climate, 12th Floor, Kaguvi Building, Central Avenue, Private Bag 7753 Causeway, Harare, Zimbabwe',
    phone: '(263) 4 701551/701691/2, +263 778 410 281',
  },
  {
    label: 'HEVACRAZ',
    purpose: 'Technician registration and industry queries',
    email: 'info@hevacraz.co.zw',
    address: '661 Lorraine Drive, Bluff Hill, Harare, Zimbabwe',
    phone: '+263 772 630 517 / +263 773 034 528',
  },
  {
    label: 'Platform Support',
    purpose: 'Technical issues and bug reports',
    email: 'support@hevacraz.co.zw',
  },
];

export default function AboutPage() {
  const [openLegal, setOpenLegal] = useState<number | null>(0);

  return (
    <div style={{ backgroundColor: '#ffffff' }}>
      {/* Section 1 — Hero */}
      <section
        className="relative pt-28 sm:pt-32 pb-20 sm:pb-24 overflow-hidden"
        style={{ backgroundColor: '#1C1917' }}
      >
        <div
          aria-hidden
          className="absolute -top-24 -right-24 w-[520px] h-[520px] opacity-[0.12] pointer-events-none"
          style={{ background: 'radial-gradient(closest-side, #D97706, transparent 70%)' }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(217,119,6,0.5), transparent)' }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-5">
            <p className="text-[#D97706] text-xs font-semibold tracking-[0.24em] uppercase">
              About the Platform
            </p>
            <span
              className="inline-flex items-center px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] border"
              style={{ borderColor: 'rgba(217,119,6,0.4)', color: '#f5b66b', backgroundColor: 'rgba(217,119,6,0.08)' }}
            >
              Live Now
            </span>
          </div>

          <h1 className="text-[2.25rem] sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] text-white max-w-4xl">
            Zimbabwe’s Unified Platform for
            <br className="hidden sm:block" />{' '}
            <span className="text-[#D97706]">Refrigerant Compliance</span>
          </h1>

          <p className="mt-6 max-w-2xl text-base sm:text-lg text-white/70 leading-relaxed">
            Operated by the National Ozone Unit with industry support from HEVACRAZ. Aligned with
            the Kigali Amendment and Montreal Protocol obligations.
          </p>

          {/* Partner logo placeholders */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-2xl">
            <div
              className="flex items-center gap-4 px-5 py-5 border"
              style={{ borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.03)' }}
            >
              <div
                className="shrink-0 flex items-center justify-center w-12 h-12 text-xs font-bold tracking-[0.18em] uppercase text-[#D97706] border"
                style={{ borderColor: 'rgba(217,119,6,0.4)', backgroundColor: 'rgba(217,119,6,0.08)' }}
              >
                NOU
              </div>
              <div>
                <p className="text-[11px] text-white/50 uppercase tracking-[0.18em]">Operating authority</p>
                <p className="text-sm font-semibold text-white mt-0.5">National Ozone Unit Zimbabwe</p>
              </div>
            </div>
            <div
              className="flex items-center gap-4 px-5 py-5 border"
              style={{ borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.03)' }}
            >
              <Image
                src="/logos/hevacraz-logo.jpeg"
                alt="HEVACRAZ"
                width={48}
                height={48}
                className="shrink-0 w-12 h-12 rounded-full object-cover border"
                style={{ borderColor: 'rgba(255,255,255,0.25)' }}
              />
              <div>
                <p className="text-[11px] text-white/50 uppercase tracking-[0.18em]">Industry partner</p>
                <p className="text-sm font-semibold text-white mt-0.5">HEVACRAZ</p>
              </div>
            </div>
          </div>

          {/* Tag row */}
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-[11px] sm:text-xs font-medium text-white/70 uppercase tracking-[0.18em]">
            {HERO_TAGS.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-[#D97706] shrink-0" />
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Section 2 — Our Purpose */}
      <section className="py-20 sm:py-24" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 sm:mb-16">
            <p className="text-[#D97706] text-xs font-semibold tracking-[0.24em] uppercase mb-3">
              Our Purpose
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-[2.75rem] font-bold tracking-tight" style={{ color: '#1C1917' }}>
              Why this platform exists
            </h2>
            <div className="w-20 h-[3px] mx-auto mt-5" style={{ backgroundColor: '#D97706' }} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {PURPOSE.map((item) => (
              <div
                key={item.title}
                className="group relative p-7 sm:p-8 bg-white border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-[#D97706]/40"
                style={{ borderColor: '#E5E0DB' }}
              >
                <div
                  className="inline-flex p-3.5 mb-6 transition-colors duration-300 group-hover:bg-[#D97706]/10"
                  style={{ backgroundColor: '#FAFAF9' }}
                >
                  <span className="transition-colors duration-300 group-hover:text-[#D97706]" style={{ color: '#5A7D5A' }}>
                    {item.icon}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-3 tracking-tight" style={{ color: '#1C1917' }}>
                  {item.title}
                </h3>
                <p className="text-sm sm:text-[15px] text-gray-600 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3 — Institutional Structure */}
      <section className="py-20 sm:py-24" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-14 sm:mb-16 max-w-2xl">
            <p className="text-[#D97706] text-xs font-semibold tracking-[0.24em] uppercase mb-3">
              Institutional Structure
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-[2.75rem] font-bold tracking-tight" style={{ color: '#1C1917' }}>
              Who runs the platform
            </h2>
            <p className="mt-5 text-gray-600 leading-relaxed text-base sm:text-lg">
              A regulatory authority and an industry body working through a shared digital instrument.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {/* Left — NOU */}
            <div
              className="bg-white border p-7 sm:p-8"
              style={{ borderColor: '#E5E0DB' }}
            >
              <div className="flex items-start gap-4 mb-6">
                <div
                  className="shrink-0 inline-flex p-3"
                  style={{ backgroundColor: 'rgba(217,119,6,0.1)', color: '#D97706' }}
                >
                  <Landmark className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gray-500">
                    Regulatory authority
                  </p>
                  <h3 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight" style={{ color: '#1C1917' }}>
                    The National Ozone Unit (NOU)
                  </h3>
                </div>
              </div>

              <dl className="space-y-5 text-sm sm:text-[15px]">
                <div>
                  <dt className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gray-500">
                    Operated by
                  </dt>
                  <dd className="mt-1.5 text-gray-700 leading-relaxed">
                    Ministry of Environment, Climate and Tourism
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gray-500">
                    International mandate
                  </dt>
                  <dd className="mt-1.5 text-gray-700 leading-relaxed">
                    UNEP, Multilateral Fund for the Implementation of the Montreal Protocol
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gray-500">
                    Role on the platform
                  </dt>
                  <dd className="mt-1.5 text-gray-700 leading-relaxed">
                    Regulatory authority, supply chain oversight, certification approval, grey market
                    enforcement, and UNEP reporting.
                  </dd>
                </div>
              </dl>
            </div>

            {/* Right — HEVACRAZ */}
            <div
              className="bg-white border p-7 sm:p-8"
              style={{ borderColor: '#E5E0DB' }}
            >
              <div className="flex items-start gap-4 mb-6">
                <div
                  className="shrink-0 inline-flex p-3"
                  style={{ backgroundColor: 'rgba(90,125,90,0.12)', color: '#5A7D5A' }}
                >
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gray-500">
                    Industry partner
                  </p>
                  <h3 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight" style={{ color: '#1C1917' }}>
                    HEVACRAZ
                  </h3>
                </div>
              </div>

              <dl className="space-y-5 text-sm sm:text-[15px]">
                <div>
                  <dt className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gray-500">
                    Full name
                  </dt>
                  <dd className="mt-1.5 text-gray-700 leading-relaxed">
                    HVAC-R Association of Zimbabwe
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gray-500">
                    Role
                  </dt>
                  <dd className="mt-1.5 text-gray-700 leading-relaxed">
                    Professional body representing refrigeration and air-conditioning technicians,
                    engineers, and training centres across Zimbabwe.
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gray-500">
                    Role on the platform
                  </dt>
                  <dd className="mt-1.5 text-gray-700 leading-relaxed">
                    Industry partner, technician registry, training and certification delivery, and
                    professional standards.
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4 — What the Platform Does */}
      <section
        className="relative py-20 sm:py-24 overflow-hidden"
        style={{ backgroundColor: '#1C1917' }}
      >
        <div
          aria-hidden
          className="absolute -top-40 -right-32 w-[640px] h-[640px] opacity-[0.08] pointer-events-none"
          style={{ background: 'radial-gradient(closest-side, #D97706, transparent 70%)' }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(217,119,6,0.5), transparent)' }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 sm:mb-16 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div className="max-w-2xl">
              <p className="text-[#D97706] text-xs font-semibold tracking-[0.24em] uppercase mb-3">
                What the Platform Does
              </p>
              <h2 className="text-3xl sm:text-4xl md:text-[2.75rem] font-bold tracking-tight text-white">
                Five functions, one unified system
              </h2>
              <p className="mt-5 text-base sm:text-lg text-white/60 leading-relaxed">
                Every component runs on a single database with unified authentication, so the NOU
                sees every handler, every certification, and every refrigerant kilogram in one view.
              </p>
            </div>
            <div
              className="shrink-0 inline-flex items-center gap-3 text-[11px] font-semibold text-white/50 uppercase tracking-[0.24em]"
              aria-hidden
            >
              <span className="w-12 h-px" style={{ backgroundColor: '#D97706' }} />
              <span>01 &rarr; 05</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 sm:gap-5">
            {PLATFORM_CAPABILITIES.map((item, idx) => {
              const num = String(idx + 1).padStart(2, '0');
              const spanClass =
                idx < 3
                  ? 'lg:col-span-2'
                  : 'lg:col-span-3';
              const mdSpanClass = idx === 2 ? 'md:col-span-2' : '';
              return (
                <article
                  key={item.title}
                  className={`group relative p-6 sm:p-8 border transition-all duration-300 hover:bg-white/[0.04] hover:border-[#D97706]/40 hover:-translate-y-0.5 ${mdSpanClass} ${spanClass}`}
                  style={{
                    borderColor: 'rgba(255,255,255,0.12)',
                    backgroundColor: 'rgba(255,255,255,0.02)',
                  }}
                >
                  {/* Large decorative numeral */}
                  <span
                    aria-hidden
                    className="pointer-events-none select-none absolute top-4 right-5 sm:top-5 sm:right-6 text-5xl sm:text-6xl font-bold tracking-tight leading-none text-white/[0.06] transition-colors duration-300 group-hover:text-[#D97706]/25"
                  >
                    {num}
                  </span>

                  {/* Top-edge accent line slides in on hover */}
                  <span
                    aria-hidden
                    className="absolute top-0 left-0 h-px w-0 transition-all duration-500 group-hover:w-full"
                    style={{ backgroundColor: '#D97706' }}
                  />

                  <div className="relative">
                    <div
                      className="inline-flex p-3 mb-5 sm:mb-6 transition-colors"
                      style={{ backgroundColor: 'rgba(217,119,6,0.12)', color: '#D97706' }}
                    >
                      {item.icon}
                    </div>

                    <p className="text-[10px] sm:text-[11px] font-semibold tracking-[0.2em] uppercase text-white/40 mb-2">
                      {item.eyebrow}
                    </p>
                    <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-tight max-w-sm">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm text-white/65 leading-relaxed max-w-md">
                      {item.body}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>

          <p className="mt-10 sm:mt-12 text-center text-sm text-white/50 max-w-2xl mx-auto leading-relaxed">
            Delivered through four modules: Commercial Refrigeration Sizing Tool,
            Refrigerant Charge and Recovery Tracking Register, RAC Technician Learning Hub, and the
            National RAC Technician Verification and Competency Registry.
          </p>
        </div>
      </section>

      {/* Section 5 — Legal and Regulatory Framework */}
      <section className="py-20 sm:py-24" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-14">
            <p className="text-[#D97706] text-xs font-semibold tracking-[0.24em] uppercase mb-3">
              Legal and Regulatory Framework
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-[2.75rem] font-bold tracking-tight" style={{ color: '#1C1917' }}>
              The instruments behind the platform
            </h2>
            <div className="w-20 h-[3px] mx-auto mt-5" style={{ backgroundColor: '#D97706' }} />
          </div>

          <ul className="space-y-3 sm:space-y-4">
            {LEGAL_FRAMEWORK.map((item, idx) => {
              const open = openLegal === idx;
              return (
                <li key={item.title}>
                  <div
                    className={`border overflow-hidden bg-white transition-all duration-200 ${
                      open ? 'shadow-md' : 'hover:shadow-sm'
                    }`}
                    style={{ borderColor: open ? 'rgba(217,119,6,0.45)' : '#E7E5E4' }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenLegal(open ? null : idx)}
                      aria-expanded={open}
                      className="w-full px-5 sm:px-6 py-5 text-left flex justify-between items-center gap-4 transition-colors hover:bg-gray-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D97706]"
                    >
                      <span className="flex items-center gap-4 min-w-0">
                        <span
                          className="shrink-0 inline-flex p-2"
                          style={{ backgroundColor: 'rgba(217,119,6,0.1)', color: '#D97706' }}
                        >
                          {item.icon}
                        </span>
                        <span
                          className="font-semibold text-base sm:text-lg tracking-tight truncate"
                          style={{ color: '#1C1917' }}
                        >
                          {item.title}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 flex items-center justify-center w-8 h-8 transition-all duration-300 ${
                          open ? 'text-white rotate-90' : 'bg-[#FAFAF9] text-[#D97706]'
                        }`}
                        style={open ? { backgroundColor: '#D97706' } : undefined}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </button>
                    <div
                      className={`grid transition-all duration-300 ${
                        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="px-5 sm:px-6 pb-5 text-sm sm:text-[15px] text-gray-600 leading-relaxed">
                          {item.body}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="mt-10 text-center text-sm text-gray-500">
            External references:{' '}
            <a
              href="https://ozone.unep.org/treaties/montreal-protocol"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold hover:underline"
              style={{ color: '#D97706' }}
            >
              Montreal Protocol
              <ExternalLink className="h-3 w-3" />
            </a>
            {' · '}
            <a
              href="https://www.unep.org/ozonaction"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold hover:underline"
              style={{ color: '#D97706' }}
            >
              UNEP OzonAction
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
      </section>

      {/* Section 6 — Partners and Acknowledgements */}
      <section className="py-20 sm:py-24" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-14">
            <p className="text-[#D97706] text-xs font-semibold tracking-[0.24em] uppercase mb-3">
              Partners and Acknowledgements
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-[2.75rem] font-bold tracking-tight" style={{ color: '#1C1917' }}>
              Backed by the institutions that matter
            </h2>
            <div className="w-20 h-[3px] mx-auto mt-5" style={{ backgroundColor: '#D97706' }} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {PARTNERS.map((p) => (
              <div
                key={p.name}
                className="group bg-white border p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-[#D97706]/40"
                style={{ borderColor: '#E5E0DB' }}
              >
                <div
                  className="inline-flex p-2.5 mb-4 transition-colors group-hover:bg-[#D97706]/10"
                  style={{ backgroundColor: '#FAFAF9', color: '#5A7D5A' }}
                >
                  {p.logo ? (
                    <Image src={p.logo} alt={p.name} width={24} height={24} className="h-6 w-6 rounded-full object-cover" />
                  ) : (
                    <span className="transition-colors group-hover:text-[#D97706]">{p.icon}</span>
                  )}
                </div>
                <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gray-500">
                  {p.role}
                </p>
                <p className="mt-1.5 text-base font-bold tracking-tight leading-snug" style={{ color: '#1C1917' }}>
                  {p.name}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-10 text-center text-sm text-gray-500 max-w-2xl mx-auto leading-relaxed">
            This platform operationalises Zimbabwe’s international commitments under the Montreal
            Protocol and the Kigali Amendment.
          </p>
        </div>
      </section>

      {/* Section 7 — Contact */}
      <section className="py-20 sm:py-24" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 sm:mb-14 max-w-2xl">
            <p className="text-[#D97706] text-xs font-semibold tracking-[0.24em] uppercase mb-3">
              Contact
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-[2.75rem] font-bold tracking-tight" style={{ color: '#1C1917' }}>
              Get in touch with the right desk
            </h2>
            <p className="mt-5 text-gray-600 leading-relaxed text-base sm:text-lg">
              Route your question to the desk that can actually action it.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {CONTACTS.map((c) => (
              <div
                key={c.email}
                className="group flex flex-col bg-white border p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-[#D97706]/40"
                style={{ borderColor: '#E5E0DB' }}
              >
                <div
                  className="inline-flex p-2.5 mb-5 self-start transition-colors group-hover:bg-[#D97706]/10"
                  style={{ backgroundColor: '#FAFAF9', color: '#5A7D5A' }}
                >
                  <Mail className="h-5 w-5 transition-colors group-hover:text-[#D97706]" />
                </div>
                <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gray-500">
                  {c.label}
                </p>
                <p className="mt-1.5 text-base font-bold tracking-tight" style={{ color: '#1C1917' }}>
                  {c.purpose}
                </p>
                {'address' in c && c.address && (
                  <p className="mt-3 text-xs leading-5 text-gray-500">{c.address}</p>
                )}
                {'phone' in c && c.phone && (
                  <p className="mt-2 text-xs font-semibold text-gray-600">Tel: {c.phone}</p>
                )}
                <a
                  href={`mailto:${c.email}`}
                  className="mt-auto pt-5 inline-flex items-center gap-1.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] focus-visible:ring-offset-2"
                  style={{ color: '#D97706' }}
                >
                  {c.email}
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </a>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Link
              href="/verify-technician"
              className="group inline-flex items-center justify-center gap-2 font-semibold py-4 px-8 text-base text-white shadow-sm hover:shadow-xl hover:brightness-110 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] focus-visible:ring-offset-2"
              style={{ backgroundColor: '#D97706' }}
            >
              Verify a Technician
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 border font-medium py-4 px-8 text-base transition-colors hover:bg-[#FAFAF9] hover:border-[#D97706]/40"
              style={{ borderColor: '#E5E0DB', color: '#1C1917' }}
            >
              General Contact Form
            </Link>
          </div>
        </div>
      </section>

      <FinalCTA />
    </div>
  );
}
