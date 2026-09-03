'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Send, BellRing, Radio, Sparkles, RefreshCw } from 'lucide-react'

// Super-Admin: Push & Nachrichten plattformweit. Segmente: alle Gaeste,
// Stadt, Kunden eines Restaurants, alle Inhaber, Test an mich.

type Segment = 'alle' | 'stadt' | 'restaurant' | 'inhaber' | 'test'
type RestaurantOpt = { id: string; name: string; city: string | null }
type Campaign = { id: string; scope: string; segment: string; title: string; recipient_count: number; push_sent: number; created_at: string; restaurant: { name: string } | null }
type Idea = { title: string; body: string }

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: 'test', label: 'Test an mich' },
  { key: 'alle', label: 'Alle Gäste' },
  { key: 'stadt', label: 'Gäste einer Stadt' },
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
  const [aiLoading, setAiLoading] = useState(false)
  const [ideas, setIdeas] = useState<Idea[]>([])

  const loadCampaigns = async () => {
    const res = await fetch('/api/dashboard/campaigns')
    if (res.ok) setCampaigns((await res.json()).campaigns ?? [])
  }
  useEffect(() => {
    fetch('/api/admin/restaurants').then(r => r.ok ? r.json() : null).then(j => setRestaurants((j?.restaurants ?? []).map((r: RestaurantOpt) => ({ id: r.id, name: r.name, city: r.city }))))
    loadCampaigns()
  }, [])

  const cities = [...new Set(restaurants.map(r => r.city).filter(Boolean) as string[])].sort()

  const generateIdeas = async () => {
    setAiLoading(true)
    try {
      const restaurantName = restaurants.find(r => r.id === restaurantId)?.name ?? ''
      const res = await fetch('/api/admin/ai-compose', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segment, restaurantName, city: segment === 'stadt' ? city : '' }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(j.error ?? 'KI-Ideen fehlgeschlagen'); return }
      setIdeas(j.ideas ?? [])
    } finally { setAiLoading(false) }
  }

  const useIdea = (idea: Idea) => {
    setTitle(idea.title.slice(0, 80))
    setBody(idea.body.slice(0, 500))
  }

  const send = async () => {
    if (!title.trim() || !body.trim()) { toast.error('Titel und Nachricht fehlen'); return }
    if (segment === 'restaurant' && !restaurantId) { toast.error('Restaurant wählen'); return }
    if (segment === 'stadt' && !city) { toast.error('Stadt wählen'); return }
    if (segment === 'alle' && !confirm('Wirklich an ALLE Gäste der Plattform senden?')) return
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
    toast.success(`Gesendet an ${j.recipients} Empfänger (${j.push.web + j.push.ios} Push, ${j.inbox} Inbox)`)
    setTitle(''); setBody(''); setUrl('')
    loadCampaigns()
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#8BB06A] bg-white'

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-[#1C1F1A] flex items-center gap-2"><Radio className="text-[#6D9450]" /> Push & Nachrichten</h1>
        <p className="text-sm text-gray-500 mt-1">In-App-Inbox plus Push (iOS-App ab Build 20, Web-Push im Browser). Erst mit Test an mich prüfen.</p>
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
            <option value="">Restaurant wählen</option>
            {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}{r.city ? `, ${r.city}` : ''}</option>)}
          </select>
        )}
        {segment === 'stadt' && (
          <select value={city} onChange={e => setCity(e.target.value)} className={inputCls}>
            <option value="">Stadt wählen</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}

        {/* KI-Ideen */}
        <div className="rounded-lg border border-[#E5EAD9] bg-[#F6FAF0] p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-[#3D7A22] flex items-center gap-1.5">
              <Sparkles size={15} /> KI-Ideen für dieses Segment
            </p>
            <button onClick={generateIdeas} disabled={aiLoading}
              className="px-3 py-1.5 rounded-lg bg-[#577A3D] text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5">
              {aiLoading ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
              {aiLoading ? 'Denke nach …' : ideas.length ? 'Neue Ideen' : 'Ideen holen'}
            </button>
          </div>
          {ideas.length > 0 && (
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {ideas.map((idea, i) => (
                <button key={i} onClick={() => useIdea(idea)}
                  className="text-left rounded-lg border border-gray-200 bg-white p-2.5 hover:border-[#8BB06A] hover:shadow-sm transition-all">
                  <p className="text-xs font-semibold text-[#1C1F1A] line-clamp-2">{idea.title}</p>
                  <p className="text-[11px] text-gray-500 mt-1 line-clamp-3">{idea.body}</p>
                  <p className="text-[10px] text-[#577A3D] mt-1.5 font-medium">Übernehmen →</p>
                </button>
              ))}
            </div>
          )}
        </div>

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
                  <p className="text-xs text-gray-400 truncate">{c.scope === 'global' ? 'Plattform' : c.restaurant?.name ?? 'Restaurant'}, {c.segment}, {c.recipient_count} Empfänger, {c.push_sent} Push</p>
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
