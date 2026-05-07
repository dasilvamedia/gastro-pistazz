'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { QRCode } from '@/types'
import { QRCodeCanvas } from 'qrcode.react'

interface NotifPrefs {
  new_story: boolean
  new_customer: boolean
  deal_redeemed: boolean
  weekly_report: boolean
}

export default function EinstellungenPage() {
  const supabase = createClient()
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [restaurantSlug, setRestaurantSlug] = useState('')
  const [email, setEmail] = useState('')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [qrCodes, setQrCodes] = useState<QRCode[]>([])
  const [qrLabel, setQrLabel] = useState('')
  const [qrCreating, setQrCreating] = useState(false)
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({ new_story: true, new_customer: true, deal_redeemed: true, weekly_report: false })
  const [deleteOpen, setDeleteOpen] = useState(false)
  const qrRefs = useRef<Record<string, HTMLCanvasElement | null>>({})

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setEmail(user.email ?? '')
      const prefs = user?.user_metadata?.notif_prefs
      if (prefs) setNotifPrefs(prefs)

      fetch('/api/dashboard/restaurant').then(r => r.json()).then(async ({ restaurant: rest }) => {
        if (rest) {
          setRestaurantId(rest.id)
          setRestaurantSlug(rest.slug)
          const { data: codes } = await supabase.from('qr_codes').select('*').eq('restaurant_id', rest.id).order('created_at')
          setQrCodes(codes ?? [])
        }
      }).catch(() => {})
    }
    init()
  }, [supabase])

  const changePassword = async () => {
    if (newPw !== confirmPw) { toast.error('Passwoerter stimmen nicht ueberein'); return }
    if (newPw.length < 6) { toast.error('Mindestens 6 Zeichen'); return }
    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPw })
    if (error) toast.error('Fehler: ' + error.message)
    else { toast.success('Passwort geaendert'); setCurrentPw(''); setNewPw(''); setConfirmPw('') }
    setPwSaving(false)
  }

  const createQR = async () => {
    if (!restaurantId) return
    setQrCreating(true)
    const code = Math.random().toString(36).substring(2, 10).toUpperCase()
    const targetUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.pistazz.io'}/r/${restaurantSlug}?qr=${code}`
    const { data, error } = await supabase.from('qr_codes').insert({ restaurant_id: restaurantId, code, label: qrLabel || null, target_url: targetUrl, is_active: true }).select().single()
    if (error) { toast.error('Fehler'); setQrCreating(false); return }
    setQrCodes(prev => [...prev, data])
    setQrLabel('')
    toast.success('QR-Code erstellt')
    setQrCreating(false)
  }

  const downloadQR = (id: string) => {
    const canvas = qrRefs.current[id]
    if (!canvas) return
    const a = document.createElement('a')
    a.download = `qr-${id}.png`
    a.href = canvas.toDataURL()
    a.click()
  }

  const toggleQR = async (qr: QRCode) => {
    const { error } = await supabase.from('qr_codes').update({ is_active: !qr.is_active }).eq('id', qr.id)
    if (error) { toast.error('Fehler'); return }
    setQrCodes(prev => prev.map(q => q.id === qr.id ? { ...q, is_active: !q.is_active } : q))
  }

  const saveNotifPrefs = async () => {
    const { error } = await supabase.auth.updateUser({ data: { notif_prefs: notifPrefs } })
    if (error) toast.error('Fehler')
    else toast.success('Einstellungen gespeichert')
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#8BB06A]'
  const sectionCls = 'glass rounded-xl p-5 space-y-4'

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[#1C1F1A]">Einstellungen</h1>

      <div className={sectionCls}>
        <h2 className="font-semibold text-[#1C1F1A]">Konto</h2>
        <div>
          <label className="block text-sm font-medium text-[#1C1F1A] mb-1">E-Mail</label>
          <input value={email} readOnly className={`${inputCls} bg-gray-50 text-gray-400`} />
        </div>
        <h3 className="text-sm font-medium text-[#1C1F1A]">Passwort aendern</h3>
        <div className="grid grid-cols-1 gap-3">
          <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Aktuelles Passwort" className={inputCls} />
          <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Neues Passwort" className={inputCls} />
          <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Passwort bestaetigen" className={inputCls} />
        </div>
        <button onClick={changePassword} disabled={pwSaving}
          className="px-4 py-2 rounded-lg gradient-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {pwSaving ? 'Speichern...' : 'Passwort aendern'}
        </button>
      </div>

      <div className={sectionCls}>
        <h2 className="font-semibold text-[#1C1F1A]">QR-Code Generator</h2>
        <div className="flex gap-3">
          <input value={qrLabel} onChange={e => setQrLabel(e.target.value)} placeholder="Label (optional)" className={`${inputCls} flex-1`} />
          <button onClick={createQR} disabled={qrCreating}
            className="px-4 py-2 rounded-lg gradient-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 whitespace-nowrap">
            {qrCreating ? '...' : 'Erstellen'}
          </button>
        </div>

        {qrCodes.length > 0 && (
          <div className="space-y-3">
            {qrCodes.map(qr => (
              <div key={qr.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                <div className="flex-shrink-0">
                  <QRCodeCanvas
                    value={qr.target_url ?? `https://app.pistazz.io/r/${restaurantSlug}?qr=${qr.code}`}
                    size={64}
                    ref={(el: HTMLCanvasElement | null) => { qrRefs.current[qr.id] = el }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1C1F1A]">{qr.label ?? qr.code}</p>
                  <p className="text-xs text-gray-400">{qr.scan_count} Scans</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleQR(qr)}
                    className={`text-xs px-2 py-1 rounded border transition-colors ${qr.is_active ? 'border-[#8BB06A] text-[#8BB06A]' : 'border-gray-300 text-gray-400'}`}>
                    {qr.is_active ? 'Aktiv' : 'Inaktiv'}
                  </button>
                  <button onClick={() => downloadQR(qr.id)}
                    className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-500 hover:bg-gray-100">
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={sectionCls}>
        <h2 className="font-semibold text-[#1C1F1A]">Benachrichtigungen</h2>
        <div className="space-y-3">
          {([
            { key: 'new_story' as const, label: 'Neue Story eingereicht' },
            { key: 'new_customer' as const, label: 'Neuer Kunde registriert' },
            { key: 'deal_redeemed' as const, label: 'Deal eingeloest' },
            { key: 'weekly_report' as const, label: 'Woechentlicher Report' },
          ]).map(({ key, label }) => (
            <label key={key} className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-[#1C1F1A]">{label}</span>
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={notifPrefs[key]}
                  onChange={e => setNotifPrefs(p => ({ ...p, [key]: e.target.checked }))} />
                <div className={`w-10 h-5 rounded-full transition-colors ${notifPrefs[key] ? 'bg-[#8BB06A]' : 'bg-gray-300'}`} />
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow ${notifPrefs[key] ? 'translate-x-5' : ''}`} />
              </div>
            </label>
          ))}
        </div>
        <button onClick={saveNotifPrefs} className="px-4 py-2 rounded-lg gradient-primary text-white text-sm font-medium hover:opacity-90">
          Speichern
        </button>
      </div>

      <div className="glass rounded-xl p-5 border border-red-200">
        <h2 className="font-semibold text-[#E86B5A] mb-2">Gefaehrliche Zone</h2>
        <p className="text-sm text-gray-500 mb-3">Das Loeschen deines Restaurants ist dauerhaft und kann nicht rueckgaengig gemacht werden.</p>
        <button onClick={() => setDeleteOpen(true)}
          className="px-4 py-2 rounded-lg border border-[#E86B5A] text-[#E86B5A] text-sm font-medium hover:bg-red-50 opacity-50 cursor-not-allowed"
          disabled>
          Restaurant loeschen
        </button>
      </div>

      {deleteOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass rounded-xl p-6 max-w-sm w-full mx-4 border border-red-200">
            <h3 className="text-lg font-semibold text-[#E86B5A] mb-2">Achtung!</h3>
            <p className="text-sm text-gray-500 mb-4">Diese Funktion ist noch nicht verfuegbar. Bitte wende dich an den Support.</p>
            <button onClick={() => setDeleteOpen(false)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm hover:bg-gray-50">
              Schliessen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
