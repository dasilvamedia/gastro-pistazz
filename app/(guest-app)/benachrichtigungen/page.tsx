'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell, BellRing, CheckCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { enablePush, getPushStatus, pushSupported, type PushStatus } from '@/lib/push/client'

type Row = { id: string; title: string; body: string | null; action_url: string | null; is_read: boolean; created_at: string; restaurant: { name: string } | null }

function dayLabel(iso: string) {
  const d = new Date(iso), today = new Date()
  const diff = Math.floor((new Date(today.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000)
  if (diff === 0) return 'Heute'
  if (diff === 1) return 'Gestern'
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })
}

// In-App-Inbox: alle Benachrichtigungen des Gastes, nach Tag gruppiert.
// Oben eine Karte, um Push auf dem Geraet einzuschalten (nur per Geste).
export default function BenachrichtigungenPage() {
  const router = useRouter()
  const supabase = createClient()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [pushStatus, setPushStatus] = useState<PushStatus>('unsupported')
  const [enabling, setEnabling] = useState(false)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }
    const { data } = await supabase
      .from('notifications')
      .select('id, title, body, action_url, is_read, created_at, restaurant:restaurants(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)
    setRows((data ?? []) as unknown as Row[])
    setLoading(false)
  }, [supabase, router])

  useEffect(() => { load(); getPushStatus().then(setPushStatus) }, [load])

  const markRead = async (ids: string[]) => {
    if (ids.length === 0) return
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).in('id', ids)
    setRows(prev => prev.map(r => ids.includes(r.id) ? { ...r, is_read: true } : r))
    window.dispatchEvent(new CustomEvent('pz:notifications-read'))
  }

  const open = async (r: Row) => {
    if (!r.is_read) markRead([r.id])
    if (r.action_url) router.push(r.action_url)
  }

  const turnOn = async () => {
    setEnabling(true)
    try {
      const s = await enablePush({ onNavigate: url => router.push(url) })
      setPushStatus(s)
      if (s === 'granted') toast.success('Push ist an. Wir melden uns, wenn es etwas Neues gibt.')
      else if (s === 'denied') toast.error('Push ist in den Geräte-Einstellungen blockiert.')
    } catch { toast.error('Push konnte nicht aktiviert werden') }
    setEnabling(false)
  }

  const unread = rows.filter(r => !r.is_read)
  const groups = rows.reduce<Record<string, Row[]>>((acc, r) => { (acc[dayLabel(r.created_at)] ??= []).push(r); return acc }, {})

  return (
    <div className="min-h-screen bg-[#EEF5E6] pb-24">
      <div className="px-5 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 bg-white rounded-full flex items-center justify-center border border-[#D4E8C2]">
          <ArrowLeft size={18} className="text-[#6D9450]" />
        </button>
        <h1 className="text-2xl font-bold text-[#1C1F1A] flex-1" style={{ fontFamily: 'DM Serif Display, serif' }}>Benachrichtigungen</h1>
        {unread.length > 0 && (
          <button onClick={() => markRead(unread.map(r => r.id))} className="text-xs font-semibold text-[#577A3D] flex items-center gap-1">
            <CheckCheck size={14} /> Alle gelesen
          </button>
        )}
      </div>

      <div className="px-5 space-y-4">
        {pushSupported() && pushStatus !== 'granted' && (
          <div className="bg-white rounded-2xl p-4 border border-[#D4E8C2] flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EEF5E6] flex items-center justify-center shrink-0"><BellRing size={20} className="text-[#6D9450]" /></div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#1C1F1A]">Nichts mehr verpassen</p>
              <p className="text-xs text-[#6D9450] mt-0.5">
                {pushStatus === 'denied'
                  ? 'Push ist blockiert. Erlaube Mitteilungen unter Einstellungen, Pistazz, Mitteilungen.'
                  : 'Wir sagen dir Bescheid, wenn deine Story freigegeben ist, deine Stempelkarte voll ist oder ein Deal auf dich wartet.'}
              </p>
              {pushStatus !== 'denied' && (
                <button onClick={turnOn} disabled={enabling} className="mt-3 px-4 py-2 rounded-full gradient-primary text-white text-xs font-bold disabled:opacity-60">
                  {enabling ? 'Wird aktiviert ...' : 'Benachrichtigungen aktivieren'}
                </button>
              )}
            </div>
          </div>
        )}

        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)
        ) : rows.length === 0 ? (
          <div className="text-center py-16">
            <Bell size={40} className="mx-auto text-[#8BB06A]/40 mb-3" />
            <p className="text-[#6D9450] font-medium">Noch keine Benachrichtigungen</p>
          </div>
        ) : (
          Object.entries(groups).map(([day, items]) => (
            <div key={day}>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#6D9450] mb-2 px-1">{day}</p>
              <div className="space-y-2">
                {items.map(r => (
                  <button key={r.id} onClick={() => open(r)}
                    className={`w-full text-left bg-white rounded-2xl p-4 border flex gap-3 ${r.is_read ? 'border-[#EEF5E6]' : 'border-[#8BB06A]'}`}>
                    <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${r.is_read ? 'bg-transparent' : 'bg-[#8BB06A]'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm text-[#1C1F1A] ${r.is_read ? 'font-medium' : 'font-bold'}`}>{r.title}</p>
                      {r.body && <p className="text-xs text-[#6D7A6D] mt-0.5 leading-relaxed">{r.body}</p>}
                      <p className="text-[11px] text-[#9AA795] mt-1">
                        {r.restaurant?.name ? `${r.restaurant.name}, ` : ''}{new Date(r.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
