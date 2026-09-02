'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle, ChevronRight, Loader2 } from 'lucide-react'

const BETRIEBSARTEN = [
  'Restaurant', 'Bar', 'Café', 'Bistro', 'Biergarten', 'Club / Lounge',
  'Pizzeria', 'Sushi / Asia', 'Imbiss / Schnellrestaurant',
  'Bäckerei / Konditorei', 'Food Truck', 'Catering', 'Sonstiges',
]

const GROESSEN = [
  'Bis 30 Sitzplätze', '30 bis 60 Sitzplätze', '60 bis 100 Sitzplätze',
  '100 bis 200 Sitzplätze', 'Über 200 Sitzplätze',
]

const MITARBEITER = [
  '1 bis 3', '4 bis 10', '11 bis 25', '26 bis 50', 'Über 50',
]

function Field({ label, required, children, hint }: {
  label: string; required?: boolean; children: React.ReactNode; hint?: string
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#1C1F1A] mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-[#1C1F1A]/40 mt-1">{hint}</p>}
    </div>
  )
}

const inputClass =
  'w-full border border-[#E5E0D5] rounded-xl px-4 py-3 text-sm text-[#1C1F1A] bg-white focus:outline-none focus:ring-2 focus:ring-[#8BB06A] focus:border-transparent transition-all placeholder:text-[#1C1F1A]/30'

export default function AnfragePage() {
  const [form, setForm] = useState({
    name: '', email: '', telefon: '', betriebsart: '', stadt: '',
    groesse: '', mitarbeiter: '', website: '', notizen: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const valid =
    form.name.trim().length >= 2 &&
    form.email.includes('@') &&
    form.telefon.trim().length >= 6 &&
    form.betriebsart.length > 0 &&
    form.stadt.trim().length >= 2

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || submitting) return
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/anfrage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Fehler beim Senden')
      }

      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#F5F2EC] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-[#E5E0D5] p-10 text-center">
          <div className="w-20 h-20 rounded-full bg-[#EEF5E6] flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-[#8BB06A]" />
          </div>
          <h1 className="text-2xl font-bold text-[#1C1F1A] mb-3" style={{ fontFamily: 'DM Serif Display, serif' }}>
            Anfrage eingegangen!
          </h1>
          <p className="text-[#1C1F1A]/60 text-sm leading-relaxed mb-6">
            Vielen Dank! Wir haben deine Anfrage erhalten und melden uns innerhalb von
            <strong className="text-[#1C1F1A]"> 24 bis 48 Stunden</strong> persönlich bei dir.
            Schau auch in deinen Spam-Ordner, du hast eine Bestätigung per E-Mail bekommen.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-[#8BB06A] text-white font-semibold px-6 py-3 rounded-full text-sm hover:bg-[#6D9450] transition-colors"
          >
            Zurück zur Startseite
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F2EC] px-4 py-16">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-10 text-center">
        <Link href="/" className="inline-flex items-baseline gap-0 mb-8">
          <span className="text-2xl font-bold text-[#8BB06A]" style={{ fontFamily: 'DM Serif Display, serif' }}>gastro.pistazz</span>
          <span className="text-2xl font-bold text-[#1C1F1A]" style={{ fontFamily: 'DM Serif Display, serif' }}>.io</span>
        </Link>
        <h1 className="text-4xl md:text-5xl text-[#1C1F1A] font-bold leading-tight mb-4" style={{ fontFamily: 'DM Serif Display, serif' }}>
          gastro.pistazz.io für dein Lokal nutzen
        </h1>
        <p className="text-[#1C1F1A]/55 text-base leading-relaxed max-w-lg mx-auto">
          Füll das Formular aus, wir melden uns persönlich innerhalb von 24 Stunden.
          Kein Vertrag, kein Risiko. 30 Tage Geld-zurück-Garantie.
        </p>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          {['✅ Kostenlose Demo', '🔒 Keine Kreditkarte nötig', '📞 Persönliche Beratung'].map(b => (
            <span key={b} className="bg-white border border-[#E5E0D5] rounded-full px-4 py-1.5 text-xs font-medium text-[#1C1F1A]/70 shadow-sm">
              {b}
            </span>
          ))}
        </div>
      </div>

      {/* Form card */}
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-white rounded-3xl shadow-sm border border-[#E5E0D5] p-8 md:p-10 space-y-6">

        {/* Section: Betrieb */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#8BB06A] mb-5">1 · Dein Betrieb</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Betriebsart" required>
              <select
                className={inputClass}
                value={form.betriebsart}
                onChange={e => set('betriebsart', e.target.value)}
                required
              >
                <option value="">Bitte wählen…</option>
                {BETRIEBSARTEN.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Stadt / Ort" required>
              <input
                type="text"
                className={inputClass}
                placeholder="z. B. München"
                value={form.stadt}
                onChange={e => set('stadt', e.target.value)}
                required
              />
            </Field>
            <Field label="Größe des Lokals" hint="Sitzplätze ungefähr">
              <select
                className={inputClass}
                value={form.groesse}
                onChange={e => set('groesse', e.target.value)}
              >
                <option value="">Bitte wählen…</option>
                {GROESSEN.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Mitarbeiter" hint="Optional">
              <select
                className={inputClass}
                value={form.mitarbeiter}
                onChange={e => set('mitarbeiter', e.target.value)}
              >
                <option value="">Bitte wählen…</option>
                {MITARBEITER.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Webseite" hint="Optional">
              <input
                type="url"
                className={inputClass + ' sm:col-span-2'}
                placeholder="https://www.dein-restaurant.de"
                value={form.website}
                onChange={e => set('website', e.target.value)}
              />
            </Field>
          </div>
        </div>

        <div className="h-px bg-[#F0EDE7]" />

        {/* Section: Kontakt */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#8BB06A] mb-5">2 · Deine Kontaktdaten</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Vollständiger Name" required>
              <input
                type="text"
                className={inputClass}
                placeholder="Max Mustermann"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                required
              />
            </Field>
            <Field label="Telefonnummer" required>
              <input
                type="tel"
                className={inputClass}
                placeholder="+49 89 123456"
                value={form.telefon}
                onChange={e => set('telefon', e.target.value)}
                required
              />
            </Field>
            <Field label="E-Mail-Adresse" required hint="Wir senden dir eine Bestätigung">
              <input
                type="email"
                className={inputClass + ' sm:col-span-2'}
                placeholder="info@dein-restaurant.de"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                required
              />
            </Field>
          </div>
        </div>

        <div className="h-px bg-[#F0EDE7]" />

        {/* Section: Notizen */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#8BB06A] mb-5">3 · Sonstiges (optional)</p>
          <Field label="Weitere Informationen" hint="Besonderheiten, Fragen, spezielle Anforderungen…">
            <textarea
              className={inputClass + ' resize-none'}
              rows={4}
              placeholder="Was darf ich sonst noch wissen?"
              value={form.notizen}
              onChange={e => set('notizen', e.target.value)}
            />
          </Field>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!valid || submitting}
          className="w-full flex items-center justify-center gap-2 bg-[#8BB06A] text-white font-bold py-4 rounded-2xl text-sm hover:bg-[#6D9450] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-[#8BB06A]/20"
        >
          {submitting
            ? <><Loader2 className="w-4 h-4 animate-spin" />Wird gesendet…</>
            : <>Anfrage absenden <ChevronRight className="w-4 h-4" /></>
          }
        </button>

        <p className="text-center text-xs text-[#1C1F1A]/30">
          Mit dem Absenden stimmst du zu, dass wir deine Daten zur Bearbeitung deiner Anfrage nutzen.
          Keine Weitergabe an Dritte. Keine Newsletter ohne Zustimmung.
        </p>
      </form>
    </div>
  )
}
