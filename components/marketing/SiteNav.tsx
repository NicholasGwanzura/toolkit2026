'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ArrowRight } from 'lucide-react';

const PRIMARY_LINKS = [
  { name: 'About', href: '/about' },
  { name: 'Membership', href: '/membership' },
  { name: 'Training', href: '/training' },
  { name: 'FAQ', href: '/faq' },
  { name: 'Contact', href: '/contact' },
];

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navHeight, setNavHeight] = useState(72);
  const pathname = usePathname();
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!navRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setNavHeight(entry.contentRect.height);
    });
    observer.observe(navRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [mobileMenuOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const navClass = scrolled
    ? 'fixed w-full z-50 transition-all duration-300 backdrop-blur-md bg-white/90 shadow-[0_1px_0_0_rgba(0,0,0,0.04),0_4px_20px_-6px_rgba(0,0,0,0.08)] py-3'
    : 'fixed w-full z-50 transition-all duration-300 bg-white/95 backdrop-blur-sm py-4';

  return (
    <>
      <nav ref={navRef} className={navClass} aria-label="Primary navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <Link
              href="/"
              className="group flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] focus-visible:ring-offset-2"
              aria-label="HEVACRAZ home"
            >
              <div className="flex items-center gap-2.5">
                <img
                  src="/logos/ministry-of-environment.jpeg"
                  alt="Ministry of Environment, Climate and Wildlife"
                  className="h-9 w-9 rounded-full object-cover"
                />
                <span className="h-7 w-px bg-gray-300" />
                <img
                  src="/logos/hevacraz-logo.jpeg"
                  alt="HEVACRAZ"
                  className="h-9 w-9 rounded-full object-cover transition-transform duration-300 group-hover:-rotate-6"
                />
              </div>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">
              {PRIMARY_LINKS.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className={`relative font-medium text-sm px-3 py-2 rounded-sm transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] focus-visible:ring-offset-2 ${
                      active ? 'text-[#1C1917]' : 'text-[#1C1917]/80 hover:text-[#1C1917]'
                    }`}
                  >
                    {link.name}
                    <span
                      className={`pointer-events-none absolute left-3 right-3 -bottom-0.5 h-[2px] transition-all duration-300 ${
                        active ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
                      }`}
                      style={{ backgroundColor: '#D97706', transformOrigin: 'left' }}
                    />
                  </Link>
                );
              })}

            </div>

            {/* Right CTAs (desktop). The homepage hero carries Join and Sign in, so its header offers verification. */}
            <div className="hidden lg:flex items-center gap-2">
              {pathname === '/' ? (
              <Link
                href="/verify-technician"
                className="group inline-flex items-center gap-1.5 font-semibold py-2.5 px-5 text-sm text-white transition-all duration-200 shadow-sm hover:shadow-md hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] focus-visible:ring-offset-2"
                style={{ backgroundColor: '#B45309' }}
              >
                Verify a Technician
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
              ) : (
              <>
              <Link
                href="/login"
                className="font-medium text-sm px-3 py-2 rounded-sm transition-colors text-[#1C1917]/90 hover:text-[#1C1917] hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] focus-visible:ring-offset-2"
              >
                Sign in
              </Link>
              <Link
                href="/join"
                className="group inline-flex items-center gap-1.5 font-semibold py-2.5 px-5 text-sm text-white transition-all duration-200 shadow-sm hover:shadow-md hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] focus-visible:ring-offset-2"
                style={{ backgroundColor: '#D97706' }}
              >
                Join Now
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
              </>
              )}
            </div>

            {/* Mobile hamburger */}
            <div className="lg:hidden">
              <button
                onClick={() => setMobileMenuOpen((v) => !v)}
                className="p-3 transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
                style={{ color: '#1C1917' }}
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-[fadeIn_180ms_ease-out]"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            className="lg:hidden fixed left-0 right-0 z-50 bg-white border-t overflow-y-auto animate-[slideDown_220ms_ease-out]"
            style={{ top: navHeight, maxHeight: `calc(100vh - ${navHeight}px)` }}
            role="dialog"
            aria-label="Mobile navigation"
          >
            <div className="max-w-7xl mx-auto px-4 py-2">
              <ul className="divide-y divide-gray-100">
                {PRIMARY_LINKS.map((link) => {
                  const active = pathname === link.href;
                  return (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between py-4 font-medium text-base transition-colors ${
                          active ? 'text-[#D97706]' : 'text-[#1C1917]'
                        }`}
                      >
                        <span>{link.name}</span>
                        <ArrowRight className={`h-4 w-4 ${active ? 'text-[#D97706]' : 'text-gray-300'}`} />
                      </Link>
                    </li>
                  );
                })}
                <li>
                  <Link
                    href="/verify-technician"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between py-4 font-medium text-base text-[#1C1917]"
                  >
                    <span>Verify a Technician</span>
                    <ArrowRight className="h-4 w-4 text-gray-300" />
                  </Link>
                </li>
                <li>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between py-4 font-medium text-base text-[#1C1917]"
                  >
                    <span>Sign in</span>
                    <ArrowRight className="h-4 w-4 text-gray-300" />
                  </Link>
                </li>
              </ul>

              <div className="mt-3 grid grid-cols-1 gap-3 pb-5">
                <Link
                  href="/join"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex items-center justify-center gap-2 w-full font-semibold py-4 px-5 text-base text-white transition-all shadow-sm hover:brightness-110"
                  style={{ backgroundColor: '#D97706' }}
                >
                  Join HEVACRAZ
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/contact"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center font-medium py-3 px-5 text-sm border transition-colors hover:bg-[#FAFAF9] text-gray-600"
                  style={{ borderColor: '#E5E0DB' }}
                >
                  Supplier onboarding
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
