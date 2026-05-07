'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { PhoneMockup } from './PhoneMockup'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 1, y: 0 },
  animate: { opacity: 1, y: 0 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: 'easeOut' as const, delay },
})

export function HeroSection() {
  return (
    <section className="min-h-screen flex items-center pt-20 pb-16 px-6 gradient-primary-soft">
      <div className="max-w-6xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center">
        {/* Left */}
        <div className="space-y-6">
          <div>
            <span className="inline-flex items-center gap-2 bg-[#EEF5E6] border border-[#D4E8C2] text-[#577A3D] text-sm font-medium px-4 py-2 rounded-full">
              🍽️ Gebaut für die Gastronomie
            </span>
          </div>

          <h1
            className="text-4xl md:text-5xl lg:text-6xl leading-tight text-[#1C1F1A]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Deine Gäste werden dein
            <br />
            <em className="text-[#8BB06A] not-italic">bestes Marketing</em>
          </h1>

          <p className="text-lg text-[#1C1F1A]/60 max-w-lg leading-relaxed">
            Verwandle jeden Tischbesuch in Reichweite. Instagram Stories, Reels und Google-Bewertungen – automatisch belohnt.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/register"
              className="gradient-primary text-white font-semibold px-7 py-3.5 rounded-full hover:opacity-90 transition-opacity shadow-md"
            >
              Jetzt kostenlos starten
            </Link>
            <a
              href="#how-it-works"
              className="border-2 border-[#8BB06A] text-[#8BB06A] font-semibold px-7 py-3.5 rounded-full hover:bg-[#EEF5E6] transition-colors"
            >
              Demo ansehen
            </a>
          </div>

          <div className="flex items-center gap-6 pt-2">
            <div className="flex -space-x-2">
              {['🧑‍🍳', '👩‍🍳', '🧑‍🍽️'].map((e, i) => (
                <div
                  key={i}
                  className="w-9 h-9 rounded-full bg-[#D4E8C2] border-2 border-white flex items-center justify-center text-base"
                >
                  {e}
                </div>
              ))}
            </div>
            <p className="text-sm text-[#1C1F1A]/60">
              <span className="font-semibold text-[#1C1F1A]">500+</span> Gastronomen vertrauen pistazz
            </p>
          </div>
        </div>

        {/* Right – phone */}
        <div className="flex justify-center lg:justify-end">
          <PhoneMockup />
        </div>
      </div>
    </section>
  )
}
