'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { FinalCTA } from '@/components/marketing/FinalCTA';

const PRICING_TIERS = [
  {
    name: 'Student',
    price: 'Free',
    description: 'For Polytechnic students',
    features: [
      'Polytechnic ID verification required',
      'Learning Hub access',
      'Sizing tool & field toolkit',
      'Basic registry listing (student)',
      'Entry-level certifications',
      'Discounted training sessions',
    ],
    cta: 'Verify Student Status',
    highlighted: false,
    badge: 'Student Special' as string | null,
  },
  {
    name: 'Professional',
    price: 'Free',
    description: 'All tools and certifications',
    features: [
      'Full registry listing',
      'All portal tools',
      'COC access',
      'Job logging',
      'Priority support',
      'Training discounts',
    ],
    cta: 'Get Started',
    highlighted: true,
    badge: 'Best Value',
  },
];

const PRICING_FAQS = [
  {
    question: 'Who qualifies for the $7/year Student plan?',
    answer: 'Any student currently enrolled at a recognised Polytechnic in Zimbabwe studying HVAC-R, refrigeration, or a related discipline. You will be asked to upload a valid student ID and proof of enrolment during sign-up. Student accounts are verified annually and must be renewed each academic year.',
  },
  {
    question: 'Do I need formal qualifications to join?',
    answer: 'Not for the Free and Student tiers. The Professional tier requires either a recognised trade qualification OR demonstrated experience verified through our assessment process. Apprentices and self-taught technicians can start with the Student or Free tier and progress to Professional as they build CPD credits.',
  },
  {
    question: 'What happens if my certification expires?',
    answer: 'You will receive reminder emails 60, 30 and 7 days before expiry. Once expired, your public registry listing is marked "inactive" and you lose access to COC issuance and compliance-gated tools until you renew. Renewal requires continuing professional development (CPD) credits earned through the Learning Hub.',
  },
  {
    question: 'How long does certification approval take?',
    answer: 'Straightforward applications with complete documentation are typically reviewed within 5-7 working days. Applications requiring additional evidence or on-site assessment can take up to 21 working days. You can track the live status of your application from your dashboard.',
  },
  {
    question: 'Is my personal data secure?',
    answer: 'Yes. Personal data is encrypted at rest and in transit, and only authorised HEVACRAZ and NOU reviewers can access your registry record. You can request a full data export or deletion at any time.',
  },
];

export default function MembershipPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div style={{ backgroundColor: '#ffffff' }}>
      {/* Page header */}
      <section className="pt-28 sm:pt-32 pb-14 sm:pb-16 relative overflow-hidden" style={{ backgroundColor: '#ffffff' }}>
        <div
          aria-hidden
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[640px] h-[200px] opacity-[0.08] pointer-events-none blur-3xl"
          style={{ background: 'radial-gradient(closest-side, #D97706, transparent 70%)' }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-[#D97706] text-xs font-semibold tracking-[0.24em] uppercase mb-3">Membership</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.08]" style={{ color: '#1C1917' }}>
            Choose Your Path
          </h1>
          <p className="mt-5 text-base sm:text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
            Free to join as a student or professional, find the path that matches where you are.
          </p>
        </div>
      </section>

      {/* Pricing tiers */}
      <section className="pb-16 sm:pb-20" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-stretch pt-4 max-w-3xl mx-auto">
            {PRICING_TIERS.map((tier, index) => (
              <div
                key={index}
                className={`group relative flex flex-col p-7 sm:p-8 border-2 transition-all duration-300 ${
                  tier.highlighted
                    ? 'md:-translate-y-3 md:shadow-xl shadow-lg'
                    : 'hover:-translate-y-1 hover:shadow-lg'
                }`}
                style={{
                  backgroundColor: tier.highlighted ? '#1C1917' : 'white',
                  borderColor: tier.highlighted ? '#D97706' : tier.name === 'Student' ? '#5A7D5A' : '#E5E0DB',
                }}
              >
                {tier.badge && (
                  <span
                    className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[11px] font-bold px-3 py-1 uppercase tracking-[0.18em] whitespace-nowrap"
                    style={{
                      backgroundColor: tier.highlighted
                        ? '#D97706'
                        : tier.name === 'Student'
                        ? '#5A7D5A'
                        : '#1C1917',
                      color: 'white',
                    }}
                  >
                    {tier.badge}
                  </span>
                )}
                <h3
                  className="text-xl sm:text-2xl font-bold tracking-tight mt-2"
                  style={{ color: tier.highlighted ? 'white' : '#1C1917' }}
                >
                  {tier.name}
                </h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <p
                    className="text-3xl sm:text-4xl font-bold tracking-tight"
                    style={{ color: tier.highlighted ? 'white' : '#1C1917' }}
                  >
                    {tier.price.split('/')[0]}
                  </p>
                  {tier.price.includes('/') && (
                    <span className={`text-sm ${tier.highlighted ? 'text-gray-400' : 'text-gray-500'}`}>
                      /{tier.price.split('/')[1]}
                    </span>
                  )}
                </div>
                <p className={`mt-2 text-sm ${tier.highlighted ? 'text-gray-300' : 'text-gray-500'}`}>
                  {tier.description}
                </p>
                <div className={`mt-6 h-px ${tier.highlighted ? 'bg-white/10' : 'bg-gray-100'}`} />
                <ul className="mt-6 space-y-3 flex-1">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <CheckCircle
                        className="h-5 w-5 shrink-0 mt-0.5"
                        style={{ color: tier.highlighted ? '#D97706' : '#5A7D5A' }}
                      />
                      <span className={`text-sm sm:text-[15px] ${tier.highlighted ? 'text-gray-200' : 'text-gray-700'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={tier.name === 'Student' ? '/join/student' : '/join'}
                  className="mt-8 inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 font-semibold transition-all duration-200 text-white text-center hover:brightness-110 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] focus-visible:ring-offset-2"
                  style={{ backgroundColor: tier.highlighted ? '#D97706' : '#1C1917' }}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-10 text-center text-sm text-gray-500">
            Membership is free. Upgrade your track any time from your dashboard.
          </p>
        </div>
      </section>

      {/* Pricing FAQs */}
      <section className="py-20 sm:py-24" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 sm:mb-16">
            <p className="text-[#D97706] text-xs font-semibold tracking-[0.24em] uppercase mb-3">FAQs</p>
            <h2 className="text-3xl sm:text-4xl md:text-[2.5rem] font-bold tracking-tight" style={{ color: '#1C1917' }}>
              Membership Questions
            </h2>
            <div className="w-20 h-[3px] mx-auto mt-5" style={{ backgroundColor: '#D97706' }} />
          </div>
          <ul className="space-y-3 sm:space-y-4">
            {PRICING_FAQS.map((faq, index) => {
              const open = openFaq === index;
              return (
                <li key={index}>
                  <div
                    className={`border overflow-hidden bg-white transition-all duration-200 ${
                      open ? 'shadow-md border-[#D97706]/30' : 'hover:shadow-sm'
                    }`}
                    style={{ borderColor: open ? 'rgba(217,119,6,0.3)' : '#E7E5E4' }}
                  >
                    <button
                      onClick={() => setOpenFaq(open ? null : index)}
                      className="w-full px-5 sm:px-6 py-5 text-left flex justify-between items-center gap-4 transition-colors hover:bg-gray-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] focus-visible:ring-inset"
                      aria-expanded={open}
                    >
                      <span className="font-semibold text-base sm:text-lg tracking-tight" style={{ color: '#1C1917' }}>
                        {faq.question}
                      </span>
                      <span
                        className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${
                          open ? 'bg-[#D97706] text-white rotate-90' : 'bg-[#FAFAF9] text-[#D4A574]'
                        }`}
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
                          {faq.answer}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <FinalCTA />
    </div>
  );
}
