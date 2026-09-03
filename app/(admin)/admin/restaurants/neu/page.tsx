'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Loader2, ChevronDown, Copy, Check, MessageCircle, Pencil, Eye, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/slug'
import { RESTAURANT_TYPE_LABELS, type RestaurantType } from '@/types'
import { TRIAL_DAYS } from '@/lib/plans'
import { openWebsite } from '@/lib/nativeLinks'

// 1-Klick-Anlage: Name + Stadt, Rest optional. Ergebnis: Login-Name,
// einmalig sichtbares Passwort, Magic-Link, WhatsApp-Versand, direkt
// bearbeiten oder in der Kundenansicht pruefen.

type Result = {
  restaurant_id: string; slug: string; login_name: string; login_url: string
  password: string; magic_link: string | null; geocoded: boolean; geo_source: string | null
  trial_started: boolean; published: boolean
}

const input = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white'
const label = 'block text-sm font-medium text-gray-700 mb-1'

function CopyButton({ value, label: l }: { value: string; label: string }) {
  const [done, setDone] = useState(false)
  return (
    <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500) } catch { toast.error('Kopieren nicht moeglich') } }}
      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold" aria-label={`${l} kopieren`}>
      {done ? <Check size={12} className="text-green-600" /> : <Copy size={12} />} {done ? 'Kopiert' : 'Kopieren'}
    </button>
  )
}

function NeuesRestaurantForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const leadId = searchParams.get('lead_id')
  const supabase = createClient()

  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [type, setType] = useState<RestaurantType>('restaurant')
  const [more, setMore] = useState(false)
  const [address, setAddress] = useState(''); const [zip, setZip] = useState('')
  const [phone, setPhone] = useState(''); const [instagram, setInstagram] = useState('')
  const [website, setWebsite] = useState(''); const [description, setDescription] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [publish, setPublish] = useState(true)
  const [trialDays, setTrialDays] = useState<number>(TRIAL_DAYS)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [leadName, setLeadName] = useState<string | null>(null)

  useEffect(() => { if (!slugTouched) setSlug(slugify(name)) }, [name, slugTouched])

  // Lead vorbefuellen
  useEffect(() => {
    if (!leadId) return
    supabase.from('leads').select('*').eq('id', leadId).maybeSingle().then(({ data }) => {
      if (!data) return
      const l = data as Record<string, string | null>
      setLeadName(l.name ?? null)
      if (l.name) setName(l.name)
      if (l.stadt) setCity(l.stadt)
      if (l.adresse) setAddress(l.adresse)
      if (l.plz) setZip(l.plz)
      if (l.telefon) setPhone(l.telefon)
      if (l.website) setWebsite(l.website)
      if (l.adresse || l.telefon || l.website) setMore(true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2 || city.trim().length < 2) { toast.error('Name und Stadt sind Pflicht'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/restaurant/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, city, slug: slugTouched ? slug : undefined, type,
          address, zip, phone, website, instagram_handle: instagram, description,
          owner_name: ownerName || undefined, publish, trial_days: trialDays,
          lead_id: leadId ?? undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler beim Erstellen')
      setResult(data as Result)
      toast.success('Restaurant angelegt')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Erstellen')
    } finally {
      setSubmitting(false)
    }
  }

  const kundenansicht = () => {
    if (!result) return
    document.cookie = `impersonate_restaurant_id=${result.restaurant_id}; path=/; max-age=3600`
    document.cookie = `impersonate_restaurant_name=${encodeURIComponent(name)}; path=/; max-age=3600`
    router.push('/dashboard')
  }

  if (result) {
    const waText = encodeURIComponent(
      `Willkommen bei Pistazz, ${name}!\n\nDein Restaurant-Dashboard:\n${result.login_url}\nLogin-Name: ${result.login_name}\nPasswort: ${result.password}\n\n${result.trial_started ? `Du hast ${trialDays} Tage alle Funktionen kostenlos. ` : ''}Bei Fragen einfach antworten.`
    )
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-5">
        <div className="bg-white rounded-2xl border border-[#D4E8C2] p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-[#EEF5E6] flex items-center justify-center"><Sparkles className="text-[#6D9450]" /></div>
            <div>
              <h1 className="text-xl font-serif text-charcoal">{name} ist angelegt</h1>
              <p className="text-xs text-gray-500">
                {result.published ? 'Sofort in der App sichtbar.' : 'Noch nicht veröffentlicht.'}
                {result.geocoded ? ` Standort gefunden (${result.geo_source === 'google' ? 'Google' : 'OpenStreetMap'}).` : ' Standort fehlt, bitte im Editor setzen.'}
                {result.trial_started ? ` Testphase ${trialDays} Tage läuft.` : ''}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Row label="Login-Seite" value={result.login_url} />
            <Row label="Login-Name" value={result.login_name} mono />
            <Row label="Passwort (wird nicht erneut angezeigt)" value={result.password} mono highlight />
            {result.magic_link && <Row label="Magic-Link (einmalig, 1 Stunde gültig)" value={result.magic_link} small />}
          </div>

          <div className="flex flex-wrap gap-2 mt-5">
            <button onClick={() => openWebsite(`https://wa.me/?text=${waText}`)} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-semibold">
              <MessageCircle size={16} /> Per WhatsApp senden
            </button>
            <Link href={`/admin/restaurants/${result.restaurant_id}`} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1C1F1A] text-white text-sm font-semibold">
              <Pencil size={14} /> Restaurant bearbeiten
            </Link>
            <button onClick={kundenansicht} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background: '#FF6B35' }}>
              <Eye size={14} /> Kundenansicht
            </button>
          </div>
        </div>
        <Link href="/admin/restaurants" className="inline-flex items-center gap-1 text-sm text-gray-500"><ChevronLeft size={16} /> Zur Liste</Link>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/restaurants" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-charcoal transition-colors mb-4">
          <ChevronLeft className="w-4 h-4" /> Zurück zur Liste
        </Link>
        <h1 className="text-2xl font-serif text-charcoal">Neues Restaurant</h1>
        <p className="text-sm text-gray-500 mt-1">Name und Stadt reichen. Login, Passwort, Standort und Testphase werden automatisch angelegt.</p>
        {leadName && <p className="text-sm text-primary mt-1">Aus Lead: {leadName}</p>}
      </div>

      <form onSubmit={submit} className="space-y-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} className={input} placeholder="Pizza Mario" autoFocus />
            </div>
            <div>
              <label className={label}>Stadt *</label>
              <input value={city} onChange={e => setCity(e.target.value)} className={input} placeholder="Stuttgart" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>Typ</label>
              <select value={type} onChange={e => setType(e.target.value as RestaurantType)} className={input}>
                {(Object.keys(RESTAURANT_TYPE_LABELS) as RestaurantType[]).map(t => <option key={t} value={t}>{RESTAURANT_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Login-Name</label>
              <input value={slug} onChange={e => { setSlugTouched(true); setSlug(e.target.value.toLowerCase()) }} className={`${input} font-mono`} />
              <p className="text-xs text-gray-400 mt-1">{slug ? `${slug}@gastro.pistazz.io` : 'wird aus dem Namen gebildet'}{slugTouched ? '' : ' (automatisch, bei Kollision mit Zahl)'}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={publish} onChange={e => setPublish(e.target.checked)} className="w-4 h-4 accent-[#8BB06A]" />
              Sofort veröffentlichen
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              Testphase
              <select value={trialDays} onChange={e => setTrialDays(Number(e.target.value))} className="px-2 py-1 border border-gray-200 rounded-lg text-sm bg-white">
                <option value={TRIAL_DAYS}>{TRIAL_DAYS} Tage</option>
                <option value={14}>14 Tage</option>
                <option value={0}>keine</option>
              </select>
            </label>
          </div>
        </div>

        <button type="button" onClick={() => setMore(v => !v)} className="w-full flex items-center justify-between px-5 py-3 bg-white rounded-2xl border border-gray-100 text-sm font-medium text-gray-600">
          Weitere Angaben (optional)
          <ChevronDown size={16} className={`transition-transform ${more ? 'rotate-180' : ''}`} />
        </button>
        {more && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2"><label className={label}>Adresse</label><input value={address} onChange={e => setAddress(e.target.value)} className={input} placeholder="Musterstraße 1" /></div>
              <div><label className={label}>PLZ</label><input value={zip} onChange={e => setZip(e.target.value)} className={input} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={label}>Telefon</label><input value={phone} onChange={e => setPhone(e.target.value)} className={input} /></div>
              <div><label className={label}>Instagram</label><input value={instagram} onChange={e => setInstagram(e.target.value)} className={input} placeholder="pizzamario" /></div>
              <div><label className={label}>Website</label><input value={website} onChange={e => setWebsite(e.target.value)} className={input} placeholder="https://" /></div>
              <div><label className={label}>Inhaber-Name</label><input value={ownerName} onChange={e => setOwnerName(e.target.value)} className={input} placeholder="Marco Rossi" /></div>
            </div>
            <div><label className={label}>Beschreibung</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className={`${input} resize-none`} /></div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pb-8">
          <Link href="/admin/restaurants" className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Abbrechen</Link>
          <button type="submit" disabled={submitting || name.trim().length < 2 || city.trim().length < 2}
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-dark disabled:opacity-50 shadow-sm">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Restaurant anlegen
          </button>
        </div>
      </form>
    </div>
  )
}

function Row({ label: l, value, mono, highlight, small }: { label: string; value: string; mono?: boolean; highlight?: boolean; small?: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl px-3 py-2 ${highlight ? 'bg-[#EEF5E6] border border-[#D4E8C2]' : 'bg-gray-50'}`}>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-500">{l}</p>
        <p className={`text-[#1C1F1A] ${mono ? 'font-mono tracking-wider' : ''} ${small ? 'text-xs break-all' : 'text-sm font-semibold'}`} data-copyable="true">{value}</p>
      </div>
      <CopyButton value={value} label={l} />
    </div>
  )
}

export default function NeuesRestaurantPage() {
  return (
    <Suspense fallback={<div className="p-6"><div className="skeleton h-96 rounded-xl" /></div>}>
      <NeuesRestaurantForm />
    </Suspense>
  )
}
