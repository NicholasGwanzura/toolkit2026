import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative text-white" style={{ backgroundColor: '#1C1917' }}>
      {/* Top accent line */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(217,119,6,0.5), transparent)',
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-12">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <img
                src="/logos/ministry-of-environment.jpeg"
                alt="Ministry of Environment, Climate and Wildlife"
                className="h-9 w-9 rounded-full object-cover"
              />
              <span className="h-7 w-px bg-white/20" />
              <img
                src="/logos/hevacraz-logo.jpeg"
                alt="HEVACRAZ"
                className="h-9 w-9 rounded-full object-cover transition-transform duration-300 group-hover:-rotate-6"
              />
            </Link>
            <p className="mt-4 text-gray-400 text-sm leading-relaxed max-w-sm">
              Advance the HVAC-R profession in Zimbabwe through education, certification, and advocacy.
            </p>
            <div className="mt-5 space-y-1.5 text-sm text-gray-400">
              <a href="mailto:info@hevacraz.co.zw" className="block hover:text-white transition-colors">info@hevacraz.co.zw</a>
              <a href="mailto:compliance@hevacraz.co.zw" className="block hover:text-white transition-colors">compliance@hevacraz.co.zw</a>
              <a href="tel:+263772630517" className="block hover:text-white transition-colors">+263 772 630 517</a>
              <a href="tel:+263773034528" className="block hover:text-white transition-colors">+263 773 034 528</a>
              <a href="tel:+263778410281" className="block hover:text-white transition-colors">NOU: +263 778 410 281</a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold mb-4 uppercase tracking-[0.2em] text-white/60">
              Navigate
            </h4>
            <ul className="space-y-3">
              {[
                { href: '/about', label: 'About' },
                { href: '/membership', label: 'Membership' },
                { href: '/training', label: 'Training' },
                { href: '/contact', label: 'Contact' },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors group"
                  >
                    <span>{l.label}</span>
                    <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-xs font-semibold mb-4 uppercase tracking-[0.2em] text-white/60">
              Resources
            </h4>
            <ul className="space-y-3">
              {[
                { href: '/faq', label: 'FAQ' },
                { href: '/for-businesses', label: 'For Businesses' },
                { href: '/for-suppliers', label: 'For Suppliers' },
                { href: '/login', label: 'Portal Login' },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors group"
                  >
                    <span>{l.label}</span>
                    <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-14 pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <p>&copy; {year} HEVACRAZ. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/privacy#cookies" className="hover:text-white transition-colors">Cookies</Link>
            <a href="/fonts/honor-sans/LICENSE.txt" className="hover:text-white transition-colors">Font: HONOR Sans © Honor Device Co., Ltd.</a>
          </div>
        </div>

        <div className="mt-5 flex justify-center sm:justify-end">
            <a
              href="https://spiritusglobal.tech"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Developer: Spiritus (opens in a new tab)"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs text-gray-400 transition-colors hover:border-amber-400/50 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
            >
              <span className="text-gray-500">Developer</span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-gray-200">Spiritus</span>
            </a>
        </div>
      </div>
    </footer>
  );
}
