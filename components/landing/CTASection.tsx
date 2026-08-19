'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useLang } from '@/lib/lang-context'
import { useIndustryT } from './IndustryContext'

export function CTASection() {
  const { t } = useIndustryT()
  const c = t.cta

  return (
    <section className="py-14 md:py-20 px-4 md:px-6 bg-[#1C1F1A]">
      <div className="max-w-3xl mx-auto">
        <motion.div
          className="relative gradient-primary rounded-2xl p-8 md:p-12 text-center shadow-2xl shadow-[var(--ind-primary)]/20 overflow-hidden"
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10 pointer-events-none"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-white/08 pointer-events-none"
            animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          />

          <div className="relative z-10">
            <h2 className="text-2xl md:text-3xl text-white font-bold mb-1" style={{ fontFamily: 'DM Serif Display, serif' }}>
              {c.h2}
            </h2>
            <p className="text-white/75 text-sm md:text-base font-semibold mb-1">{c.sub}</p>
            <p className="text-white/55 text-sm mb-6">{c.p}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-white text-[var(--ind-primary-dark)] font-bold px-8 py-3.5 rounded-full hover:shadow-xl hover:scale-105 active:scale-[0.98] transition-all duration-200 text-sm md:text-base whitespace-nowrap"
              >
                {c.btn}
              </Link>
              <Link
                href="/anfrage"
                className="inline-flex items-center gap-2 bg-white/15 border border-white/30 text-white font-semibold px-6 py-3.5 rounded-full hover:bg-white/25 transition-all duration-200 text-sm whitespace-nowrap"
              >
                🏪 Für mein Restaurant anfragen
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
