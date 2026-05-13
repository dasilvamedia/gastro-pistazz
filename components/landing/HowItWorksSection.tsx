'use client'

import { motion } from 'framer-motion'
import { useLang } from '@/lib/lang-context'

export function HowItWorksSection() {
  const { t } = useLang()
  const s = t.howItWorks

  return (
    <section id="how-it-works" className="py-16 md:py-20 px-4 md:px-6 bg-white">
      <div className="max-w-5xl mx-auto">

        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
        >
          <span className="text-[#8BB06A] font-bold text-xs uppercase tracking-widest">{s.label}</span>
          <h2 className="text-2xl md:text-4xl text-[#1C1F1A] mt-2" style={{ fontFamily: 'DM Serif Display, serif' }}>
            {s.h2}
          </h2>
          <p className="text-[#1C1F1A]/50 mt-2 max-w-sm mx-auto text-sm">{s.p}</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4">
          {s.steps.map((step, i) => (
            <motion.div
              key={i}
              className="group relative bg-[#F8FAF5] border border-[#D4E8C2] rounded-2xl p-6 overflow-hidden cursor-default"
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              whileHover={{ y: -4, boxShadow: '0 16px 40px rgba(139,176,106,0.14)' }}
            >
              <span
                className="absolute -top-2 -right-2 text-7xl font-bold select-none pointer-events-none leading-none"
                style={{ fontFamily: 'DM Serif Display, serif', color: 'rgba(139,176,106,0.08)' }}
              >
                0{i + 1}
              </span>

              <div className="text-3xl mb-3">{step.icon}</div>
              <h3 className="font-bold text-[#1C1F1A] text-base mb-1.5">{step.title}</h3>
              <p className="text-[#1C1F1A]/55 text-sm leading-relaxed">{step.description}</p>

              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ background: 'linear-gradient(135deg, rgba(139,176,106,0.06) 0%, transparent 70%)' }} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
