'use client'

import { motion } from 'framer-motion'
import { useLang } from '@/lib/lang-context'

export function GuaranteeSection() {
  const { t } = useLang()
  const g = t.guarantee

  return (
    <section className="py-16 md:py-20 px-4 md:px-6 bg-[#F5F2EC]">
      <div className="max-w-4xl mx-auto">
        <motion.div
          className="bg-white border border-[#E5E0D5] rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 md:gap-12 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {/* Badge */}
          <div className="shrink-0">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg viewBox="0 0 144 144" className="absolute inset-0 w-full h-full">
                <circle cx="72" cy="72" r="68" fill="none" stroke="var(--ind-primary)" strokeWidth="2" strokeDasharray="6 4" />
                <circle cx="72" cy="72" r="56" fill="var(--ind-primary)" />
              </svg>
              <div className="relative z-10 text-center">
                <p className="text-white text-4xl font-bold leading-none" style={{ fontFamily: 'DM Serif Display, serif' }}>90</p>
                <p className="text-white/80 text-[10px] uppercase tracking-widest font-bold mt-0.5">{g.days}</p>
              </div>
            </div>
          </div>

          {/* Text */}
          <div className="text-center md:text-left">
            <span className="text-[var(--ind-primary)] font-bold text-xs uppercase tracking-widest">{g.label}</span>
            <h2 className="text-2xl md:text-4xl text-[#1C1F1A] mt-2 leading-tight" style={{ fontFamily: 'DM Serif Display, serif' }}>
              {g.h2}
            </h2>
            <p className="text-[#1C1F1A]/55 text-sm md:text-base mt-3 leading-relaxed max-w-lg">
              {g.p}
            </p>
            <div className="mt-5 flex flex-wrap gap-3 justify-center md:justify-start">
              {g.items.map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-[var(--ind-surface-soft)] rounded-full px-4 py-1.5">
                  <span className="text-[var(--ind-primary)] text-sm">✓</span>
                  <span className="text-sm text-[#1C1F1A]/70 font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
