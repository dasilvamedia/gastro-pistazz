'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Send, BellRing, Radio } from 'lucide-react'

// Super-Admin: Push & Nachrichten plattformweit. Segmente: alle Gaeste,
// Stadt, Kunden eines Restaurants, alle Inhaber, Test an mich.

type Segment = 'alle' | 'stadt' | 'restaurant' | 'inhaber' | 'test'
type RestaurantOpt = { id: string; name: string; city: string | null }
type Campaign = { id: string; scope: string; segment: string; title: string; recipient_count: number; push_sent: number; created_at: string; restaurant: { name: string } | null }

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: 'test', label: 'Test an mich' },
  { key: 'alle', label: 'Alle Gaeste' },
  { key: 'stadt', label: 'Gaeste einer Stadt' },
  { key: 'restaurant', label: 'Kunden eines Restaurants' },
  { key: 'inhaber', label: 'Alle Inhaber' },
]

export default function AdminNachrichtenPage() {
  const [segment, setSegment] = useState<Segment>('test')
  const [restaurants, setRestaurants] = useState<RestaurantOpt[]>([])
  const [restaurantId, setRestaurantId] = useState('')
  const [city, setCity] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [url, setUrl] = useState('')
  const [push, setPush] = useState(true)
  const [sending, setSending] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])

  const loadCampaigns = async () => {
    const res = await fetch('/api/dashboard/campaigns')
    if (res.ok) setCampaigns((await res.json()).campaigns ?? [])
  }
  useEffect(() => {
    fetch('/api/admin/restaurants').then(r => r.ok ? r.json() : null).then(j => setRestaurants((j?.restaurants ?? []).map((r: RestaurantOpt) => ({ id: r.id, name: r.name, city: r.city }))))
    loadCampaigns()
  }, [])

  const cities = [...new Set(restaurants.map(r => r.city).filter(Boolean) as string[])].sort()

  const send = async () => {
    if (!title.trim() || !body.trim()) { toast.error('Titel und Nachricht fehlen'); return }
    if (segment === 'restaurant' && !restaurantId) { toast.error('Restaurant waehlen'); return }
    if (segment === 'stadt' && !city) { toast.error('Stadt waehlen'); return }
    if (segment === 'alle' && !confirm('Wirklich an ALLE Gaeste der Plattform senden?')) return
    setSending(true)
    const isRestaurant = segment === 'restaurant'
    const res = await fetch('/api/notifications/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: isRestaurant ? 'restaurant' : 'global',
        restaurant_id: isRestaurant ? restaurantId : undefined,
        segment: isRestaurant ? 'alle' : segment,
        city: segment === 'stadt' ? city : undefined,
        title: title.trim(), body: body.trim(), url: url.trim() || undefined, push,
      }),
    })
    const j = await res.json().catch(() => ({}))
    setSending(false)
    if (!res.ok) { toast.error(j.error ?? 'Senden fehlgeschlagen'); return }
    toast.success(`Gesendet an ${j.recipients} Empfaenger (${j.push.web + j.push.ios} Push, ${j.inbox} Inbox)`)
    setTitle(''); setBody(''); setUrl('')
    loadCampaigns()
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#8BB06A] bg-white'

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-[#1C1F1A] flex items-center gap-2"><Radio className="text-[#6D9450]" /> Push & Nachrichten</h1>
        <p className="text-sm text-gray-500 mt-1">In-App-Inbox plus Push (iOS-App ab Build 20, Web-Push im Browser). Erst mit Test an mich pruefen.</p>
      </div>

      <div className="glass rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          {SEGMENTS.map(s => (
            <button key={s.key} onClick={() => setSegment(s.key)}
              className={`px-3.5 py-2 rounded-full text-sm font-medium ${segment === s.key ? 'bg-[#1C1F1A] text-white' : 'bg-gray-100 text-gray-600'}`}>
              {s.label}
            </button>
          ))}
        </div>
        {segment === 'restaurant' && (
          <select value={restaurantId} onChange={e => setRestaurantId(e.target.value)} className={inputCls}>
            <option value="">Restaurant waehlen</option>
            {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}{r.city ? `, ${r.city}` : ''}</option>)}
          </select>
        )}
        {segment === 'stadt' && (
          <select value={city} onChange={e => setCity(e.target.value)} className={inputCls}>
            <option value="">Stadt waehlen</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titel (max. 80 Zeichen)" maxLength={80} className={inputCls} />
        <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Nachricht (max. 500 Zeichen)" maxLength={500} rows={4} className={`${inputCls} resize-none`} />
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Ziel-Link in der App (optional), z.B. /deals" className={inputCls} />
        <div className="flex items-center justify-between flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={push} onChange={e => setPush(e.target.checked)} className="w-4 h-4 accent-[#8BB06A]" />
            <BellRing size={14} /> Auch als Push
          </label>
          <button onClick={send} disabled={sending} className="px-5 py-2.5 rounded-lg gradient-primary text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2">
            <Send size={14} /> {sending ? 'Senden ...' : 'Senden'}
          </button>
        </div>
      </div>

      <div className="glass rounded-xl p-5">
        <h2 className="font-semibold text-[#1C1F1A] mb-3">Zuletzt gesendet (alle Restaurants)</h2>
        {campaigns.length === 0 ? <p className="text-sm text-gray-400">Noch nichts gesendet.</p> : (
          <div className="divide-y divide-gray-50">
            {campaigns.map(c => (
              <div key={c.id} className="flex items-center justify-between py-2.5 gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1C1F1A] truncate">{c.title}</p>
                  <p className="text-xs text-gray-400 truncate">{c.scope === 'global' ? 'Plattform' : c.restaurant?.name ?? 'Restaurant'}, {c.segment}, {c.recipient_count} Empfaenger, {c.push_sent} Push</p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{new Date(c.created_at).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
