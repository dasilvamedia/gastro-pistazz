'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { QRCode } from '@/types'
import { QRCodeCanvas } from 'qrcode.react'
import { useSubscription } from '@/lib/hooks/useSubscription'
import { PLANS, STATUS_LABEL, type PlanKey } from '@/lib/plans'

interface NotifPrefs {
  new_story: boolean
  new_customer: boolean
  deal_redeemed: boolean
  weekly_report: boolean
}

function PlanAnchor({ planRef, subLoading }: { planRef: React.RefObject<HTMLDivElement | null>; subLoading: boolean }) {
  const searchParams = useSearchParams()
  useEffect(() => {
    if (searchParams.get('tab') === 'plan' && planRef.current) {
      setTimeout(() => planRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200)
    }
  }, [searchParams, subLoading, planRef])
  return null
}

export default function EinstellungenPage() {
  const supabase = createClient()
  const planRef = useRef<HTMLDivElement>(null)
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
    if (newPw !== confirmPw) { toast.error('Passwörter stimmen nicht überein'); return }
    if (newPw.length < 8) { toast.error('Mindestens 8 Zeichen'); return }
    setPwSaving(true)
    // Aktuelles Passwort wirklich verifizieren (Re-Auth) — vorher war das Feld reine Fassade
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email && currentPw) {
      const { error: reauthError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPw })
      if (reauthError) {
        toast.error('Aktuelles Passwort ist falsch')
        setPwSaving(false)
        return
      }
    } else if (!currentPw) {
      toast.error('Bitte aktuelles Passwort eingeben')
      setPwSaving(false)
      return
    }
    const { error } = await supabase.auth.updateUser({ password: newPw })
    if (error) toast.error('Fehler: ' + error.message)
    else { toast.success('Passwort geändert'); setCurrentPw(''); setNewPw(''); setConfirmPw('') }
    setPwSaving(false)
  }

  const createQR = async () => {
    if (!restaurantId) return
    setQrCreating(true)
    const code = Math.random().toString(36).substring(2, 10).toUpperCase()
    const targetUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.pistazz.io'}/r/${restaurantSlug}?qr=${code}`
    const res = await fetch('/api/dashboard/qr-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurant_id: restaurantId, code, label: qrLabel || null, target_url: targetUrl }),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Fehler'); setQrCreating(false); return }
    setQrCodes(prev => [...prev, json.qrCode])
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

  const { subscription, loading: subLoading, isTrialActive, isTrialExpired, trialDaysRemaining, isPaid } = useSubscription()

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#8BB06A]'
  const sectionCls = 'glass rounded-xl p-5 space-y-4'

  const planInfo  = subscription ? PLANS[subscription.plan] : null
  const statusInfo = subscription ? STATUS_LABEL[subscription.status] : null

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <Suspense fallback={null}>
        <PlanAnchor planRef={planRef} subLoading={subLoading} />
      </Suspense>
      <h1 className="text-2xl font-bold text-[#1C1F1A]">Einstellungen</h1>

      {/* ── Paket & Abo ────────────────────────────────────── */}
      <div ref={planRef} className={`${sectionCls} scroll-mt-4`} id="plan">
        <h2 className="font-semibold text-[#1C1F1A]">Paket & Abo</h2>

        {subLoading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />)}</div>
        ) : !subscription ? (
          <div className="rounded-xl bg-gray-50 border border-dashed border-gray-200 p-5 text-center">
            <p className="text-sm text-gray-500">Kein aktives Paket gefunden. Bitte wende dich an den Support.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status badge */}
            {statusInfo && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold"
                  style={{ background: statusInfo.bg, color: statusInfo.color }}>
                  {statusInfo.emoji} {statusInfo.label}
                </span>
                {isTrialActive && (
                  <span className="text-sm text-gray-400">noch {trialDaysRemaining} {trialDaysRemaining === 1 ? 'Tag' : 'Tage'} kostenlos</span>
                )}
              </div>
            )}

            {/* Trial: alle drei Pakete als Auswahl */}
            {(isTrialActive || isTrialExpired) ? (
              <>
                <p className="text-xs text-gray-400">Wähle dein Paket, Buchung folgt in Kürze.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(Object.keys(PLANS) as PlanKey[]).map(key => {
                    const p = PLANS[key]
                    const isCurrent = subscription?.plan === key
                    return (
                      <div
                        key={key}
                        className="rounded-xl overflow-hidden relative"
                        style={{
                          background: p.cardBg,
                          color: p.textColor,
                          outline: isCurrent ? `2px solid ${p.color}` : 'none',
                          outlineOffset: '2px',
                        }}
                      >
                        {/* Current plan marker */}
                        {isCurrent && (
                          <div className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                            style={{ background: p.color, color: '#fff' }}>
                            Aktuell
                          </div>
                        )}
                        {p.bestseller && !isCurrent && (
                          <div className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#C5A44E] text-white">
                            Top
                          </div>
                        )}

                        {/* Header */}
                        <div className="px-4 pt-4 pb-2">
                          <p className="text-[9px] font-medium uppercase tracking-widest opacity-40 leading-none mb-0.5">{p.subtitle}</p>
                          <h3 className="text-sm font-black tracking-tight">{p.name}</h3>
                          <div className="flex items-baseline gap-0.5 mt-1.5">
                            <span className="text-2xl font-black">{p.price_monthly}</span>
                            <span className="text-xs font-bold">€</span>
                            <span className="text-[10px] opacity-40 ml-1">/ Mo.</span>
                          </div>
                          <p className="text-[10px] opacity-40 mt-0.5">Setup {p.setup_fee.toLocaleString('de-DE')} €</p>
                        </div>

                        {/* Divider */}
                        <div className="mx-4 mb-2" style={{ borderBottom: `1px solid ${p.textColor}15` }} />

                        {/* Features */}
                        <div className="px-4 pb-3">
                          <ul className="space-y-1">
                            {p.features.map(f => (
                              <li key={f} className="flex items-center gap-1.5 text-[10px] opacity-70">
                                <span className="opacity-50 shrink-0">✓</span>
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Footer */}
                        <div className="px-4 pb-3">
                          <button
                            disabled
                            className="w-full text-[11px] font-semibold py-2 rounded-full cursor-not-allowed"
                            style={{
                              background: isCurrent ? p.color : p.textColor + '15',
                              color: isCurrent ? '#fff' : p.textColor,
                              opacity: isCurrent ? 1 : 0.5,
                            }}
                          >
                            {isCurrent ? '✓ Dein Testpaket' : 'Buchen (bald)'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              /* Paid: nur das aktive Paket */
              planInfo && (
                <div className="rounded-xl overflow-hidden" style={{ background: planInfo.cardBg, color: planInfo.textColor }}>
                  <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {planInfo.bestseller && (
                        <span className="shrink-0 text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-[#C5A44E] text-white">
                          Top
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium uppercase tracking-widest opacity-50 leading-none">{planInfo.subtitle}</p>
                        <h3 className="text-base font-black tracking-tight leading-tight">{planInfo.name}</h3>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="flex items-baseline gap-0.5 justify-end">
                        <span className="text-xl font-black">{planInfo.price_monthly}</span>
                        <span className="text-sm font-bold">€</span>
                      </div>
                      <p className="text-[10px] opacity-40 leading-none">/ Monat</p>
                    </div>
                  </div>
                  <div className="px-4 pb-3" style={{ borderBottom: `1px solid ${planInfo.textColor}18` }}>
                    <span className="text-[11px] opacity-50">
                      Setup {planInfo.setup_fee.toLocaleString('de-DE')} €
                      {subscription.setup_paid ? ' · ✅ bezahlt' : ' · einmalig'}
                    </span>
                  </div>
                  <div className="px-4 py-3">
                    <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                      {planInfo.features.map(f => (
                        <li key={f} className="flex items-center gap-1.5 text-[11px] opacity-80">
                          <span className="text-[10px] opacity-60 shrink-0">✓</span>
                          <span className="truncate">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="px-4 pb-4">
                    <p className="text-[10px] opacity-30 italic">{planInfo.target}</p>
                  </div>
                </div>
              )
            )}

            {/* Custom note from admin */}
            {subscription.custom_note && (
              <p className="text-xs text-gray-400 italic border-l-2 border-gray-200 pl-3">{subscription.custom_note}</p>
            )}
          </div>
        )}
      </div>

      <div className={sectionCls}>
        <h2 className="font-semibold text-[#1C1F1A]">Konto</h2>
        <div>
          <label className="block text-sm font-medium text-[#1C1F1A] mb-1">E-Mail</label>
          <input value={email} readOnly className={`${inputCls} bg-gray-50 text-gray-400`} />
        </div>
        <h3 className="text-sm font-medium text-[#1C1F1A]">Passwort ändern</h3>
        <div className="grid grid-cols-1 gap-3">
          <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Aktuelles Passwort" className={inputCls} />
          <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Neues Passwort" className={inputCls} />
          <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Passwort bestätigen" className={inputCls} />
        </div>
        <button onClick={changePassword} disabled={pwSaving}
          className="px-4 py-2 rounded-lg gradient-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {pwSaving ? 'Speichern...' : 'Passwort ändern'}
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
                  <button
                    onClick={() => toggleQR(qr)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${qr.is_active ? 'bg-[#8BB06A]' : 'bg-gray-200'}`}
                    role="switch"
                    aria-checked={qr.is_active}
                    title={qr.is_active ? 'Deaktivieren' : 'Aktivieren'}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${qr.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
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
            { key: 'weekly_report' as const, label: 'Wöchentlicher Report' },
          ]).map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-[#1C1F1A]">{label}</span>
              <button
                onClick={() => setNotifPrefs(p => ({ ...p, [key]: !p[key] }))}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${notifPrefs[key] ? 'bg-[#8BB06A]' : 'bg-gray-200'}`}
                role="switch"
                aria-checked={notifPrefs[key]}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${notifPrefs[key] ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          ))}
        </div>
        <button onClick={saveNotifPrefs} className="px-4 py-2 rounded-lg gradient-primary text-white text-sm font-medium hover:opacity-90">
          Speichern
        </button>
      </div>

      <div className="glass rounded-xl p-5 border border-red-200">
        <h2 className="font-semibold text-[#E86B5A] mb-2">Gefährliche Zone</h2>
        <p className="text-sm text-gray-500 mb-3">Das Löschen deines Restaurants ist dauerhaft und kann nicht rückgängig gemacht werden.</p>
        <button onClick={() => setDeleteOpen(true)}
          className="px-4 py-2 rounded-lg border border-[#E86B5A] text-[#E86B5A] text-sm font-medium hover:bg-red-50 opacity-50 cursor-not-allowed"
          disabled>
          Restaurant löschen
        </button>
      </div>

      {deleteOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass rounded-xl p-6 max-w-sm w-full mx-4 border border-red-200">
            <h3 className="text-lg font-semibold text-[#E86B5A] mb-2">Achtung!</h3>
            <p className="text-sm text-gray-500 mb-4">Diese Funktion ist noch nicht verfügbar. Bitte wende dich an den Support.</p>
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
