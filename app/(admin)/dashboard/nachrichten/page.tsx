'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Notification, NotificationChannel } from '@/types'

type SegmentKey = 'alle' | 'bronze' | 'silber' | 'gold' | 'platin' | 'inaktiv'
type MsgType = 'einzeln' | 'segment'

const SEGMENTS: { key: SegmentKey; label: string }[] = [
  { key: 'alle', label: 'Alle Kunden' },
  { key: 'bronze', label: 'Bronze' },
  { key: 'silber', label: 'Silber' },
  { key: 'gold', label: 'Gold' },
  { key: 'platin', label: 'Platin' },
  { key: 'inaktiv', label: 'Inaktiv (30 Tage)' },
]

const TEMPLATES = [
  { label: 'Event ankuendigen', icon: '🎉', subject: 'Einladung zu unserem Event!', body: 'Wir laden dich herzlich zu unserem naechsten Event ein. Komm vorbei und genieße tolle Angebote!' },
  { label: 'Spezial-Deal', icon: '💰', subject: 'Exklusiver Deal nur fuer dich!', body: 'Als treuer Gast erhaeltst du heute einen besonderen Rabatt. Komm vorbei und loese deinen Deal ein!' },
  { label: 'Feedback anfragen', icon: '⭐', subject: 'Wie war dein Besuch?', body: 'Wir hoffen, dir hat dein letzter Besuch bei uns gefallen! Teile uns dein Feedback mit und erhalte Bonuspunkte.' },
]

export default function NachrichtenPage() {
  const supabase = createClient()
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [msgType, setMsgType] = useState<MsgType>('segment')
  const [segment, setSegment] = useState<SegmentKey>('alle')
  const [channel, setChannel] = useState<NotificationChannel>('in_app')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedUserName, setSelectedUserName] = useState<string>('')
  const [userResults, setUserResults] = useState<{ id: string; full_name: string | null; email: string }[]>([])
  const [sent, setSent] = useState<Notification[]>([])
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetch('/api/dashboard/restaurant').then(r => r.json()).then(async ({ restaurant: rest }) => {
      if (!rest) return
      setRestaurantId(rest.id)
      const { data: sentData } = await supabase.from('notifications').select('*').eq('restaurant_id', rest.id).order('created_at', { ascending: false }).limit(20)
      setSent(sentData ?? [])
    }).catch(() => {})
  }, [supabase])

  const searchUsers = async (q: string) => {
    setUserSearch(q)
    if (q.length < 2) { setUserResults([]); return }
    const { data } = await supabase.from('profiles').select('id, full_name, email').or(`full_name.ilike.%${q}%,email.ilike.%${q}%`).limit(5)
    setUserResults(data ?? [])
  }

  const applyTemplate = (t: typeof TEMPLATES[0]) => { setSubject(t.subject); setBody(t.body) }

  const sendMessage = async () => {
    if (!restaurantId || !subject || !body) { toast.error('Bitte Betreff und Nachricht ausfullen'); return }
    setSending(true)

    if (msgType === 'einzeln') {
      if (!selectedUserId) { toast.error('Bitte Empfaenger auswaehlen'); setSending(false); return }
      const { error } = await supabase.from('notifications').insert({ user_id: selectedUserId, restaurant_id: restaurantId, channel, title: subject, body })
      if (error) { toast.error('Fehler'); setSending(false); return }
    } else {
      let query = supabase.from('profiles').select('id')
      if (segment !== 'alle' && segment !== 'inaktiv') query = query.eq('tier', segment)
      if (segment === 'inaktiv') {
        const cutoff = new Date(Date.now() - 30 * 86400000).toISOString()
        query = query.lt('updated_at', cutoff)
      }
      const { data: users } = await query
      if (!users || users.length === 0) { toast('Keine Empfaenger gefunden'); setSending(false); return }
      const inserts = users.map((u: { id: string }) => ({ user_id: u.id, restaurant_id: restaurantId, channel, title: subject, body }))
      const { error } = await supabase.from('notifications').insert(inserts)
      if (error) { toast.error('Fehler'); setSending(false); return }
      toast.success(`Nachricht an ${users.length} Empfaenger gesendet`)
    }

    const { data: updatedSent } = await supabase.from('notifications').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(20)
    setSent(updatedSent ?? [])
    setSubject(''); setBody(''); setSending(false)
    if (msgType === 'einzeln') toast.success('Nachricht gesendet')
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#8BB06A]'

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-[#1C1F1A]">Nachrichten</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass rounded-xl p-5 space-y-4">
          <div className="flex gap-2">
            {(['einzeln', 'segment'] as MsgType[]).map(t => (
              <button key={t} onClick={() => setMsgType(t)}
                className={`flex-1 py-2 text-sm rounded-lg border transition-colors font-medium ${msgType === t ? 'bg-[#8BB06A] text-white border-[#8BB06A]' : 'border-gray-300 text-gray-500'}`}>
                {t === 'einzeln' ? 'Einzeln' : 'Segmente'}
              </button>
            ))}
          </div>

          {msgType === 'einzeln' ? (
            <div className="relative">
              <input value={userSearch} onChange={e => searchUsers(e.target.value)}
                placeholder="Kunde suchen..." className={inputCls} />
              {userResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 mt-1">
                  {userResults.map(u => (
                    <button key={u.id} onClick={() => { setSelectedUserId(u.id); setSelectedUserName(u.full_name ?? u.email); setUserResults([]); setUserSearch(u.full_name ?? u.email) }}
                      className="w-full text-left px-3 py-2 hover:bg-[#EEF5E6] text-sm">
                      <p className="font-medium">{u.full_name}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {SEGMENTS.map(s => (
                <button key={s.key} onClick={() => setSegment(s.key)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${segment === s.key ? 'bg-[#EEF5E6] text-[#6D9450] font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 glass rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              {(['in_app', 'email'] as NotificationChannel[]).map(c => (
                <button key={c} onClick={() => setChannel(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${channel === c ? 'bg-[#8BB06A] text-white border-[#8BB06A]' : 'border-gray-300 text-gray-500'}`}>
                  {c === 'in_app' ? 'In-App' : 'E-Mail'}
                </button>
              ))}
            </div>
            {msgType === 'einzeln' && selectedUserName && (
              <span className="text-sm text-gray-500">An: <strong>{selectedUserName}</strong></span>
            )}
            {msgType === 'segment' && (
              <span className="text-sm text-gray-500">Segment: <strong>{SEGMENTS.find(s => s.key === segment)?.label}</strong></span>
            )}
          </div>

          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Betreff" className={inputCls} />
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Nachricht..." rows={5} className={`${inputCls} resize-none`} />

          <div>
            <p className="text-xs text-gray-500 mb-2 font-medium">Vorlagen</p>
            <div className="flex gap-2 flex-wrap">
              {TEMPLATES.map(t => (
                <button key={t.label} onClick={() => applyTemplate(t)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs hover:border-[#8BB06A] hover:text-[#8BB06A] transition-colors">
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={sendMessage} disabled={sending}
            className="w-full gradient-primary py-3 rounded-lg text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
            {sending ? 'Senden...' : 'Senden'}
          </button>
        </div>
      </div>

      {sent.length > 0 && (
        <div className="glass rounded-xl p-5">
          <h2 className="font-semibold text-[#1C1F1A] mb-3">Gesendete Nachrichten</h2>
          <div className="space-y-2">
            {sent.map(n => (
              <div key={n.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                <div>
                  <p className="text-sm font-medium text-[#1C1F1A]">{n.title}</p>
                  <p className="text-xs text-gray-400">{n.body?.substring(0, 60)}...</p>
                </div>
                <span className="text-xs text-gray-400">{new Date(n.created_at).toLocaleDateString('de')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
