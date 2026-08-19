'use client'

import { motion } from 'framer-motion'
import { INDUSTRIES } from '@/lib/industries'
import { useLang } from '@/lib/lang-context'
import { useIndustry } from './IndustryContext'

const HEADLINE: Record<string, string> = {
  de: 'Nicht nur Gastro. Wähle deine Branche:',
  pt: 'Não só gastronomia. Escolha seu setor:',
  en: 'Not just hospitality. Pick your industry:',
}

const REWARD_LABEL: Record<string, string> = {
  de: 'Typische Belohnungen',
  pt: 'Recompensas típicas',
  en: 'Typical rewards',
}

/**
 * The tab bar that re-themes the whole page. Sits directly under the hero so
 * the transformation happens in view — the point is that people *see* the page
 * change, not that they read about it.
 */
export function IndustrySwitcher() {
  const { industry, copy, setIndustry } = useIndustry()
  const { lang } = useLang()

  return (
    <section className="px-5 py-9 md:py-12" aria-label="Branche wählen">
      <div className="max-w-5xl mx-auto text-center">
        <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.12em] text-[#1C1F1A]/45 mb-4">
          {HEADLINE[lang] ?? HEADLINE.de}
        </p>

        <div role="tablist" className="flex flex-wrap justify-center gap-2 md:gap-2.5">
          {INDUSTRIES.map((item) => {
            const active = item.slug === industry.slug
            return (
              <button
                key={item.slug}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setIndustry(item.slug)}
                className={`relative flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors duration-300 ${
                  active
                    ? 'text-white'
                    : 'text-[#1C1F1A]/70 hover:text-[#1C1F1A] bg-white border border-[#1C1F1A]/10'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="industry-pill"
                    className="absolute inset-0 rounded-full -z-10"
                    style={{ backgroundColor: 'var(--ind-primary)' }}
                    transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                  />
                )}
                <span aria-hidden="true">{item.emoji}</span>
                <span>{(item.copy[lang] ?? item.copy.de).label}</span>
              </button>
            )
          })}
        </div>

        {/* Rewards make the switch concrete: the page does not just change
            colour, it changes what you would actually hand your customer. */}
        <motion.div
          key={industry.slug}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mt-6"
        >
          <p className="text-[0.7rem] uppercase tracking-[0.14em] font-semibold text-[#1C1F1A]/35 mb-2.5">
            {REWARD_LABEL[lang] ?? REWARD_LABEL.de}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {copy.rewards.map((reward) => (
              <span
                key={reward}
                className="rounded-full px-3.5 py-1.5 text-xs font-semibold"
                style={{
                  backgroundColor: 'var(--ind-primary-pale)',
                  color: 'var(--ind-primary-deep)',
                  border: '1px solid var(--ind-surface-edge)',
                }}
              >
                {reward}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
