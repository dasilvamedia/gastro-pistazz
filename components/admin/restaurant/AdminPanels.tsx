'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2, MapPin, Star, Nfc, Trash2, Plus, CreditCard, UserCog, ExternalLink } from 'lucide-react'
import type { Restaurant } from '@/types'
import { PLANS, PLAN_ORDER, STATUS_LABEL, TRIAL_DAYS, type PlanKey, type SubscriptionStatus } from '@/lib/plans'
import { inputCls, labelCls, sectionCls } from '@/components/admin/RestaurantForm'

// Admin-Zusatzpanels fuer /admin/restaurants/[id]. Jedes Panel speichert
// sofort ueber PATCH /api/admin/restaurants/[id] (unabhaengig vom grossen
// Formular), damit ein Klick auf "Veroeffentlichen" nicht das ganze
// Formular abschickt.

export type PatchFn = (payload: Record<string, unknown>) => Promise<Restaurant | null>

function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative mt-0.5 w-12 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-[#8BB06A]' : 'bg-gray-300'}`}>
        <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : ''}`} />
      </button>
      <span>
        <span className="text-sm font-medium text-[#1C1F1A] block">{label}</span>
        {hint && <span className="text-xs text-gray-400">{hint}</span>}
      </span>
    </label>
  )
}

/* ── Sichtbarkeit, Slug, Farbe ─────────────────────────────────────────── */
export function AdminFlagsPanel({ restaurant, patch }: { restaurant: Restaurant; patch: PatchFn }) {
  const [slug, setSlug] = useState(restaurant.slug)
  const [slugState, setSlugState] = useState<'idle' | 'checking' | 'ok' | 'taken' | 'invalid'>('idle')
  const [color, setColor] = useState(restaurant.primary_color || '#8BB06A')

  useEffect(() => { setSlug(restaurant.slug); setColor(restaurant.primary_color || '#8BB06A') }, [restaurant])

  useEffect(() => {
    if (slug === restaurant.slug) { setSlugState('idle'); return }
    setSlugState('checking')
    const t = setTimeout(async () => {
      const res = await fetch(`/api/admin/restaurants/slug-check?slug=${encodeURIComponent(slug)}&exclude=${restaurant.id}`)
      const j = await res.json()
      setSlugState(!j.valid ? 'invalid' : j.available ? 'ok' : 'taken')
    }, 400)
    return () => clearTimeout(t)
  }, [slug, restaurant.slug, restaurant.id])

  const save = async (payload: Record<string, unknown>, ok: string) => {
    const r = await patch(payload)
    if (r) toast.success(ok)
  }

  return (
    <div className={sectionCls}>
      <h2 className="font-semibold text-[#1C1F1A]">Sichtbarkeit</h2>
      <Switch checked={!!restaurant.is_active} onChange={v => save({ is_active: v }, v ? 'Veröffentlicht, sofort in der App sichtbar' : 'Aus der App genommen')}
        label="Veröffentlicht" hint="Sofort in der App sichtbar, kein App-Update nötig." />
      <Switch checked={!!restaurant.is_verified} onChange={v => save({ is_verified: v }, 'Gespeichert')}
        label="Verifiziert" hint="Blaues Häkchen auf der Restaurantseite." />
      <Switch checked={!!restaurant.is_featured} onChange={v => save({ is_featured: v }, 'Gespeichert')}
        label="Featured" hint="Wird auf der Startseite bevorzugt gezeigt." />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <div>
          <label className={labelCls}>Slug (URL und Login-Name)</label>
          <div className="flex gap-2">
            <input value={slug} onChange={e => setSlug(e.target.value.toLowerCase())} className={`${inputCls} font-mono`} />
            <button type="button" disabled={slugState !== 'ok'}
              onClick={() => save({ slug }, 'Slug geändert. Der Inhaber meldet sich jetzt mit dem neuen Namen an.')}
              className="px-3 py-2 rounded-lg bg-[#1C1F1A] text-white text-xs font-semibold disabled:opacity-40 whitespace-nowrap">
              Ändern
            </button>
          </div>
          <p className={`text-xs mt-1 ${slugState === 'taken' || slugState === 'invalid' ? 'text-red-500' : 'text-amber-600'}`}>
            {slugState === 'checking' ? 'Prüfe ...'
              : slugState === 'taken' ? 'Bereits vergeben'
              : slugState === 'invalid' ? 'Nur Kleinbuchstaben, Zahlen und Bindestriche'
              : slugState === 'ok' ? 'Frei. Achtung: der Slug ist der Login-Name des Inhabers, eine Änderung ändert den Login.'
              : `Login: ${restaurant.slug}@gastro.pistazz.io`}
          </p>
        </div>
        <div>
          <label className={labelCls}>Primärfarbe</label>
          <div className="flex items-center gap-2">
            <input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-10 w-14 rounded-lg border border-gray-200 p-1" />
            <input value={color} onChange={e => setColor(e.target.value)} className={`${inputCls} font-mono`} />
            <button type="button" onClick={() => save({ primary_color: color }, 'Farbe gespeichert')}
              className="px-3 py-2 rounded-lg bg-[#1C1F1A] text-white text-xs font-semibold whitespace-nowrap">OK</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Koordinaten ────────────────────────────────────────────────────────── */
export function GeoPanel({ restaurant, patch, onGeocoded }: { restaurant: Restaurant; patch: PatchFn; onGeocoded: () => void }) {
  const [lat, setLat] = useState(restaurant.latitude != null ? String(restaurant.latitude) : '')
  const [lng, setLng] = useState(restaurant.longitude != null ? String(restaurant.longitude) : '')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    setLat(restaurant.latitude != null ? String(restaurant.latitude) : '')
    setLng(restaurant.longitude != null ? String(restaurant.longitude) : '')
  }, [restaurant])

  const saveCoords = async () => {
    const la = parseFloat(lat.replace(',', '.')), lo = parseFloat(lng.replace(',', '.'))
    if (isNaN(la) || isNaN(lo)) { toast.error('Bitte gültige Zahlen eingeben'); return }
    const r = await patch({ latitude: la, longitude: lo })
    if (r) toast.success('Koordinaten gespeichert')
  }
  const regeocode = async () => {
    setBusy(true)
    const res = await fetch(`/api/admin/restaurants/${restaurant.id}/geocode`, { method: 'POST' })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { toast.error(j.error ?? 'Geokodierung fehlgeschlagen'); return }
    toast.success(`Koordinaten gefunden (${j.source === 'google' ? 'Google' : 'OpenStreetMap'})`)
    onGeocoded()
  }
  const hasCoords = restaurant.latitude != null && restaurant.longitude != null

  return (
    <div className={sectionCls}>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-[#1C1F1A] flex items-center gap-2"><MapPin size={16} className="text-[#6D9450]" /> Standort auf der Karte</h2>
        {!hasCoords && <span className="text-xs text-red-500 font-medium">Fehlt, nicht auf der Karte</span>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Breitengrad</label><input value={lat} onChange={e => setLat(e.target.value)} className={`${inputCls} font-mono`} placeholder="48.7758" /></div>
        <div><label className={labelCls}>Längengrad</label><input value={lng} onChange={e => setLng(e.target.value)} className={`${inputCls} font-mono`} placeholder="9.1829" /></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={saveCoords} className="px-3 py-2 rounded-lg bg-[#1C1F1A] text-white text-xs font-semibold">Koordinaten speichern</button>
        <button type="button" onClick={regeocode} disabled={busy} className="px-3 py-2 rounded-lg bg-[#EEF5E6] text-[#577A3D] text-xs font-semibold disabled:opacity-50 flex items-center gap-1">
          {busy && <Loader2 size={12} className="animate-spin" />} Aus Adresse neu bestimmen
        </button>
        {hasCoords && (
          <a href={`https://www.google.com/maps/search/?api=1&query=${restaurant.latitude},${restaurant.longitude}`} target="_blank" rel="noopener noreferrer"
            className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold flex items-center gap-1">
            In Google Maps prüfen <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  )
}

/* ── Stempelkarte + NFC-Tags ────────────────────────────────────────────── */
type Tag = { id: string; tag_uid: string; label: string | null; created_at: string }

export function StampCardPanel({ restaurant, patch }: { restaurant: Restaurant; patch: PatchFn }) {
  const [total, setTotal] = useState(restaurant.stamp_card_total || 8)
  const [reward, setReward] = useState(restaurant.stamp_card_reward ?? '')
  const [tags, setTags] = useState<Tag[]>([])
  const [uid, setUid] = useState('')
  const [label, setLabel] = useState('')
  useEffect(() => { setTotal(restaurant.stamp_card_total || 8); setReward(restaurant.stamp_card_reward ?? '') }, [restaurant])

  const loadTags = async () => {
    const res = await fetch(`/api/nfc/tags?restaurant_id=${restaurant.id}`)
    if (res.ok) setTags((await res.json()).tags ?? [])
  }
  useEffect(() => { loadTags() }, [restaurant.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const addTag = async () => {
    if (uid.trim().length < 4) { toast.error('Tag-UID fehlt'); return }
    const res = await fetch('/api/nfc/tags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ restaurant_id: restaurant.id, tag_uid: uid, label }) })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) { toast.error(j.error ?? 'Tag konnte nicht gespeichert werden'); return }
    setUid(''); setLabel(''); loadTags(); toast.success('Tag registriert')
  }
  const removeTag = async (id: string) => {
    await fetch('/api/nfc/tags', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ restaurant_id: restaurant.id, id }) })
    loadTags()
  }

  return (
    <div className={sectionCls}>
      <h2 className="font-semibold text-[#1C1F1A] flex items-center gap-2"><Star size={16} className="text-[#E5B84C]" /> Stempelkarte und NFC</h2>
      <Switch checked={!!restaurant.stamp_card_enabled}
        onChange={async v => { const r = await patch({ stamp_card_enabled: v }); if (r) toast.success(v ? 'Stempelkarte aktiviert' : 'Stempelkarte deaktiviert') }}
        label="Stempelkarte aktiv" hint="Gäste sammeln per NFC-Tap, das Restaurant bestätigt die Belohnung." />
      <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr_auto] gap-3 items-end">
        <div><label className={labelCls}>Stempel bis Belohnung</label><input type="number" min={1} max={20} value={total} onChange={e => setTotal(parseInt(e.target.value) || 8)} className={inputCls} /></div>
        <div><label className={labelCls}>Belohnung</label><input value={reward} onChange={e => setReward(e.target.value)} placeholder="z.B. Ein Dessert gratis" className={inputCls} /></div>
        <button type="button" onClick={async () => { const r = await patch({ stamp_card_total: total, stamp_card_reward: reward || null }); if (r) toast.success('Stempelkarte gespeichert') }}
          className="px-3 py-2 rounded-lg bg-[#1C1F1A] text-white text-xs font-semibold h-[38px]">Speichern</button>
      </div>

      <div className="pt-2">
        <p className="text-sm font-medium text-[#1C1F1A] flex items-center gap-2 mb-2"><Nfc size={14} className="text-[#6D9450]" /> NFC-Tags ({tags.length})</p>
        {tags.length > 0 && (
          <ul className="divide-y divide-gray-100 mb-3">
            {tags.map(t => (
              <li key={t.id} className="py-2 flex items-center gap-3 text-sm">
                <span className="font-mono text-xs text-[#1C1F1A]" data-copyable="true">{t.tag_uid}</span>
                <span className="text-gray-400 text-xs flex-1 truncate">{t.label ?? ''}</span>
                <button type="button" onClick={() => removeTag(t.id)} className="text-gray-400 hover:text-red-500" aria-label="Tag entfernen"><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
          <input value={uid} onChange={e => setUid(e.target.value.toUpperCase())} placeholder="Tag-UID (z.B. 04A2B3C4D5E6F7)" className={`${inputCls} font-mono`} />
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Bezeichnung (Theke, Tisch 3)" className={inputCls} />
          <button type="button" onClick={addTag} className="px-3 py-2 rounded-lg bg-[#EEF5E6] text-[#577A3D] text-xs font-semibold flex items-center gap-1 justify-center"><Plus size={12} /> Tag</button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Die UID liest der Inhaber in der App unter Stempelkarte per Scan ein. Hier kannst du sie auch von Hand eintragen.</p>
      </div>
    </div>
  )
}

/* ── Abo / Testphase ────────────────────────────────────────────────────── */
type Sub = { id: string; plan: PlanKey; status: SubscriptionStatus; trial_ends_at: string | null; monthly_fee: number; setup_fee: number; setup_paid: boolean; custom_note: string | null } | null

export function PlanPanel({ restaurantId, subscription, onChanged }: { restaurantId: string; subscription: Sub; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const [extend, setExtend] = useState(14)
  const act = async (body: Record<string, unknown>, ok: string) => {
    setBusy(true)
    const res = await fetch('/api/admin/subscriptions/upsert', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ restaurant_id: restaurantId, ...body }) })
    setBusy(false)
    if (!res.ok) { toast.error('Aktion fehlgeschlagen'); return }
    toast.success(ok); onChanged()
  }
  const st = subscription ? STATUS_LABEL[subscription.status] : null
  const daysLeft = subscription?.trial_ends_at ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / 86400000)) : null

  return (
    <div className={sectionCls}>
      <h2 className="font-semibold text-[#1C1F1A] flex items-center gap-2"><CreditCard size={16} className="text-[#6D9450]" /> Paket und Testphase</h2>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {st ? <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: st.bg, color: st.color }}>{st.emoji} {st.label}</span>
            : <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Kein Abo</span>}
        {subscription && <span className="text-gray-600">{PLANS[subscription.plan]?.name ?? subscription.plan}, {subscription.monthly_fee} €/Monat, Setup {subscription.setup_fee} € {subscription.setup_paid ? '(bezahlt)' : '(offen)'}</span>}
        {subscription?.status === 'trial' && daysLeft != null && <span className={`text-xs ${daysLeft <= 3 ? 'text-red-500' : 'text-gray-400'}`}>noch {daysLeft} Tage</span>}
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <select disabled={busy} value={subscription?.plan ?? ''} onChange={e => act({ plan: e.target.value }, 'Paket geändert')} className={`${inputCls} !w-auto`}>
          {!subscription && <option value="">Paket wählen</option>}
          {PLAN_ORDER.map(k => <option key={k} value={k}>{PLANS[k].name}, {PLANS[k].price_monthly} €</option>)}
        </select>
        <button disabled={busy} onClick={() => act({ trial_duration_days: TRIAL_DAYS }, `Testphase ${TRIAL_DAYS} Tage gestartet`)} className="px-3 py-2 rounded-lg bg-[#8BB06A] text-white text-xs font-semibold">Test {TRIAL_DAYS} Tage starten</button>
        <div className="flex items-center gap-1">
          <input type="number" min={1} max={365} value={extend} onChange={e => setExtend(parseInt(e.target.value) || 14)} className={`${inputCls} !w-20`} />
          <button disabled={busy} onClick={() => act({ extend_trial_days: extend }, `Um ${extend} Tage verlängert`)} className="px-3 py-2 rounded-lg bg-amber-100 text-amber-700 text-xs font-semibold">+Tage</button>
        </div>
        <button disabled={busy} onClick={() => act({ end_trial: true, convert_to_paid: true }, 'Als zahlender Kunde aktiviert')} className="px-3 py-2 rounded-lg bg-green-100 text-green-700 text-xs font-semibold">Zahlend aktivieren</button>
        <button disabled={busy} onClick={() => act({ end_trial: true, convert_to_paid: false }, 'Testphase beendet')} className="px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-semibold">Beenden</button>
      </div>
    </div>
  )
}

/* ── Inhaber ─────────────────────────────────────────────────────────────── */
export function OwnerPanel({ restaurant, owner }: { restaurant: Restaurant; owner: { id: string; full_name: string | null; email: string | null } | null }) {
  return (
    <div className={sectionCls}>
      <h2 className="font-semibold text-[#1C1F1A] flex items-center gap-2"><UserCog size={16} className="text-[#6D9450]" /> Inhaber-Konto</h2>
      {owner ? (
        <div className="text-sm text-[#1C1F1A]">
          <p className="font-medium">{owner.full_name ?? 'Ohne Namen'}</p>
          <p className="text-xs text-gray-500 font-mono" data-copyable="true">{owner.email ?? `${restaurant.slug}@gastro.pistazz.io`}</p>
          <p className="text-xs text-gray-400 mt-1">Login-Name: <span className="font-mono">{restaurant.slug}</span> auf gastro.pistazz.io/restaurant-login</p>
        </div>
      ) : (
        <p className="text-sm text-amber-600">Kein Inhaber verknüpft.</p>
      )}
      <a href={`/admin/accounts?restaurant=${restaurant.id}`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#EEF5E6] text-[#577A3D] text-xs font-semibold">
        Passwort, Magic-Link, Sperren: Konto verwalten <ExternalLink size={12} />
      </a>
    </div>
  )
}
