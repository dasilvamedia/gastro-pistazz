'use client'

import { motion } from 'framer-motion'
import { useLang } from '@/lib/lang-context'
import { useIndustryT } from './IndustryContext'
import Link from 'next/link'

export function PricingSection() {
  const { t } = useIndustryT()
  const p = t.pricing

  return (
    <section id="preise" className="py-24 md:py-32 px-4 md:px-6 bg-[#F5F2EC]">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <motion.div
          className="text-center mb-16 md:mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block text-[var(--ind-primary-dark)] font-semibold text-xs uppercase tracking-[0.18em] mb-4">
            {p.label}
          </span>
          <h2
            className="text-4xl md:text-6xl text-[#1C1F1A] leading-tight mb-5"
            style={{ fontFamily: 'DM Serif Display, serif' }}
          >
            {p.h2}
          </h2>
          <p className="text-[#1C1F1A]/55 text-base md:text-lg max-w-lg mx-auto leading-relaxed">
            {p.sub}
          </p>
          <div className="mt-6 inline-flex items-center gap-2 bg-white border border-[var(--ind-primary)]/30 rounded-full px-5 py-2 shadow-sm">
            <span className="text-2xl font-bold text-[var(--ind-primary-dark)]" style={{ fontFamily: 'DM Serif Display, serif' }}>90</span>
            <span className="text-sm text-[#1C1F1A]/60 font-medium">{p.guarantee}</span>
          </div>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 items-stretch">
          {p.plans.map((plan, i) => (
            <motion.div
              key={i}
              className="relative pt-5"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.1 }}
            >
              {/* Badge — sits above the card, outside overflow-hidden */}
              {plan.badge && (
                <div className="absolute top-0 inset-x-0 flex justify-center z-20">
                  <span className="bg-[var(--ind-primary)] text-white text-xs font-bold px-5 py-1.5 rounded-full shadow-sm">
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Card body */}
              <div className={`relative flex flex-col h-full rounded-2xl overflow-hidden ${
                plan.featured
                  ? 'bg-[#1C1F1A] text-white shadow-2xl shadow-[#1C1F1A]/20 ring-2 ring-[var(--ind-primary)]'
                  : 'bg-white text-[#1C1F1A] border border-[#E5E0D5]'
              }`}>
                <div className="p-6 md:p-7 flex flex-col flex-1">
                  {/* Plan name + price */}
                  <div className="mb-6 mt-1">
                    <p className="text-xs font-bold uppercase tracking-widest mb-3 text-[var(--ind-primary)]">
                      {plan.name}
                    </p>
                    <div className="flex items-end gap-1.5 mb-3">
                      <span
                        className={`text-5xl font-bold leading-none ${plan.featured ? 'text-white' : 'text-[#1C1F1A]'}`}
                        style={{ fontFamily: 'DM Serif Display, serif' }}
                      >
                        {plan.price}
                      </span>
                      <span className={`text-sm pb-1 ${plan.featured ? 'text-white/40' : 'text-[#1C1F1A]/35'}`}>
                        {p.perMonth}
                      </span>
                    </div>
                    <p className={`text-sm leading-relaxed ${plan.featured ? 'text-white/60' : 'text-[#1C1F1A]/50'}`}>
                      {plan.description}
                    </p>
                  </div>

                  {/* Divider */}
                  <div className={`h-px mb-6 ${plan.featured ? 'bg-white/10' : 'bg-[#E5E0D5]'}`} />

                  {/* Features */}
                  <ul className="space-y-3 flex-1 mb-7">
                    {plan.features.map((f, fi) => (
                      <li key={fi} className="flex items-start gap-3">
                        <span className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          plan.featured
                            ? 'bg-[var(--ind-primary)]/20 text-[var(--ind-primary)]'
                            : 'bg-[var(--ind-primary-pale)] text-[var(--ind-primary-dark)]'
                        }`}>
                          ✓
                        </span>
                        <span className={`text-sm leading-snug ${plan.featured ? 'text-white/75' : 'text-[#1C1F1A]/65'}`}>
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link
                    href="/register"
                    className={`block w-full text-center py-3.5 rounded-xl text-sm font-bold transition-all duration-200 whitespace-nowrap ${
                      plan.featured
                        ? 'bg-[var(--ind-primary)] text-white hover:bg-[var(--ind-primary-dark)] shadow-lg shadow-[var(--ind-primary)]/25'
                        : 'bg-[var(--ind-surface-soft)] text-[var(--ind-primary-dark)] hover:bg-[var(--ind-surface-edge)]'
                    }`}
                  >
                    {p.ctaBtn}
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer note */}
        <motion.p
          className="text-center text-xs text-[#1C1F1A]/35 mt-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          {p.footer}
        </motion.p>
      </div>
    </section>
  )
}
