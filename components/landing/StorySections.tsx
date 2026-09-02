'use client'

/**
 * Landing-Sektionen 01-03 im redaktionellen Look der V2-Landingpage:
 * Creme-Flaechen, grosse Serifen-Headlines, nummerierte Mono-Kicker,
 * Hairline-Raster. Der Hero darueber bleibt unveraendert.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'

export const INK = '#1C1F1A'
export const CREAM = '#F2EFE6'
export const HAIR = 'rgba(28,31,26,0.14)'
export const SERIF = "'Instrument Serif', 'DM Serif Display', Georgia, serif"
export const MONO = "'DM Mono', ui-monospace, 'SF Mono', Menlo, monospace"

export function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-block text-[11px] font-semibold uppercase"
      style={{ fontFamily: MONO, letterSpacing: '0.22em', color: 'rgba(28,31,26,0.55)' }}
    >
      {children}
    </span>
  )
}

export function Headline({ line1, line2 }: { line1: string; line2: string }) {
  return (
    <h2 className="mt-4 leading-[1.02] text-[#1C1F1A]" style={{ fontFamily: SERIF, fontSize: 'clamp(2.4rem, 6vw, 4.2rem)', fontWeight: 400 }}>
      {line1}
      <br />
      <em style={{ fontStyle: 'italic' }}>{line2}</em>
    </h2>
  )
}

const fade = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
}

/* ── 01 / Problem ─────────────────────────────────────────────────────── */
const PAINS = [
  ['Klassische Werbung', 'ist teuer. € 1.500 im Monat für 8 neue Gäste. Macht € 187 pro Kopf.'],
  ['Social Media selbst', 'ist Zeit. Stunden für Posts, die kaum jemand sieht. Und die Algorithmen ändern sich ständig.'],
  ['Mundpropaganda', 'passiert oder eben nicht. Du kannst sie nicht planen. Bis jetzt.'],
]

export function ProblemSection() {
  return (
    <section className="px-4 md:px-6 py-20 md:py-28" style={{ background: CREAM }}>
      <div className="max-w-6xl mx-auto">
        <motion.div {...fade} transition={{ duration: 0.5 }}>
          <Kicker>01 / Problem</Kicker>
          <Headline line1="Dein Laden ist gut." line2="Aber die Welt weiß es nicht." />
        </motion.div>
        <div className="mt-12 grid md:grid-cols-3 border-t" style={{ borderColor: HAIR }}>
          {PAINS.map(([title, text], i) => (
            <motion.div
              key={title}
              className="py-8 md:py-10 md:pr-10 border-b md:border-b-0 md:border-r last:border-r-0 md:pl-0"
              style={{ borderColor: HAIR, paddingLeft: i > 0 ? undefined : 0 }}
              {...fade}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <div className="md:px-6 first:md:pl-0">
                <p className="text-xl text-[#1C1F1A]" style={{ fontFamily: SERIF }}>
                  <em>{title}</em>
                </p>
                <p className="mt-3 text-[15px] leading-relaxed" style={{ color: 'rgba(28,31,26,0.65)' }}>{text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── 02 / System ──────────────────────────────────────────────────────── */
const STEPS: Array<[string, string, string]> = [
  ['Gast sitzt', 'In deinem Restaurant. Genießt sein Essen.', '🪑'],
  ['Scannt QR', 'Code auf dem Tisch oder an der Theke.', '◷'],
  ['Teilt Story', 'Macht Foto, postet auf Instagram oder TikTok.', '✦'],
  ['Bekommt Punkte', 'Automatisch als Belohnung verbucht.', '◆'],
  ['Du siehst alles', 'In deinem professionellen Dashboard.', '◰'],
  ['Neue Gäste', 'Kommen durch die Posts ihrer Freunde.', '↗'],
]

export function SystemSection() {
  return (
    <section id="how-it-works" className="px-4 md:px-6 py-20 md:py-28 bg-white">
      <div className="max-w-6xl mx-auto">
        <motion.div {...fade} transition={{ duration: 0.5 }}>
          <Kicker>02 / System</Kicker>
          <Headline line1="Gäste als Botschafter." line2="Sechs Schritte. Ein Kreislauf." />
        </motion.div>
        <div className="mt-12 grid grid-cols-2 lg:grid-cols-3 border-t border-l" style={{ borderColor: HAIR }}>
          {STEPS.map(([title, text, icon], i) => (
            <motion.div
              key={title}
              className="p-6 md:p-8 border-b border-r"
              style={{ borderColor: HAIR }}
              {...fade}
              transition={{ duration: 0.45, delay: i * 0.07 }}
            >
              <div className="flex items-baseline justify-between">
                <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', color: 'rgba(28,31,26,0.4)' }}>
                  0{i + 1}
                </span>
                <span className="text-lg" style={{ color: '#6D9450' }}>{icon}</span>
              </div>
              <p className="mt-4 text-lg font-semibold text-[#1C1F1A]">{title}</p>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'rgba(28,31,26,0.6)' }}>{text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── 03 / Für wen ─────────────────────────────────────────────────────── */
type Scenario = {
  key: string
  label: string
  setup: string[]
  impact: string[]
  year: string
  story: string
}

const SCENARIOS: Scenario[] = [
  {
    key: 'restaurant', label: 'Restaurant',
    setup: ['80 Plätze', '120 Gäste / Tag', '€ 3.500 Tagesumsatz', 'Etabliert, Wachstum stagniert'],
    impact: ['+ 25 bis 30 neue Gäste / Monat', '€ 2.000 bis 2.500 zusätzlich / Monat', '+ 50 bis 70 % Google-Bewertungen', 'ROI nach 3 Monaten'],
    year: '€ 24.000 bis 30.000 zusätzlicher Umsatz / Jahr',
    story: 'Ein Restaurant in München. 15 % der Gäste teilen innerhalb von 3 Monaten. Die Stories gehen rum. Neue Gäste kommen, weil sie die Posts ihrer Freunde sehen.',
  },
  {
    key: 'bar', label: 'Bar',
    setup: ['50 Plätze', '150 Gäste / Woche', '€ 2.000 Wochenumsatz', 'Jung, trendy, kleines Budget'],
    impact: ['+ 60 bis 80 neue Gäste / Monat', '€ 2.500 bis 3.000 zusätzlich / Monat', 'Viral-Potenzial durch Stories', 'ROI nach 2 Monaten'],
    year: '€ 30.000 bis 36.000 zusätzlicher Umsatz / Jahr',
    story: 'Eine Bar in Berlin. Gäste lieben es, ihre Drinks zu fotografieren. Die Bar wird zum Hotspot, nicht wegen Werbung, sondern weil die Gäste sie promoten.',
  },
  {
    key: 'fine', label: 'Fine Dining',
    setup: ['40 Plätze', '80 Gäste / Woche', '€ 8.000 Wochenumsatz', 'Hochwertig, schwer zu erreichen'],
    impact: ['+ 15 bis 20 neue Gäste / Monat', '€ 3.000 bis 3.500 zusätzlich / Monat', 'Authentische Testimonials', 'ROI nach 2 bis 3 Monaten'],
    year: '€ 36.000 bis 42.000 zusätzlicher Umsatz / Jahr',
    story: 'Ein Fine-Dining-Restaurant in Hamburg. Gäste teilen die Präsentation der Gänge. Die Fotos sind kunstvoll, genau das, was das Haus braucht.',
  },
  {
    key: 'hotel', label: 'Hotel',
    setup: ['30 Zimmer', '20 Buchungen / Monat', '€ 3.000 / Buchung', 'Schön, schwer zu vermarkten'],
    impact: ['+ 8 bis 12 Buchungen / Monat', 'Stories als kostenloses Marketing', 'Authentische Einblicke statt Hochglanz', 'ROI nach 1 bis 2 Monaten'],
    year: 'Jede zusätzliche Buchung zahlt das System mehrfach',
    story: 'Ein Hotel in Österreich. Gäste teilen Fotos von Zimmer, Frühstück und Aussicht. Authentisch und überzeugend. Neue Gäste buchen, weil sie die Posts gesehen haben.',
  },
]

export function ScenariosSection() {
  const [active, setActive] = useState(0)
  const s = SCENARIOS[active]
  return (
    <section id="features" className="px-4 md:px-6 py-20 md:py-28" style={{ background: CREAM }}>
      <div className="max-w-6xl mx-auto">
        <motion.div {...fade} transition={{ duration: 0.5 }}>
          <Kicker>03 / Für wen</Kicker>
          <Headline line1="Vier Häuser." line2="Eine Mechanik." />
        </motion.div>

        {/* Tabs */}
        <div className="mt-10 flex flex-wrap gap-2">
          {SCENARIOS.map((sc, i) => (
            <button
              key={sc.key}
              onClick={() => setActive(i)}
              className="px-5 py-2.5 rounded-full text-sm font-semibold transition-colors border"
              style={active === i
                ? { background: INK, color: '#fff', borderColor: INK }
                : { background: 'transparent', color: 'rgba(28,31,26,0.6)', borderColor: HAIR }}
            >
              {sc.label}
            </button>
          ))}
        </div>

        <div className="mt-8 grid md:grid-cols-2 border-t" style={{ borderColor: HAIR }}>
          <div className="py-8 md:pr-10 border-b md:border-b-0 md:border-r" style={{ borderColor: HAIR }}>
            <Kicker>Ausgangslage</Kicker>
            <ul className="mt-4 space-y-2.5">
              {s.setup.map(x => (
                <li key={x} className="text-[15px]" style={{ color: 'rgba(28,31,26,0.7)' }}>{x}</li>
              ))}
            </ul>
          </div>
          <div className="py-8 md:pl-10">
            <Kicker>Mit gastro.pistazz.io</Kicker>
            <ul className="mt-4 space-y-2.5">
              {s.impact.map(x => (
                <li key={x} className="text-[15px] font-semibold text-[#1C1F1A]">
                  <span style={{ color: '#6D9450' }}>✓</span>&nbsp; {x}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t pt-6 mt-2 flex flex-col md:flex-row md:items-center gap-4 md:gap-10" style={{ borderColor: HAIR }}>
          <p className="text-xl md:text-2xl text-[#1C1F1A] shrink-0" style={{ fontFamily: SERIF }}>
            <em>{s.year}</em>
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(28,31,26,0.55)' }}>
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Aus dem Feld&nbsp;&nbsp;</span>
            {s.story}
          </p>
        </div>
      </div>
    </section>
  )
}
