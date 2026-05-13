'use client'

import Link from 'next/link'
import { useLang } from '@/lib/lang-context'

export function Footer() {
  const { t } = useLang()
  const f = t.footer

  return (
    <footer className="bg-[#111310] text-white/40 py-8 px-4 md:px-6 border-t border-white/5">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-baseline gap-0">
          <span className="text-base font-bold text-[#8BB06A]" style={{ fontFamily: 'var(--font-display)' }}>
            pistazz
          </span>
          <span className="text-base font-bold text-white/20" style={{ fontFamily: 'var(--font-display)' }}>
            .io
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-xs">
          <a href="#features" className="hover:text-white transition-colors">{f.features}</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">{f.howItWorks}</a>
          <a href="#preise" className="hover:text-white transition-colors">{f.pricing}</a>
          <Link href="/datenschutz" className="hover:text-white transition-colors">{f.privacy}</Link>
          <Link href="/impressum" className="hover:text-white transition-colors">{f.imprint}</Link>
        </div>

        <p className="text-xs text-white/20">© {new Date().getFullYear()} pistazz.io</p>
      </div>
    </footer>
  )
}
