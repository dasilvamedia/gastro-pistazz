'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLang } from '@/lib/lang-context'
import type { Lang } from '@/lib/translations'

const FLAGS: { lang: Lang; flag: string; label: string }[] = [
  { lang: 'de', flag: '🇩🇪', label: 'Deutsch' },
  { lang: 'pt', flag: '🇧🇷', label: 'Português' },
  { lang: 'en', flag: '🇬🇧', label: 'English' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { lang, setLang, t } = useLang()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass shadow-sm py-3' : 'bg-transparent py-4 md:py-5'
      }`}
    >
      <nav className="max-w-6xl mx-auto px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-baseline gap-0 shrink-0">
          <span className="text-xl font-bold text-[#8BB06A]" style={{ fontFamily: 'var(--font-display)' }}>
            pistazz
          </span>
          <span className="text-xl font-bold text-[#1C1F1A]" style={{ fontFamily: 'var(--font-display)' }}>
            .io
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-6 lg:gap-8">
          {[
            { label: t.nav.features, href: '#features' },
            { label: t.nav.howItWorks, href: '#how-it-works' },
            { label: t.nav.pricing, href: '#preise' },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[#1C1F1A]/70 hover:text-[#8BB06A] transition-colors whitespace-nowrap"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right side: lang switcher + CTAs */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Language switcher */}
          <div className="flex items-center gap-1 bg-white/60 backdrop-blur-sm border border-gray-100 rounded-full px-2 py-1 shadow-sm">
            {FLAGS.map(({ lang: l, flag, label }) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                title={label}
                aria-label={label}
                className={`text-base leading-none px-1 py-0.5 rounded-full transition-all duration-150 ${
                  lang === l
                    ? 'scale-110 ring-2 ring-[#8BB06A]/40 bg-[#EEF5E6]'
                    : 'opacity-60 hover:opacity-100 hover:scale-105'
                }`}
              >
                {flag}
              </button>
            ))}
          </div>

          {/* "Für Restaurants" link (desktop only) */}
          <Link
            href="/anfrage"
            className="hidden lg:inline-flex items-center border border-[#8BB06A] text-[#6D9450] text-xs font-semibold px-4 py-2 rounded-full hover:bg-[#EEF5E6] transition-colors whitespace-nowrap"
          >
            Für Restaurants
          </Link>

          {/* CTA button (desktop) */}
          <Link
            href="/register"
            className="hidden md:inline-flex gradient-primary text-white text-sm font-semibold px-4 lg:px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity shadow-sm whitespace-nowrap"
          >
            {t.nav.cta}
          </Link>

          {/* Hamburger (mobile) */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Menu"
          >
            <span className={`block w-5 h-0.5 bg-[#1C1F1A] transition-all duration-200 ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
            <span className={`block w-5 h-0.5 bg-[#1C1F1A] mt-1.5 transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-0.5 bg-[#1C1F1A] mt-1.5 transition-all duration-200 ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 glass shadow-lg border-t border-white/20 px-4 py-4 space-y-3">
          {[
            { label: t.nav.features, href: '#features' },
            { label: t.nav.howItWorks, href: '#how-it-works' },
            { label: t.nav.pricing, href: '#preise' },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block text-sm font-medium text-[#1C1F1A]/80 hover:text-[#8BB06A] transition-colors py-2"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/anfrage"
            onClick={() => setMenuOpen(false)}
            className="block border border-[#8BB06A] text-[#6D9450] text-sm font-semibold px-5 py-3 rounded-full hover:bg-[#EEF5E6] transition-colors text-center"
          >
            Für Restaurants bewerben
          </Link>
          <Link
            href="/register"
            onClick={() => setMenuOpen(false)}
            className="block gradient-primary text-white text-sm font-semibold px-5 py-3 rounded-full hover:opacity-90 transition-opacity text-center"
          >
            {t.nav.cta}
          </Link>
        </div>
      )}
    </header>
  )
}
