'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass shadow-sm py-3' : 'bg-transparent py-5'
      }`}
    >
      <nav className="max-w-6xl mx-auto px-6 flex items-center justify-between">
        <Link href="/" className="flex items-baseline gap-0">
          <span
            className="text-xl font-bold text-[#8BB06A]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            pistazz
          </span>
          <span
            className="text-xl font-bold text-[#1C1F1A]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            .io
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {[
            { label: 'Features', href: '#features' },
            { label: 'So funktionierts', href: '#how-it-works' },
            { label: 'Preise', href: '#preise' },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[#1C1F1A]/70 hover:text-[#8BB06A] transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        <Link
          href="/register"
          className="gradient-primary text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity shadow-sm"
        >
          Demo buchen
        </Link>
      </nav>
    </header>
  )
}
