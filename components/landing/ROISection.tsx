'use client'

import { useState, useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useLang } from '@/lib/lang-context'

function Slider({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-sm text-white/70">{label}</span>
        <span className="text-lg font-bold text-white" style={{ fontFamily: 'DM Serif Display, serif' }}>{value.toLocaleString('de-DE')}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#8BB06A] cursor-pointer"
        style={{ height: '4px' }}
      />
      <div className="flex justify-between text-xs text-white/30 mt-1">
        <span>{min.toLocaleString('de-DE')}{unit}</span>
        <span>{max.toLocaleString('de-DE')}{unit}</span>
      </div>
    </div>
  )
}

export function ROISection() {
  const { t } = useLang()
  const r = t.roi

  const [guests, setGuests] = useState(60)
  const [daysPerWeek, setDaysPerWeek] = useState(5)
  const [avgReceipt, setAvgReceipt] = useState(28)
  const [posterPct, setPosterPct] = useState(12)
  const [conversionRate, setConversionRate] = useState(10)

  const monthlyGuests = guests * daysPerWeek * 4
  const posters = Math.round(monthlyGuests * posterPct / 100)
  const reachPerPoster = 220
  const monthlyReach = posters * reachPerPoster
  const newGuests = Math.round(monthlyGuests * conversionRate / 100)
  const extraRevenue = Math.round(newGuests * avgReceipt)
  const platformCost = 129
  const roi = Math.round(((extraRevenue - platformCost) / platformCost) * 100)

  // Scroll parallax for background orbs
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] })
  const orbY1 = useTransform(scrollYProgress, [0, 1], ['0%', '-25%'])
  const orbY2 = useTransform(scrollYProgress, [0, 1], ['0%', '20%'])

  return (
    <section ref={sectionRef} className="relative py-20 md:py-28 px-4 md:px-6 bg-[#1C1F1A] overflow-hidden">
      {/* Parallax orbs */}
      <motion.div
        className="absolute -top-20 -left-20 w-80 h-80 rounded-full pointer-events-none blur-3xl"
        style={{ background: 'rgba(139,176,106,0.12)', y: orbY1 }}
      />
      <motion.div
        className="absolute -bottom-24 -right-16 w-64 h-64 rounded-full pointer-events-none blur-3xl"
        style={{ background: 'rgba(139,176,106,0.08)', y: orbY2 }}
      />

      <div className="relative max-w-5xl mx-auto">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
        >
          <span className="inline-block text-[#8BB06A] font-semibold text-xs uppercase tracking-[0.18em] mb-4">{r.label}</span>
          <h2 className="text-4xl md:text-6xl text-white mt-3 leading-tight" style={{ fontFamily: 'DM Serif Display, serif' }}>
            {r.h2}
          </h2>
          <p className="text-white/40 mt-4 max-w-md mx-auto text-base leading-relaxed">{r.sub}</p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 gap-8 items-start"
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {/* Sliders */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-7 space-y-7">
            <Slider label={r.fields.guests} value={guests} min={20} max={300} step={5} unit={r.fields.guestsUnit} onChange={setGuests} />
            <Slider label={r.fields.days} value={daysPerWeek} min={3} max={7} step={1} unit={r.fields.daysUnit} onChange={setDaysPerWeek} />
            <Slider label={r.fields.receipt} value={avgReceipt} min={10} max={100} step={1} unit="€" onChange={setAvgReceipt} />
            <Slider label={r.fields.posters} value={posterPct} min={5} max={40} step={1} unit="%" onChange={setPosterPct} />
            <Slider label={r.fields.conversion} value={conversionRate} min={5} max={20} step={1} unit="%" onChange={setConversionRate} />
          </div>

          {/* Results */}
          <div className="space-y-4">
            {[
              { label: r.results.monthlyGuests, value: monthlyGuests.toLocaleString('de-DE'), unit: r.results.guestsUnit, color: 'text-white' },
              { label: r.results.posters, value: posters.toLocaleString('de-DE'), unit: r.results.postersUnit, color: 'text-[#8BB06A]' },
              { label: r.results.reach, value: monthlyReach.toLocaleString('de-DE'), unit: r.results.reachUnit, color: 'text-[#8BB06A]' },
              { label: r.results.newGuests, value: newGuests.toLocaleString('de-DE'), unit: r.results.newGuestsUnit, color: 'text-white' },
              { label: r.results.revenue, value: extraRevenue.toLocaleString('de-DE') + '€', unit: '', color: 'text-[#8BB06A]' },
            ].map((item, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                <span className="text-sm text-white/60">{item.label}</span>
                <span className={`text-xl font-bold ${item.color}`} style={{ fontFamily: 'DM Serif Display, serif' }}>
                  {item.value} <span className="text-sm font-normal text-white/40">{item.unit}</span>
                </span>
              </div>
            ))}

            <div className="bg-[#8BB06A] rounded-2xl p-6 text-center">
              <p className="text-white/70 text-xs uppercase tracking-widest font-bold mb-1">{r.results.roiLabel}</p>
              <p className="text-5xl font-bold text-white" style={{ fontFamily: 'DM Serif Display, serif' }}>
                {roi > 0 ? `+${roi}%` : `${roi}%`}
              </p>
              <p className="text-white/70 text-xs mt-2">{r.results.roiSub}</p>
            </div>
          </div>
        </motion.div>

        <p className="text-center text-xs text-white/20 mt-8">{r.disclaimer}</p>
      </div>
    </section>
  )
}
