'use client'

import Link from 'next/link'
import { useRef, useEffect } from 'react'
import { motion, useMotionValue, useSpring, useTransform, MotionValue } from 'framer-motion'
import { PhoneMockup } from './PhoneMockup'
import { useLang } from '@/lib/lang-context'

// ── Orb component — each has its own hooks, no violation ─────────────────────
function ParallaxOrb({
  size, left, top, color, dur, springX, springY, factorX, factorY,
}: {
  size: number; left: string; top: string; color: string; dur: number
  springX: MotionValue<number>; springY: MotionValue<number>
  factorX: number; factorY: number
}) {
  const ox = useTransform(springX, [-300, 300], [-factorX, factorX])
  const oy = useTransform(springY, [-300, 300], [-factorY, factorY])
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none blur-3xl"
      style={{ width: size, height: size, left, top, background: color, x: ox, y: oy }}
      animate={{ scale: [1, 1.09, 1] }}
      transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

const ORBS = [
  { size: 340, left: '5%',  top: '10%', color: 'rgba(139,176,106,0.20)', dur: 8,  fx: 8,  fy: 6  },
  { size: 220, left: '72%', top: '55%', color: 'rgba(139,176,106,0.14)', dur: 11, fx: 18, fy: 14 },
  { size: 170, left: '50%', top: '2%',  color: 'rgba(229,184,76,0.11)',  dur: 9,  fx: 30, fy: 22 },
]

export function HeroSection() {
  const { t } = useLang()
  const h = t.hero
  const containerRef = useRef<HTMLDivElement>(null)

  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const springX = useSpring(mx, { stiffness: 50, damping: 20 })
  const springY = useSpring(my, { stiffness: 50, damping: 20 })

  // Phone 3D tilt
  const rotateX = useTransform(springY, [-300, 300], [12, -12])
  const rotateY = useTransform(springX, [-300, 300], [-12, 12])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      mx.set(e.clientX - r.left - r.width / 2)
      my.set(e.clientY - r.top - r.height / 2)
    }
    const onLeave = () => { mx.set(0); my.set(0) }
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => { el.removeEventListener('mousemove', onMove); el.removeEventListener('mouseleave', onLeave) }
  }, [mx, my])

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-center pt-20 pb-10 px-4 md:px-6 overflow-hidden"
      style={{ background: 'linear-gradient(140deg, #EEF5E6 0%, #D4E8C2 55%, #c8e0a8 100%)' }}
    >
      {/* Parallax orbs */}
      {ORBS.map((o, i) => (
        <ParallaxOrb key={i} size={o.size} left={o.left} top={o.top} color={o.color}
          dur={o.dur} springX={springX} springY={springY} factorX={o.fx} factorY={o.fy} />
      ))}

      {/* Subtle dot grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{ backgroundImage: 'radial-gradient(circle, #1C1F1A 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

      <div className="relative max-w-6xl mx-auto w-full grid lg:grid-cols-2 gap-8 lg:gap-12 items-center z-10">
        {/* LEFT */}
        <div className="space-y-5">

          {/* Badge */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <span className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-[#D4E8C2] text-[#577A3D] text-xs font-semibold px-4 py-2 rounded-full shadow-sm">
              {h.badge}
            </span>
          </motion.div>

          {/* Two-color headline */}
          <motion.h1
            className="leading-[1.1] font-bold"
            style={{ fontFamily: 'var(--font-display)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
          >
            <span className="block text-[2.6rem] sm:text-5xl lg:text-[3.4rem] text-[#1C1F1A]">
              {h.h1}
            </span>
            <span className="block text-[2.6rem] sm:text-5xl lg:text-[3.4rem] text-[#8BB06A]">
              {h.h1accent}
            </span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            className="text-base md:text-lg text-[#1C1F1A]/60 max-w-md leading-relaxed"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.16 }}
          >
            {h.p}
          </motion.p>

          {/* CTAs */}
          <motion.div
            className="flex flex-wrap gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.22 }}
          >
            <Link
              href="/register"
              className="gradient-primary text-white font-bold px-7 py-3.5 rounded-full hover:opacity-90 hover:scale-[1.03] active:scale-[0.98] transition-all shadow-lg shadow-[#8BB06A]/30 text-sm md:text-base"
            >
              {h.ctaPrimary}
            </Link>
            <a
              href="#how-it-works"
              className="border-2 border-[#8BB06A] text-[#8BB06A] font-semibold px-7 py-3.5 rounded-full hover:bg-white/60 hover:scale-[1.02] transition-all text-sm md:text-base"
            >
              {h.ctaSecondary}
            </a>
          </motion.div>

          {/* Social proof */}
          <motion.div
            className="flex items-center gap-3 pt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.30 }}
          >
            <div className="flex -space-x-2">
              {['🧑‍🍳', '👩‍🍳', '🧑‍🍽️', '🍸'].map((e, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-white border-2 border-[#D4E8C2] flex items-center justify-center text-sm shadow-sm">
                  {e}
                </div>
              ))}
            </div>
            <p className="text-xs text-[#1C1F1A]/55" dangerouslySetInnerHTML={{ __html: h.social }} />
          </motion.div>
        </div>

        {/* RIGHT – 3D phone */}
        <motion.div
          className="flex justify-center lg:justify-end"
          style={{ perspective: 1200 }}
          initial={{ opacity: 0, x: 36 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65, delay: 0.1 }}
        >
          <motion.div style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}>
            <PhoneMockup />
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 7, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="w-px h-8 bg-[#8BB06A]/40 rounded-full mx-auto" />
      </motion.div>
    </section>
  )
}
