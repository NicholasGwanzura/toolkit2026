'use client';

import { useState } from 'react';
import { ArrowRight, GraduationCap, Wrench, Factory, HelpCircle } from 'lucide-react';
import { FinalCTA } from '@/components/marketing/FinalCTA';

type Category = 'general' | 'students' | 'technicians' | 'suppliers';

type FAQ = {
  category: Category;
  question: string;
  answer: string;
};

const FAQS: FAQ[] = [
  // General
  {
    category: 'general',
    question: 'How do I become a certified HEVACRAZ member?',
    answer:
      'Register on our platform, submit your qualifications, and complete the verification process. Once approved, you receive your certification and access to all member tools. Start at the Join page to pick the right track for you.',
  },
  {
    category: 'general',
    question: 'Is my personal data secure?',
    answer:
      'Yes. Personal data is encrypted at rest and in transit, and only authorised HEVACRAZ and NOU reviewers can access your registry record. You can request a full data export or deletion at any time.',
  },

  // Students
  {
    category: 'students',
    question: 'Who qualifies for the $7/year Student plan?',
    answer:
      'Any student currently enrolled at a recognised Polytechnic in Zimbabwe studying HVAC-R, refrigeration, or a related discipline. You will be asked to upload a valid student ID and proof of enrolment during sign-up. Student accounts are verified annually and must be renewed each academic year.',
  },
  {
    category: 'students',
    question: 'What is included in the Student plan?',
    answer:
      'Learning Hub access, the sizing tool, the field toolkit, a basic student registry listing, an entry-level certification path, and discounted pricing on public training sessions. You can upgrade to Professional at any time once you graduate.',
  },
  {
    category: 'students',
    question: 'Can I upgrade from Student to Professional when I graduate?',
    answer:
      'Yes. When your Polytechnic enrolment ends, you can upgrade in-dashboard. CPD credits earned during your student year carry over and count toward your Professional certification assessment. You will be prompted to upload graduation evidence.',
  },
  {
    category: 'students',
    question: 'What happens at the end of each academic year?',
    answer:
      'We verify continued enrolment 30 days before your Student plan anniversary. Upload a fresh student ID or transcript to extend the $7/year pricing. If enrolment has ended, the account converts to a read-only state until you either upgrade to Professional or apply for a different tier.',
  },
  {
    category: 'students',
    question: 'Do I get access to the Certificate of Conformity (COC) tool?',
    answer:
      'Not under the Student plan. COC issuance requires Professional-tier certification so the signing technician carries full legal responsibility. Students can shadow COC work, submit practice entries, and review completed COCs through the Learning Hub.',
  },

  // Technicians
  {
    category: 'technicians',
    question: 'What is a COC and when do I need one?',
    answer:
      'A Certificate of Conformity (COC) is a mandatory document that verifies your HVAC-R installation meets Zimbabwean safety and quality standards. It is required for all new installations, modifications, and certain maintenance work involving regulated refrigerants.',
  },
  {
    category: 'technicians',
    question: 'What refrigerants can I legally handle after certification?',
    answer:
      'Certification levels determine the refrigerant classes you are authorised to handle, from lower-GWP A1 synthetics through to flammable hydrocarbons (A3) and ammonia. The Learning Hub and assessments cover each class. The NOU (National Ozone Unit) oversees compliance with the Montreal Protocol and Kigali Amendment requirements.',
  },
  {
    category: 'technicians',
    question: 'How long does certification approval take?',
    answer:
      'Straightforward applications with complete documentation are typically reviewed within 5 to 7 working days. Applications requiring additional evidence or on-site assessment can take up to 21 working days. You can track live status from your dashboard.',
  },
  {
    category: 'technicians',
    question: 'How does the technician registry help me find clients?',
    answer:
      'The public registry is searchable by potential clients seeking verified HVAC-R professionals. Having a complete profile with certifications and reviews significantly increases your visibility and credibility. Businesses verify registry standing before awarding contracts.',
  },
  {
    category: 'technicians',
    question: 'What happens if my certification expires?',
    answer:
      'You receive reminder emails 60, 30, and 7 days before expiry. Once expired, your public registry listing is marked inactive and you lose access to COC issuance and compliance-gated tools until you renew. Renewal requires CPD credits earned through the Learning Hub.',
  },
  {
    category: 'technicians',
    question: 'Do I need formal qualifications to join as a Professional?',
    answer:
      'The Professional tier requires either a recognised trade qualification OR demonstrated experience verified through our assessment process. Apprentices and self-taught technicians can start with the Student tier (if enrolled) or apply directly for assessment, then progress to Professional as they build CPD credits.',
  },
  {
    category: 'technicians',
    question: 'Can I transfer a certification from another country?',
    answer:
      'Yes. Submit your existing credentials through the recognition pathway on your dashboard. The Assessment Committee reviews equivalency against Zimbabwean standards, may request a practical evaluation, and issues a transition certificate if criteria are met. Typical review time: 10 to 14 working days.',
  },

  // Suppliers
  {
    category: 'suppliers',
    question: 'How do suppliers join HEVACRAZ?',
    answer:
      'Supplier access is invitation-only. Contact HEVACRAZ to request onboarding. An administrator sends a secure link to the approved contact, who then submits company details, tax registration, NOU trading licence, and authorised product list for review. Once approved, the account unlocks the Verify Buyer tool and Reorder queue.',
  },
  {
    category: 'suppliers',
    question: 'Can suppliers sell gas to anyone who walks in?',
    answer:
      'No. Registered suppliers must use the Verify Buyer tool before any regulated-refrigerant transaction. It confirms the buyer is a HEVACRAZ-certified technician in good standing. Sales to unregistered buyers are flagged to the NOU automatically and can result in supplier sanctions.',
  },
  {
    category: 'suppliers',
    question: 'How does the two-step reorder approval work?',
    answer:
      'When you submit a refrigerant reorder request, HEVACRAZ reviews first for quota and compliance alignment. If approved, the request moves to the NOU for final sign-off on the gas type and volume. You receive status updates at each step, and the full trail is timestamped for audit purposes.',
  },
  {
    category: 'suppliers',
    question: 'What if I sell to an unregistered buyer by mistake?',
    answer:
      'If the Verify Buyer tool returned "not found" or "revoked" and the sale proceeded anyway, the incident is logged and a compliance officer will contact you within 48 hours. First-time good-faith errors usually result in a training requirement; repeated or wilful sales trigger NOU sanctions and possible de-listing from the supplier directory.',
  },
  {
    category: 'suppliers',
    question: 'What documentation is required to keep supplier status?',
    answer:
      'An annual NOU trading licence renewal, up-to-date insurance, proof of proper refrigerant storage and disposal practices, and clean standing in the reorder audit log. We review supplier credentials every 12 months; lapsed documentation pauses your ability to transact until resolved.',
  },
];

const CATEGORIES: { id: Category | 'all'; label: string; icon?: React.ReactNode; accent?: string }[] = [
  { id: 'all', label: 'All questions', icon: <HelpCircle className="h-3.5 w-3.5" /> },
  { id: 'students', label: 'Students', icon: <GraduationCap className="h-3.5 w-3.5" />, accent: '#5A7D5A' },
  { id: 'technicians', label: 'Technicians', icon: <Wrench className="h-3.5 w-3.5" />, accent: '#D97706' },
  { id: 'suppliers', label: 'Suppliers', icon: <Factory className="h-3.5 w-3.5" />, accent: '#1C1917' },
];

const SECTION_META: Record<
  Category,
  { label: string; accent: string; icon: React.ReactNode; blurb: string }
> = {
  general: {
    label: 'General',
    accent: '#6B7280',
    icon: <HelpCircle className="h-4 w-4" />,
    blurb: 'Basics that apply to every member.',
  },
  students: {
    label: 'For Students',
    accent: '#5A7D5A',
    icon: <GraduationCap className="h-4 w-4" />,
    blurb: 'Polytechnic students on the $7/year track.',
  },
  technicians: {
    label: 'For Technicians',
    accent: '#D97706',
    icon: <Wrench className="h-4 w-4" />,
    blurb: 'Certification, COCs, registry, and renewals.',
  },
  suppliers: {
    label: 'For Suppliers',
    accent: '#1C1917',
    icon: <Factory className="h-4 w-4" />,
    blurb: 'Buyer verification, reorders, and compliance.',
  },
};

const SECTION_ORDER: Category[] = ['general', 'students', 'technicians', 'suppliers'];

export default function FaqPage() {
  const [filter, setFilter] = useState<Category | 'all'>('all');
  const [openKey, setOpenKey] = useState<string | null>(null);

  const visibleCategories = SECTION_ORDER.filter((c) => (filter === 'all' ? true : filter === c));

  return (
    <div style={{ backgroundColor: '#ffffff' }}>
      {/* Hero */}
      <section className="pt-28 sm:pt-32 pb-14 sm:pb-16 relative overflow-hidden" style={{ backgroundColor: '#ffffff' }}>
        <div
          aria-hidden
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[640px] h-[200px] opacity-[0.08] pointer-events-none blur-3xl"
          style={{ background: 'radial-gradient(closest-side, #D97706, transparent 70%)' }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-[#D97706] text-xs font-semibold tracking-[0.24em] uppercase mb-3">Support</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.08]" style={{ color: '#1C1917' }}>
            Frequently Asked Questions
          </h1>
          <p className="mt-5 text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Answers organised by who you are. Jump to students, technicians, or suppliers, or browse
            everything.
          </p>
        </div>
      </section>

      {/* Category chips */}
      <div className="sticky top-[72px] sm:top-[80px] z-30 bg-white/95 backdrop-blur-sm border-b" style={{ borderColor: '#E5E0DB' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-none">
            {CATEGORIES.map((c) => {
              const active = filter === c.id;
              const accent = c.accent ?? '#1C1917';
              return (
                <button
                  key={c.id}
                  onClick={() => setFilter(c.id)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium transition-all border ${
                    active ? 'text-white shadow-sm' : 'text-[#1C1917]/80 hover:text-[#1C1917] hover:bg-[#FAFAF9]'
                  }`}
                  style={{
                    backgroundColor: active ? accent : 'white',
                    borderColor: active ? accent : '#E5E0DB',
                  }}
                  aria-pressed={active}
                >
                  {c.icon}
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* FAQ sections */}
      <section className="py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-14">
          {visibleCategories.map((cat) => {
            const meta = SECTION_META[cat];
            const items = FAQS.filter((f) => f.category === cat);
            if (items.length === 0) return null;
            return (
              <section key={cat} id={cat} aria-labelledby={`heading-${cat}`}>
                <header className="mb-6 flex items-start gap-3">
                  <span
                    className="shrink-0 inline-flex p-2 mt-0.5"
                    style={{ backgroundColor: `${meta.accent}15`, color: meta.accent }}
                  >
                    {meta.icon}
                  </span>
                  <div>
                    <h2
                      id={`heading-${cat}`}
                      className="text-xl sm:text-2xl font-bold tracking-tight"
                      style={{ color: '#1C1917' }}
                    >
                      {meta.label}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">{meta.blurb}</p>
                  </div>
                </header>

                <ul className="space-y-3 sm:space-y-4">
                  {items.map((faq, idx) => {
                    const key = `${cat}-${idx}`;
                    const open = openKey === key;
                    return (
                      <li key={key}>
                        <div
                          className={`border overflow-hidden bg-white transition-all duration-200 ${
                            open ? 'shadow-md' : 'hover:shadow-sm'
                          }`}
                          style={{ borderColor: open ? meta.accent + '55' : '#E7E5E4' }}
                        >
                          <button
                            onClick={() => setOpenKey(open ? null : key)}
                            className="w-full px-5 sm:px-6 py-5 text-left flex justify-between items-center gap-4 transition-colors hover:bg-gray-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset"
                            style={open ? { outlineColor: meta.accent } : undefined}
                            aria-expanded={open}
                          >
                            <span className="font-semibold text-base sm:text-lg tracking-tight" style={{ color: '#1C1917' }}>
                              {faq.question}
                            </span>
                            <span
                              className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${
                                open ? 'text-white rotate-90' : 'bg-[#FAFAF9] text-[#D4A574]'
                              }`}
                              style={open ? { backgroundColor: meta.accent } : undefined}
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
              </section>
            );
          })}

          {visibleCategories.length === 0 && (
            <p className="text-center text-gray-500 py-12">No questions in this category yet.</p>
          )}

          <p className="text-center text-sm text-gray-500 pt-4">
            Still have questions?{' '}
            <a href="/contact" className="font-semibold hover:underline" style={{ color: '#D97706' }}>
              Contact us
            </a>
            .
          </p>
        </div>
      </section>

      <FinalCTA />
    </div>
  );
}
