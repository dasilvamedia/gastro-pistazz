'use client'

import { motion, useInView } from 'framer-motion'
import { useLang } from '@/lib/lang-context'
import { useIndustryT } from './IndustryContext'
import { useRef, useEffect, useState } from 'react'

function FlipCard({ icon, title, description, index }: {
  icon: string; title: string; description: string; index: number
}) {
  const wrapRef = useRef<HTMLDivElement>(null)

  // Tracks whether this device has no hover (= touch/mobile)
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(hover: none) and (pointer: coarse)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Scroll-based flip for mobile: once: false so it re-fires on scroll back
  const isInView = useInView(wrapRef, { amount: 0.55, once: false })

  // Entrance: only once
  const [entered, setEntered] = useState(false)
  const entranceRef = useRef<HTMLDivElement>(null)
  const entranceInView = useInView(entranceRef, { amount: 0.1, once: true })
  useEffect(() => {
    if (entranceInView) setEntered(true)
  }, [entranceInView])

  // Desktop hover state
  const [hovered, setHovered] = useState(false)

  const flipped = isMobile ? isInView : hovered

  return (
    <div ref={entranceRef}>
      <motion.div
        animate={{
          opacity: entered ? 1 : 0,
          y: entered ? 0 : 20,
        }}
        transition={{ duration: 0.38, delay: entered ? index * 0.06 : 0 }}
        className="relative w-full h-52 sm:h-48 lg:h-44 cursor-default"
        style={{ perspective: '1000px' }}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
      >
        {/* Scroll-sentinel: sits in the middle of the card */}
        <div ref={wrapRef} className="absolute inset-0 pointer-events-none" />

        <motion.div
          className="relative w-full h-full"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{
            duration: 0.6,
            ease: [0.4, 0, 0.2, 1],
            // Delay only when flipping TO the back (give user time to read front)
            delay: flipped ? 1.1 + index * 0.08 : 0,
          }}
        >
          {/* ── Front ── */}
          <div
            className="absolute inset-0 bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col justify-center items-center text-center"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--ind-primary)]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-xl" />
            <div className="text-3xl mb-3">{icon}</div>
            <h3 className="text-white font-semibold text-sm leading-snug">{title}</h3>
          </div>

          {/* ── Back ── */}
          <div
            className="absolute inset-0 rounded-xl p-5 flex flex-col justify-center items-center text-center"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: 'linear-gradient(135deg, var(--ind-primary) 0%, var(--ind-primary-dark) 100%)',
            }}
          >
            <div className="text-xl mb-1.5">{icon}</div>
            <h3 className="text-white font-bold text-sm mb-1.5 leading-snug">{title}</h3>
            <p className="text-white/85 text-xs leading-relaxed">{description}</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

export function FeaturesSection() {
  const { t } = useIndustryT()
  const f = t.features
  const h2Lines = f.h2.split('\n')

  return (
    <section id="features" className="py-16 md:py-20 px-4 md:px-6 bg-[#1C1F1A]">
      <div className="max-w-5xl mx-auto">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
        >
          <span className="text-[var(--ind-primary)] font-bold text-xs uppercase tracking-widest">{f.label}</span>
          <h2 className="text-2xl md:text-4xl text-white mt-2" style={{ fontFamily: 'DM Serif Display, serif' }}>
            {h2Lines.map((l, i) => <span key={i} className="block">{l}</span>)}
          </h2>
          <p className="text-white/40 mt-2 max-w-sm mx-auto text-sm">{f.p}</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {f.items.map((item, i) => (
            <FlipCard
              key={i}
              icon={item.icon}
              title={item.title}
              description={item.description}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
