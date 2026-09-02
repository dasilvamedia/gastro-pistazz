'use client'

/**
 * Landing-Sektionen 05-10 (V2-Design): Pakete, Live-Feed, Pfad zum Plus,
 * Kostenvergleich, FAQ und Schluss-CTA. Ueberall gilt: 30 Tage kostenlos
 * testen und 30-Tage-Garantie. Der ROI-Rechner der Vorlage wurde bewusst
 * weggelassen.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Kicker, Headline, INK, CREAM, HAIR, SERIF, MONO } from './StorySections'

const fade = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
}

/* ── 05 / Pakete ──────────────────────────────────────────────────────── */
const PLANS = [
  {
    name: 'Starter', monthly: 79, setup: 1200,
    blurb: 'Für kleine Restaurants und Bars, die gerade anfangen.',
    feat: ['Basis-Features der Plattform', 'Bis zu 500 Gäste / Monat', 'Einfaches Dashboard', 'E-Mail-Support', '200 Flyer + 2× A2-Plakate mit Druck', 'Onboarding-Session'],
  },
  {
    name: 'Professional', monthly: 129, setup: 1899, badge: 'Bestseller',
    blurb: 'Das meistgewählte Paket. Für etablierte Häuser.',
    feat: ['Alle Plattform-Features', 'Bis zu 2.000 Gäste / Monat', 'Erweitertes Dashboard + Analytics', 'Prioritäts-Support', '200 Flyer + 2× A2-Plakate mit Druck', 'Onboarding + Team-Schulung', '30 Tage intensiver Support'],
  },
  {
    name: 'Premium', monthly: 179, setup: 3999,
    blurb: 'Für Häuser, die alles aus der Plattform herausholen.',
    feat: ['Alle Features + Custom-Entwicklung', 'Unbegrenzte Gäste / Monat', 'KI-Insights & Predictive Analytics', 'Dedicated Account Manager', '24/7 Prioritäts-Support', '200 Flyer + 2× A2-Plakate mit Druck', '60 Tage Support + monatliche Calls'],
  },
]

export function PricingV2() {
  return (
    <section id="preise" className="px-4 md:px-6 py-20 md:py-28 bg-white">
      <div className="max-w-6xl mx-auto">
        <motion.div {...fade} transition={{ duration: 0.5 }}>
          <Kicker>05 / Pakete</Kicker>
          <Headline line1="Drei Wege." line2="Ein Ziel." />
        </motion.div>

        <div className="mt-12 grid md:grid-cols-3 gap-5 items-stretch">
          {PLANS.map((p, i) => (
            <motion.div
              key={p.name}
              className="relative flex flex-col rounded-2xl border p-7"
              style={{
                borderColor: p.badge ? INK : HAIR,
                background: p.badge ? INK : CREAM,
                color: p.badge ? '#fff' : INK,
              }}
              {...fade}
              transition={{ duration: 0.45, delay: i * 0.1 }}
            >
              {p.badge && (
                <span className="absolute -top-3 left-6 text-[11px] font-bold px-3 py-1 rounded-full" style={{ background: '#8BB06A', color: '#fff' }}>
                  {p.badge}
                </span>
              )}
              <p className="text-lg" style={{ fontFamily: SERIF }}><em>{p.name}</em></p>
              <p className="mt-1 text-[13px]" style={{ opacity: 0.6 }}>{p.blurb}</p>
              <p className="mt-5">
                <span className="text-4xl" style={{ fontFamily: SERIF }}>€ {p.monthly}</span>
                <span className="text-sm" style={{ opacity: 0.55 }}> / Monat</span>
              </p>
              <p className="text-[12px] mt-1" style={{ fontFamily: MONO, opacity: 0.5 }}>+ € {p.setup.toLocaleString('de-DE')} Setup einmalig</p>
              <ul className="mt-6 space-y-2.5 text-[13.5px] flex-1">
                {p.feat.map(f => (
                  <li key={f} className="flex gap-2">
                    <span style={{ color: '#8BB06A' }}>✓</span>
                    <span style={{ opacity: 0.85 }}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/anfrage"
                className="mt-7 text-center font-bold text-sm py-3 rounded-full transition-opacity active:opacity-80"
                style={p.badge ? { background: '#fff', color: INK } : { background: INK, color: '#fff' }}
              >
                Beratung anfragen
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="mt-10 rounded-2xl border px-6 py-5 flex flex-col md:flex-row md:items-center gap-2 md:gap-8"
          style={{ borderColor: HAIR, background: CREAM }}
          {...fade}
          transition={{ duration: 0.5 }}
        >
          <p className="text-lg text-[#1C1F1A] shrink-0" style={{ fontFamily: SERIF }}>
            <em>30-Tage-Garantie auf alle Pakete</em>
          </p>
          <p className="text-sm" style={{ color: 'rgba(28,31,26,0.6)' }}>
            Erst 30 Tage kostenlos testen. Und wenn du danach nicht mindestens 10 neue Gäste gewinnst, bekommst du dein Geld zurück. Keine Fragen.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

/* ── 06 / Live-Feed ───────────────────────────────────────────────────── */
const STORIES = [
  { user: 'lena.kocht', place: 'Osteria Verde · München', ph: '🍝', pts: 8, time: 'gerade eben' },
  { user: 'maxonthemove', place: 'Bar Atlas · Berlin', ph: '🍸', pts: 5, time: 'vor 3 min' },
  { user: 'sara_eats', place: 'Aubergine · Hamburg', ph: '🍽️', pts: 12, time: 'vor 7 min' },
  { user: 'tom.unterwegs', place: 'Alpenhof · Tirol', ph: '🏔️', pts: 10, time: 'vor 12 min' },
  { user: 'mia.moments', place: 'Beach Bar · Aalen', ph: '🍹', pts: 6, time: 'vor 15 min' },
]

export function LiveFeedSection() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 2600)
    return () => clearInterval(t)
  }, [])
  return (
    <section className="px-4 md:px-6 py-20 md:py-28" style={{ background: INK }}>
      <div className="max-w-6xl mx-auto">
        <motion.div {...fade} transition={{ duration: 0.5 }}>
          <span className="inline-block text-[11px] font-semibold uppercase" style={{ fontFamily: MONO, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.5)' }}>
            06 / Live-Feed
          </span>
          <h2 className="mt-4 leading-[1.02] text-white" style={{ fontFamily: SERIF, fontSize: 'clamp(2.4rem, 6vw, 4.2rem)', fontWeight: 400 }}>
            Echte Gäste.<br /><em>Echte Stories.</em>
          </h2>
          <p className="mt-3 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
            So sieht dein Dashboard-Feed aus, wenn das System läuft (Beispieldaten).
          </p>
        </motion.div>

        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map(col => {
            const s = STORIES[(tick + col) % STORIES.length]
            return (
              <div key={col} className="rounded-2xl border p-5 transition-all duration-500" style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-white font-semibold text-sm">@{s.user}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{s.time}</span>
                </div>
                <div className="mt-4 h-28 rounded-xl flex items-center justify-center text-4xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  {s.ph}
                </div>
                <div className="mt-4 flex items-center justify-between text-[13px]">
                  <span style={{ color: 'rgba(255,255,255,0.55)' }}>{s.place}</span>
                  <span className="font-bold" style={{ color: '#A7C48D' }}>+{s.pts} Punkte</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-8">
          <Link href="/register" className="text-sm font-semibold" style={{ color: '#A7C48D' }}>
            Selbst ausprobieren, 30 Tage kostenlos →
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ── 07 / Pfad ────────────────────────────────────────────────────────── */
const TIMELINE = [
  { m: '01', invest: '€ 2.028', result: '5 bis 8 neue Gäste · € 500 bis 800 Umsatz', roi: '–75 %', tone: 'neg', note: 'Investitionsphase. Normal.' },
  { m: '03', invest: '€ 2.286', result: '15 bis 20 neue Gäste · € 2.000 bis 2.500 Umsatz', roi: '0 %', tone: 'zero', note: 'Break-Even erreicht.' },
  { m: '06', invest: '€ 2.673', result: '30 bis 40 neue Gäste · € 4.000 bis 5.000 Umsatz', roi: '+75 %', tone: 'pos', note: 'Profitabel. Wachstum.' },
  { m: '12', invest: '€ 3.546', result: '60 bis 80 neue Gäste · € 8.000 bis 10.000 Umsatz', roi: '+200 %', tone: 'pos', note: 'Echtes Business.' },
]

export function TimelineSection() {
  return (
    <section className="px-4 md:px-6 py-20 md:py-28" style={{ background: CREAM }}>
      <div className="max-w-6xl mx-auto">
        <motion.div {...fade} transition={{ duration: 0.5 }}>
          <Kicker>07 / Pfad</Kicker>
          <Headline line1="Der Pfad zum Plus." line2="Monat für Monat." />
          <p className="mt-3 text-sm" style={{ color: 'rgba(28,31,26,0.55)' }}>
            Beispielrechnung mit dem Professional-Paket (Setup + Monatsbeitrag kumuliert).
          </p>
        </motion.div>

        <div className="mt-10 border-t" style={{ borderColor: HAIR }}>
          {TIMELINE.map((r, i) => (
            <motion.div
              key={r.m}
              className="grid grid-cols-2 md:grid-cols-[90px_1fr_2fr_110px] gap-3 md:gap-6 items-center py-5 border-b"
              style={{ borderColor: HAIR }}
              {...fade}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <div>
                <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.18em', color: 'rgba(28,31,26,0.45)' }}>MONAT</span>
                <p className="text-2xl text-[#1C1F1A]" style={{ fontFamily: SERIF }}>{r.m}</p>
              </div>
              <div className="text-sm" style={{ color: 'rgba(28,31,26,0.6)' }}>
                <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em' }}>INVESTITION&nbsp;&nbsp;</span>{r.invest}
              </div>
              <div className="col-span-2 md:col-span-1 text-sm text-[#1C1F1A]">
                <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', color: 'rgba(28,31,26,0.45)' }}>ERGEBNIS&nbsp;&nbsp;</span>
                {r.result}
                <span className="block text-[12px] mt-0.5" style={{ color: 'rgba(28,31,26,0.45)' }}>{r.note}</span>
              </div>
              <p
                className="text-xl md:text-right"
                style={{ fontFamily: SERIF, color: r.tone === 'pos' ? '#577A3D' : r.tone === 'zero' ? INK : 'rgba(28,31,26,0.45)' }}
              >
                {r.roi}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── 08 / Vergleich ───────────────────────────────────────────────────── */
const COMPARE = [
  { name: 'Google Ads', cost: '€ 1.500', guests: '8', per: '€ 187,50', own: false },
  { name: 'Klassische Plakate', cost: '€ 800', guests: '4', per: '€ 200,00', own: false },
  { name: 'Influencer (lokal)', cost: '€ 600', guests: '12', per: '€ 50,00', own: false },
  { name: 'gastro.pistazz.io', cost: '€ 129', guests: '25', per: '€ 5,16', own: true },
]

export function CompareSection() {
  return (
    <section className="px-4 md:px-6 py-20 md:py-28 bg-white">
      <div className="max-w-6xl mx-auto">
        <motion.div {...fade} transition={{ duration: 0.5 }}>
          <Kicker>08 / Vergleich</Kicker>
          <Headline line1="€ 187,50 vs. € 5,16." line2="Pro neuem Gast." />
        </motion.div>

        <div className="mt-10 overflow-x-auto">
          <div className="min-w-[560px]">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr] border-b pb-3" style={{ borderColor: HAIR }}>
              {['Kanal', 'Kosten / Mt.', 'Neue Gäste', 'Kosten / Gast'].map(h => (
                <span key={h} style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(28,31,26,0.45)' }}>{h}</span>
              ))}
            </div>
            {COMPARE.map((r, i) => (
              <motion.div
                key={r.name}
                className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center py-5 border-b"
                style={{ borderColor: HAIR, background: r.own ? CREAM : undefined }}
                {...fade}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <p className={r.own ? 'pl-3 text-lg' : 'text-[15px]'} style={r.own ? { fontFamily: SERIF, color: '#577A3D' } : { color: 'rgba(28,31,26,0.7)' }}>
                  {r.own ? <em>{r.name}</em> : r.name}
                </p>
                <span className="text-[15px] text-[#1C1F1A]">{r.cost}</span>
                <span className="text-[15px] text-[#1C1F1A]">{r.guests}</span>
                <span className="text-[15px] font-bold" style={{ color: r.own ? '#577A3D' : INK }}>{r.per}</span>
              </motion.div>
            ))}
          </div>
        </div>
        <p className="mt-4 text-[12px]" style={{ color: 'rgba(28,31,26,0.45)' }}>
          Vergleichswerte: typische Budgets und Ergebnisse kleiner Gastro-Betriebe im DACH-Raum, Professional-Paket ohne Setup.
        </p>
      </div>
    </section>
  )
}

/* ── 09 / FAQ ─────────────────────────────────────────────────────────── */
const FAQS = [
  ['Wie lange dauert die Einrichtung?', 'Etwa 2 bis 3 Wochen. Setup, Design, Druck, Versand, dann bist du startklar.'],
  ['Kann ich die Belohnungen anpassen?', 'Ja, vollständig. Du definierst, was deine Gäste bekommen: Rabatte, Drinks, Desserts, Gutscheine.'],
  ['Was, wenn meine Gäste nicht teilen?', 'Das passiert selten. Wenn doch, helfen wir mit Strategien, Platzierung und Kommunikation. Und du hast die 30-Tage-Garantie.'],
  ['Kann ich kündigen?', 'Ja, jederzeit. Keine Vertragsbindung. Die meisten bleiben aber, weil es funktioniert.'],
  ['Wie sicher sind meine Daten?', '100 % DSGVO-konform, 256-Bit-SSL, tägliche Backups. Hosting in Deutschland.'],
  ['Welche Systeme könnt ihr integrieren?', 'Instagram, TikTok und Google direkt. POS, Reservierung, CRM und Zahlung (Stripe / PayPal) auf Anfrage.'],
]

export function FaqV2() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section id="faq" className="px-4 md:px-6 py-20 md:py-28" style={{ background: CREAM }}>
      <div className="max-w-4xl mx-auto">
        <motion.div {...fade} transition={{ duration: 0.5 }}>
          <Kicker>09 / FAQ</Kicker>
          <Headline line1="Häufige" line2="Fragen." />
        </motion.div>
        <div className="mt-10 border-t" style={{ borderColor: HAIR }}>
          {FAQS.map(([q, a], i) => (
            <div key={q} className="border-b" style={{ borderColor: HAIR }}>
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between py-5 text-left">
                <span className="text-[16px] font-semibold text-[#1C1F1A] pr-6">{q}</span>
                <span className="text-xl shrink-0" style={{ color: '#6D9450' }}>{open === i ? '−' : '+'}</span>
              </button>
              {open === i && (
                <p className="pb-5 text-[14.5px] leading-relaxed -mt-1" style={{ color: 'rgba(28,31,26,0.65)' }}>{a}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── 10 / Jetzt ───────────────────────────────────────────────────────── */
export function FinalCTA() {
  return (
    <section className="px-4 md:px-6 py-24 md:py-32" style={{ background: INK }}>
      <div className="max-w-4xl mx-auto text-center">
        <span className="inline-block text-[11px] font-semibold uppercase" style={{ fontFamily: MONO, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.5)' }}>
          10 / Jetzt
        </span>
        <h2 className="mt-5 text-white leading-[1.05]" style={{ fontFamily: SERIF, fontSize: 'clamp(2.4rem, 6vw, 4.4rem)', fontWeight: 400 }}>
          Deine Gäste sitzen<br /><em>schon an den Tischen.</em>
        </h2>
        <p className="mt-5 text-base" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Mach aus jedem Besuch Reichweite. 30 Tage kostenlos testen, danach greift die 30-Tage-Garantie.
        </p>
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/anfrage" className="px-8 py-4 rounded-full font-bold text-[15px]" style={{ background: '#8BB06A', color: '#fff' }}>
            Kostenfreies Beratungsgespräch buchen →
          </Link>
          <Link href="/register" className="px-7 py-4 rounded-full font-semibold text-[14px] border" style={{ borderColor: 'rgba(255,255,255,0.25)', color: '#fff' }}>
            30 Tage kostenlos testen
          </Link>
        </div>
        <p className="mt-8" style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.35)' }}>
          DSGVO · SSL 256-BIT · DACH-WEIT VERFÜGBAR · KEINE VERTRAGSBINDUNG
        </p>
      </div>
    </section>
  )
}
