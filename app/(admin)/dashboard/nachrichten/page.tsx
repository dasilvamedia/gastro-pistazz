'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Send, Users, BellRing, Search } from 'lucide-react'
import { PlanGate } from '@/components/admin/PlanGate'

// Gaeste-Nachrichten des Restaurants: Segmente aus den EIGENEN Kunden
// (restaurant_customers), Zustellung als In-App-Inbox + Push ueber
// /api/notifications/send. Vorher schrieb diese Seite an alle Profile der
// Plattform und niemand las die Nachrichten.

type SegmentKey = 'alle' | 'aktiv' | 'inaktiv' | 'bronze' | 'silber' | 'gold' | 'platin' | 'stempel_fast_voll'
type MsgType = 'einzeln' | 'segment'
type Customer = { id: string; name: string; tier: string | null; last_activity_at: string | null }
type Campaign = { id: string; segment: string; title: string; body: string | null; recipient_count: number; push_sent: number; created_at: string }

const SEGMENTS: { key: SegmentKey; label: string; hint: string }[] = [
  { key: 'alle', label: 'Alle Kunden', hint: 'Jeder Gast, der bei dir gestempelt, eingeloest, gepostet oder dich gespeichert hat' },
  { key: 'aktiv', label: 'Aktiv (30 Tage)', hint: 'Zuletzt innerhalb der letzten 30 Tage aktiv' },
  { key: 'inaktiv', label: 'Inaktiv (30 Tage)', hint: 'Laenger als 30 Tage nichts, ideal zum Zurueckholen' },
  { key: 'stempel_fast_voll', label: 'Stempelkarte fast voll', hint: 'Noch 1 bis 2 Stempel bis zur Belohnung' },
  { key: 'gold', label: 'Gold', hint: 'Tier Gold' },
  { key: 'platin', label: 'Platin', hint: 'Tier Platin' },
  { key: 'silber', label: 'Silber', hint: 'Tier Silber' },
  { key: 'bronze', label: 'Bronze', hint: 'Tier Bronze' },
]

const TEMPLATES = [
  { label: 'Event ankuendigen', icon: '🎉', title: 'Einladung zu unserem Event', body: 'Wir laden dich herzlich zu unserem naechsten Event ein. Komm vorbei und geniesse tolle Angebote.' },
  { label: 'Spezial-Deal', icon: '💰', title: 'Exklusiver Deal nur fuer dich', body: 'Als treuer Gast bekommst du heute einen besonderen Rabatt. Komm vorbei und loese deinen Deal ein.' },
  { label: 'Stempel-Erinnerung', icon: '⭐', title: 'Fast geschafft', body: 'Dir fehlen nur noch wenige Stempel bis zu deiner Belohnung. Wir freuen uns auf dich.' },
  { label: 'Feedback', icon: '💬', title: 'Wie war dein Besuch?', body: 'Wir hoffen, dir hat dein letzter Besuch bei uns gefallen. Teile ein Foto und sammle Punkte.' },
]

function NachrichtenInner() {
  const [msgType, setMsgType] = useState<MsgType>('segment')
  const [segment, setSegment] = useState<SegmentKey>('alle')
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Customer | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [push, setPush] = useState(true)
  const [sending, setSending] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])

  const loadCampaigns = async () => {
    const res = await fetch('/api/dashboard/campaigns')
    if (res.ok) setCampaigns((await res.json()).campaigns ?? [])
  }

  useEffect(() => {
    fetch('/api/notifications/segment-count').then(r => r.ok ? r.json() : null).then(j => {
      if (!j) return
      setCounts(j.counts ?? {})
      setCustomers(j.customers ?? [])
    })
    loadCampaigns()
  }, [])

  const send = async () => {
    if (!title.trim() || !body.trim()) { toast.error('Bitte Titel und Nachricht ausfuellen'); return }
    if (msgType === 'einzeln' && !selected) { toast.error('Bitte Empfaenger auswaehlen'); return }
    setSending(true)
    const res = await fetch('/api/notifications/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: 'restaurant',
        segment: msgType === 'einzeln' ? 'einzeln' : segment,
        user_ids: msgType === 'einzeln' && selected ? [selected.id] : undefined,
        title: title.trim(), body: body.trim(), push,
      }),
    })
    const j = await res.json().catch(() => ({}))
    setSending(false)
    if (!res.ok) { toast.error(j.error ?? 'Senden fehlgeschlagen'); return }
    toast.success(`An ${j.recipients} ${j.recipients === 1 ? 'Gast' : 'Gaeste'} gesendet${push ? `, ${j.push.web + j.push.ios} Push` : ''}`)
    setTitle(''); setBody(''); setSelected(null); setSearch('')
    loadCampaigns()
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#8BB06A]'
  const filteredCustomers = search.length >= 2 ? customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).slice(0, 8) : []
  const recipientCount = msgType === 'einzeln' ? (selected ? 1 : 0) : (counts[segment] ?? 0)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1C1F1A]">Nachrichten</h1>
        <p className="text-sm text-gray-500 mt-1">Erreiche deine Gaeste direkt in der App und per Push. Maximal 2 Kampagnen pro Tag, damit es nicht nervt.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass rounded-xl p-5 space-y-4">
          <div className="flex gap-2">
            {(['segment', 'einzeln'] as MsgType[]).map(t => (
              <button key={t} onClick={() => setMsgType(t)}
                className={`flex-1 py-2 text-sm rounded-lg border transition-colors font-medium ${msgType === t ? 'bg-[#8BB06A] text-white border-[#8BB06A]' : 'border-gray-300 text-gray-500'}`}>
                {t === 'segment' ? 'Segment' : 'Einzelner Gast'}
              </button>
            ))}
          </div>

          {msgType === 'einzeln' ? (
            <div className="relative">
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3">
                <Search size={14} className="text-gray-400" />
                <input value={search} onChange={e => { setSearch(e.target.value); setSelected(null) }} placeholder="Gast suchen (nur deine Kunden)" className="flex-1 py-2 text-sm outline-none bg-transparent" />
              </div>
              {filteredCustomers.length > 0 && !selected && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 mt-1 overflow-hidden">
                  {filteredCustomers.map(c => (
                    <button key={c.id} onClick={() => { setSelected(c); setSearch(c.name) }} className="w-full text-left px-3 py-2 hover:bg-[#EEF5E6] text-sm">
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.tier ?? ''}{c.last_activity_at ? `, zuletzt ${new Date(c.last_activity_at).toLocaleDateString('de-DE')}` : ''}</p>
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2">{customers.length} Kunden insgesamt</p>
            </div>
          ) : (
            <div className="space-y-1">
              {SEGMENTS.map(s => (
                <button key={s.key} onClick={() => setSegment(s.key)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between gap-2 ${segment === s.key ? 'bg-[#EEF5E6] text-[#6D9450] font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                  <span>{s.label}</span>
                  <span className="text-xs text-gray-400">{counts[s.key] ?? 0}</span>
                </button>
              ))}
              <p className="text-xs text-gray-400 px-3 pt-2">{SEGMENTS.find(s => s.key === segment)?.hint}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 glass rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm text-gray-600 flex items-center gap-1.5"><Users size={14} /> {recipientCount} {recipientCount === 1 ? 'Empfaenger' : 'Empfaenger'}</span>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={push} onChange={e => setPush(e.target.checked)} className="w-4 h-4 accent-[#8BB06A]" />
              <BellRing size={14} /> Auch als Push senden
            </label>
          </div>

          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titel (max. 80 Zeichen)" maxLength={80} className={inputCls} />
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Nachricht (max. 500 Zeichen)" maxLength={500} rows={5} className={`${inputCls} resize-none`} />

          <div>
            <p className="text-xs text-gray-500 mb-2 font-medium">Vorlagen</p>
            <div className="flex gap-2 flex-wrap">
              {TEMPLATES.map(t => (
                <button key={t.label} onClick={() => { setTitle(t.title); setBody(t.body) }}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs hover:border-[#8BB06A] hover:text-[#8BB06A] transition-colors">
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={send} disabled={sending || recipientCount === 0}
            className="w-full gradient-primary py-3 rounded-lg text-white font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
            <Send size={16} /> {sending ? 'Senden ...' : `An ${recipientCount} senden`}
          </button>
        </div>
      </div>

      <div className="glass rounded-xl p-5">
        <h2 className="font-semibold text-[#1C1F1A] mb-3">Gesendete Kampagnen</h2>
        {campaigns.length === 0 ? (
          <p className="text-sm text-gray-400">Noch nichts gesendet.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {campaigns.map(c => (
              <div key={c.id} className="flex items-center justify-between py-2.5 gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1C1F1A] truncate">{c.title}</p>
                  <p className="text-xs text-gray-400 truncate">{SEGMENTS.find(s => s.key === c.segment)?.label ?? c.segment}, {c.recipient_count} Empfaenger, {c.push_sent} Push</p>
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

export default function NachrichtenPage() {
  return (
    <PlanGate feature="has_messaging">
      <NachrichtenInner />
    </PlanGate>
  )
}
