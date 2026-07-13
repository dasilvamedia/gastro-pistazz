'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLang } from '@/lib/lang-context'

function FAQItem({ q, a, isOpen, onToggle }: { q: string; a: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-[#E2EDD6] last:border-0">
      <button
        onClick={onToggle}
        className="w-full text-left py-5 flex items-start justify-between gap-4 group"
      >
        <span className="text-[#1C1F1A] font-semibold text-sm md:text-base leading-snug group-hover:text-[#6D9450] transition-colors">
          {q}
        </span>
        <span className={`shrink-0 w-6 h-6 rounded-full border border-[#8BB06A]/40 flex items-center justify-center text-[#8BB06A] text-sm font-bold transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`}>
          +
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="text-[#1C1F1A]/60 text-sm leading-relaxed pb-5 pr-10">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function FAQSection() {
  const { t } = useLang()
  const f = t.faq
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  return (
    <section className="py-24 md:py-32 px-4 md:px-6 bg-[#F5F2EC]">
      <div className="max-w-3xl mx-auto">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
        >
          <span className="inline-block text-[#6D9450] font-semibold text-xs uppercase tracking-[0.18em] mb-4">{f.label}</span>
          <h2 className="text-4xl md:text-6xl text-[#1C1F1A] mt-3 leading-tight" style={{ fontFamily: 'DM Serif Display, serif' }}>
            {f.h2}
          </h2>
          <p className="text-[#1C1F1A]/50 mt-4 text-base max-w-sm mx-auto leading-relaxed">{f.sub}</p>
        </motion.div>

        <motion.div
          className="bg-white border border-[#E5E0D5] rounded-2xl px-6 md:px-8 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {f.items.map((item, i) => (
            <FAQItem
              key={i}
              q={item.q}
              a={item.a}
              isOpen={openIdx === i}
              onToggle={() => setOpenIdx(openIdx === i ? null : i)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
