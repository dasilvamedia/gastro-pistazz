'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Users, Plus, Pencil, Shield, Store, UserX, Database,
  X, BarChart3, ImageIcon, Star, Gift, Clock, CheckCircle, AlertCircle,
  ExternalLink, RefreshCw, ChevronDown, Copy, Eye, EyeOff,
} from 'lucide-react'
import {
  CreateOwnerModal, EditOwnerModal, BanConfirmModal,
  type CreateForm, type EditForm,
} from '@/components/admin/AccountModals'
import { PLANS, PLAN_ORDER, STATUS_LABEL, DEFAULT_PLAN, TRIAL_DAYS, type PlanKey, type SubscriptionStatus } from '@/lib/plans'

// ─── Types ───────────────────────────────────────────────────────────────────

interface AccountRow {
  id: string; email: string; full_name: string | null; role: string
  restaurant_name: string | null; restaurant_city: string | null
  restaurant_slug: string | null; restaurant_id: string | null
  created_at: string; last_sign_in_at: string | null; is_banned: boolean
}
interface SubRow {
  id: string; restaurant_id: string; plan: PlanKey; status: SubscriptionStatus
  monthly_fee: number; setup_fee: number; setup_paid: boolean
  trial_duration_days: number; trial_started_at: string | null
  trial_ends_at: string | null; trial_ended_early: boolean; trial_converted: boolean
  custom_note: string | null; trial_days_remaining: number
  is_trial_active: boolean; is_trial_expired: boolean
}
interface RestaurantOption { id: string; name: string; slug: string; city: string }
interface RestaurantOverview {
  restaurant: { id: string; name: string; city: string; is_active: boolean }
  stats: { storiesThisWeek: number; storiesTotal: number; dealsTotal: number; stampCards: number; pointsThisWeek: number; pendingStories: number }
  recentStories: Array<{ id: string; status: string; created_at: string; reach: number; user: { full_name: string | null } | null }>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (d < 60) return 'gerade eben'
  if (d < 3600) return `${Math.floor(d / 60)} Min.`
  if (d < 86400) return `${Math.floor(d / 3600)} Std.`
  return `${Math.floor(d / 86400)} Tage`
}

function Avatar({ name }: { name: string | null }) {
  const i = (name ?? '?').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  return <div className="w-8 h-8 rounded-full bg-[#8BB06A]/20 flex items-center justify-center text-xs font-semibold text-[#8BB06A] flex-shrink-0">{i}</div>
}

function RoleBadge({ role }: { role: string }) {
  if (role === 'super_admin') return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
      <Shield className="w-3 h-3" />Super Admin
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
      <Store className="w-3 h-3" />Owner
    </span>
  )
}

function StatusChip({ status }: { status: string }) {
  if (status === 'approved') return <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle className="w-3 h-3" />OK</span>
  if (status === 'pending')  return <span className="flex items-center gap-1 text-xs text-amber-500"><Clock className="w-3 h-3" />Ausstehend</span>
  return <span className="text-xs text-red-400">Abgelehnt</span>
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub?: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1">{icon}<p className="text-xs text-gray-500">{label}</p></div>
      <p className="text-2xl font-bold text-[#1C1F1A]">{value.toLocaleString('de')}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Trial-Badge ─────────────────────────────────────────────────────────────

function TrialBadge({ sub }: { sub: SubRow | null }) {
  if (!sub) return <span className="text-xs text-gray-300">-</span>
  const sl = STATUS_LABEL[sub.status]
  const pl = PLANS[sub.plan]
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: sl.bg, color: sl.color }}>
          {sl.emoji} {sl.label}
        </span>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: pl.bg, color: pl.color }}>
          {pl.name}
        </span>
      </div>
      {sub.is_trial_active && (
        <p className={`text-xs font-semibold ${sub.trial_days_remaining <= 3 ? 'text-red-500' : 'text-[#577A3D]'}`}>
          ⏳ {sub.trial_days_remaining} Tage verbleibend
        </p>
      )}
      {sub.is_trial_expired && <p className="text-xs text-red-500 font-semibold">Abgelaufen</p>}
      {sub.status === 'active' && <p className="text-xs text-gray-400">{sub.monthly_fee}€/Monat</p>}
    </div>
  )
}

// ─── Trial Quick-Actions ──────────────────────────────────────────────────────

function TrialActions({
  sub, restaurantId, onUpdate,
}: { sub: SubRow | null; restaurantId: string | null; onUpdate: () => void }) {
  const [loading, setLoading] = useState(false)
  const [extendOpen, setExtendOpen] = useState(false)
  const [extendDays, setExtendDays] = useState(7)
  const [endOpen, setEndOpen] = useState(false)

  if (!restaurantId) return <span className="text-xs text-gray-300">kein Restaurant</span>

  async function patch(body: Record<string, unknown>): Promise<boolean> {
    setLoading(true)
    try {
      const endpoint = sub?.id
        ? `/api/admin/subscriptions/${sub.id}`
        : `/api/admin/subscriptions/upsert`
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurant_id: restaurantId, ...body }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      onUpdate()
      return true
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Fehler')
      return false
    } finally {
      setLoading(false)
    }
  }

  async function setTrial(days: number) {
    const ok = await patch({ trial_duration_days: days })
    if (ok) toast.success(`${days}-Tage-Trial gestartet ✓`)
  }

  async function endTrial(convertToPaid: boolean) {
    const ok = await patch({ end_trial: true, convert_to_paid: convertToPaid })
    if (ok) { toast.success(convertToPaid ? 'In Kunde umgewandelt ✓' : 'Trial beendet'); setEndOpen(false) }
  }

  async function extend() {
    const ok = await patch({ extend_trial_days: extendDays })
    if (ok) { toast.success(`Trial um ${extendDays} Tage verlängert ✓`); setExtendOpen(false) }
  }

  const btn = 'text-[11px] px-2 py-1 rounded-lg font-bold transition-colors disabled:opacity-40'

  return (
    <div className="flex items-center gap-1 flex-wrap" onClick={e => e.stopPropagation()}>
      {loading && <span className="text-[11px] text-gray-400 animate-pulse">…</span>}

      {/* 30 Tage ist der Standard-Trial, 14 Tage nur als Ausnahme */}
      <button disabled={loading} onClick={() => setTrial(TRIAL_DAYS)}
        className={`${btn} bg-[#8BB06A] text-white hover:bg-[#6D9450]`}>{TRIAL_DAYS}T</button>
      <button disabled={loading} onClick={() => setTrial(14)}
        className={`${btn} bg-gray-100 text-gray-600 hover:bg-gray-200`}>14T</button>

      {/* Verlängern */}
      <div className="relative">
        <button disabled={loading} onClick={() => { setExtendOpen(o => !o); setEndOpen(false) }}
          className={`${btn} bg-yellow-50 text-yellow-700 hover:bg-yellow-100`}>+Tage</button>
        {extendOpen && (
          <div className="absolute top-7 left-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-3 flex items-center gap-2 min-w-44">
            <input type="number" value={extendDays} min={1} max={365}
              onChange={e => setExtendDays(Number(e.target.value))}
              className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-xs" />
            <span className="text-xs text-gray-500">Tage</span>
            <button onClick={extend} className="px-2 py-1 bg-yellow-500 text-white rounded-lg text-xs font-bold">✓</button>
            <button onClick={() => setExtendOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-3 h-3" /></button>
          </div>
        )}
      </div>

      {/* Beenden */}
      <div className="relative">
        <button disabled={loading} onClick={() => { setEndOpen(o => !o); setExtendOpen(false) }}
          className={`${btn} bg-red-50 text-red-600 hover:bg-red-100`}>Beenden</button>
        {endOpen && (
          <div className="absolute top-7 right-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-3 space-y-2 min-w-52">
            <p className="text-xs font-semibold text-gray-600">Trial beenden</p>
            <button onClick={() => endTrial(true)}
              className="w-full text-xs px-3 py-1.5 rounded-lg bg-[#8BB06A] text-white font-bold hover:bg-[#6D9450]">
              ✅ In Kunde umwandeln
            </button>
            <button onClick={() => endTrial(false)}
              className="w-full text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 font-bold hover:bg-red-200">
              🔴 Nur beenden (expired)
            </button>
            <button onClick={() => setEndOpen(false)} className="w-full text-xs text-gray-400 hover:text-gray-600">Abbrechen</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Restaurant Quick-View Panel ──────────────────────────────────────────────

function RestaurantPanel({ acc, sub, onClose, onImpersonate, onUpdate }: {
  acc: AccountRow; sub: SubRow | null
  onClose: () => void
  onImpersonate: (acc: AccountRow) => void
  onUpdate: () => void
}) {
  const [data, setData]           = useState<RestaurantOverview | null>(null)
  const [statsLoading, setStatsL] = useState(true)
  const [statsOpen, setStatsOpen] = useState(false)

  const [nameVal, setNameVal]     = useState(acc.full_name ?? '')
  const [nameSaving, setNameSav]  = useState(false)

  const [pwVal, setPwVal]         = useState('')
  const [pwSaving, setPwSav]      = useState(false)
  const [showPw, setShowPw]       = useState(false)

  const [magicLink, setMagicLink] = useState<string | null>(null)
  const [linkLoading, setLinkL]   = useState(false)
  const [copied, setCopied]       = useState(false)

  const [isBanned, setIsBanned]   = useState(acc.is_banned)
  const [banLoading, setBanL]     = useState(false)

  const [planVal, setPlanVal]     = useState<PlanKey>(sub?.plan ?? DEFAULT_PLAN)
  const [planSaving, setPlanSav]  = useState(false)
  const [noteVal, setNoteVal]     = useState(sub?.custom_note ?? '')
  const [noteSaving, setNoteSav]  = useState(false)

  useEffect(() => {
    setPlanVal(sub?.plan ?? 'professional')
    setNoteVal(sub?.custom_note ?? '')
  }, [sub?.id, sub?.plan, sub?.custom_note])

  useEffect(() => {
    if (!acc.restaurant_id || !statsOpen) return
    setStatsL(true)
    fetch(`/api/admin/restaurant-overview?id=${acc.restaurant_id}`)
      .then(r => r.json()).then(d => { setData(d); setStatsL(false) })
      .catch(() => setStatsL(false))
  }, [acc.restaurant_id, statsOpen])

  async function saveName() {
    if (!nameVal.trim()) return
    setNameSav(true)
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: acc.id, full_name: nameVal }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Name gespeichert')
      onUpdate()
    } catch (e: unknown) { toast.error((e as Error).message) }
    finally { setNameSav(false) }
  }

  async function savePassword() {
    if (!pwVal || pwVal.length < 6) { toast.error('Mind. 6 Zeichen'); return }
    setPwSav(true)
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: acc.id, password: pwVal }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Passwort geändert')
      setPwVal('')
    } catch (e: unknown) { toast.error((e as Error).message) }
    finally { setPwSav(false) }
  }

  async function generateMagicLink() {
    setLinkL(true); setMagicLink(null)
    try {
      const res = await fetch('/api/admin/accounts/magic-link', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: acc.id }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setMagicLink(d.link)
    } catch (e: unknown) { toast.error((e as Error).message) }
    finally { setLinkL(false) }
  }

  function copyLink() {
    if (!magicLink) return
    navigator.clipboard.writeText(magicLink)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  async function toggleBan() {
    setBanL(true)
    try {
      if (isBanned) {
        const res = await fetch('/api/admin/accounts', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: acc.id, unban: true }),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        setIsBanned(false); toast.success('Entsperrt')
      } else {
        const res = await fetch('/api/admin/accounts', {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: acc.id }),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        setIsBanned(true); toast.success('Konto gesperrt')
      }
      onUpdate()
    } catch (e: unknown) { toast.error((e as Error).message) }
    finally { setBanL(false) }
  }

  async function savePlan(plan: PlanKey) {
    setPlanVal(plan); setPlanSav(true)
    try {
      const endpoint = sub?.id
        ? `/api/admin/subscriptions/${sub.id}`
        : `/api/admin/subscriptions/upsert`
      const res = await fetch(endpoint, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurant_id: acc.restaurant_id, plan }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Plan geändert'); onUpdate()
    } catch (e: unknown) { toast.error((e as Error).message) }
    finally { setPlanSav(false) }
  }

  async function saveNote() {
    if (!sub?.id && !acc.restaurant_id) return
    setNoteSav(true)
    try {
      const endpoint = sub?.id
        ? `/api/admin/subscriptions/${sub.id}`
        : `/api/admin/subscriptions/upsert`
      const res = await fetch(endpoint, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurant_id: acc.restaurant_id, custom_note: noteVal, notify_owner: false }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Notiz gespeichert')
    } catch (e: unknown) { toast.error((e as Error).message) }
    finally { setNoteSav(false) }
  }

  const sec   = 'border-t border-gray-100 pt-5 mt-5'
  const lbl   = 'text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 block'
  const inp   = 'flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#8BB06A]'
  const sbtn  = 'px-3 py-2 bg-[#8BB06A] text-white rounded-xl text-xs font-bold hover:bg-[#7a9e5e] disabled:opacity-40 transition-colors'

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto flex flex-col">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-semibold text-[#1C1F1A]">{acc.restaurant_name ?? acc.full_name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-gray-400">{acc.restaurant_city ?? acc.email}</p>
              {isBanned && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">GESPERRT</span>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        <div className="p-5 flex-1">

          {/* ── Account ─────────────────────────── */}
          <div>
            <span className={lbl}>Account</span>
            <div className="flex items-center gap-2 mb-3">
              <input value={nameVal} onChange={e => setNameVal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveName()}
                placeholder="Name" className={inp} />
              <button onClick={saveName} disabled={nameSaving} className={sbtn}>{nameSaving ? '…' : 'Speichern'}</button>
            </div>
            <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-gray-50 rounded-xl">
              <span className="text-xs text-gray-400 shrink-0">E-Mail</span>
              <span className="text-sm font-mono text-gray-700 flex-1 truncate">{acc.email}</span>
              <button onClick={() => { navigator.clipboard.writeText(acc.email); toast.success('Kopiert') }}
                className="text-gray-400 hover:text-gray-600 shrink-0"><Copy className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
              <RoleBadge role={acc.role} />
              <span>📅 {new Date(acc.created_at).toLocaleDateString('de-DE')}</span>
              <span>🕐 {acc.last_sign_in_at ? new Date(acc.last_sign_in_at).toLocaleDateString('de-DE') : 'Nie'}</span>
            </div>
          </div>

          {/* ── Abo & Plan ──────────────────────── */}
          <div className={sec}>
            <span className={lbl}>Abo & Plan</span>
            <div className="mb-3"><TrialBadge sub={sub} /></div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-gray-500 w-12 shrink-0">Plan</span>
              <select value={planVal} onChange={e => savePlan(e.target.value as PlanKey)} disabled={planSaving}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#8BB06A] bg-white disabled:opacity-50">
                {PLAN_ORDER.map(k => PLANS[k]).map(p => (
                  <option key={p.key} value={p.key}>{p.name}, {p.price_monthly} €/Monat</option>
                ))}
              </select>
              {planSaving && <span className="text-xs text-gray-400 animate-pulse">…</span>}
            </div>
            {acc.restaurant_id && (
              <div className="mb-3">
                <TrialActions sub={sub} restaurantId={acc.restaurant_id} onUpdate={onUpdate} />
              </div>
            )}
            <div>
              <span className="text-xs text-gray-500 block mb-1">Interne Notiz</span>
              <textarea value={noteVal} onChange={e => setNoteVal(e.target.value)} onBlur={saveNote}
                placeholder="Notiz zum Account…" rows={2}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#8BB06A]" />
              {noteSaving && <p className="text-[10px] text-gray-400">Speichern…</p>}
            </div>
          </div>

          {/* ── Sicherheit ──────────────────────── */}
          <div className={sec}>
            <span className={lbl}>Sicherheit</span>

            {/* Password */}
            <div className="mb-4">
              <span className="text-xs text-gray-500 block mb-1.5">Neues Passwort</span>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input type={showPw ? 'text' : 'password'} value={pwVal}
                    onChange={e => setPwVal(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && savePassword()}
                    placeholder="Mind. 6 Zeichen"
                    className={inp + ' pr-9'} />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button onClick={savePassword} disabled={pwSaving || !pwVal} className={sbtn}>{pwSaving ? '…' : 'Setzen'}</button>
              </div>
            </div>

            {/* Magic Link */}
            <div className="mb-4">
              <span className="text-xs text-gray-500 block mb-1.5">Magic Login-Link (für Owner)</span>
              <button onClick={generateMagicLink} disabled={linkLoading}
                className="w-full px-3 py-2 border border-dashed border-[#8BB06A] text-[#3D7A22] rounded-xl text-sm font-medium hover:bg-[#EEF5E6] disabled:opacity-40 transition-colors">
                {linkLoading ? 'Generiere…' : '🔗 Link generieren'}
              </button>
              {magicLink && (
                <div className="mt-2 space-y-1">
                  <div className="relative">
                    <textarea readOnly value={magicLink} rows={2}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[11px] font-mono bg-gray-50 resize-none text-gray-600" />
                    <button onClick={copyLink}
                      className="absolute top-2 right-2 p-1 rounded bg-white border border-gray-200 hover:bg-gray-50">
                      {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400">Einmaliger Link, nur einmal verwendbar.</p>
                </div>
              )}
            </div>

            {/* Ban */}
            {isBanned ? (
              <button onClick={toggleBan} disabled={banLoading}
                className="w-full px-3 py-2 rounded-xl bg-green-50 text-green-700 border border-green-200 text-sm font-bold hover:bg-green-100 disabled:opacity-40">
                {banLoading ? '…' : '✅ Konto entsperren'}
              </button>
            ) : (
              <button onClick={toggleBan} disabled={banLoading}
                className="w-full px-3 py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 text-sm font-bold hover:bg-red-100 disabled:opacity-40">
                {banLoading ? '…' : '🚫 Konto sperren'}
              </button>
            )}
          </div>

          {/* ── Statistiken (aufklappbar) ────────── */}
          <div className={sec}>
            <button onClick={() => setStatsOpen(v => !v)}
              className="flex items-center gap-1.5 w-full text-left hover:text-gray-600 transition-colors mb-1">
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${statsOpen ? 'rotate-180' : ''}`} />
              <span className={lbl + ' mb-0'}>Statistiken</span>
            </button>

            {statsOpen && (
              statsLoading ? (
                <div className="space-y-2 mt-3">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
              ) : !data?.restaurant ? (
                <p className="text-xs text-gray-400 py-2">Kein Restaurant gefunden</p>
              ) : (
                <div className="mt-3 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard icon={<ImageIcon className="w-4 h-4 text-[#8BB06A]" />} label="Stories diese Woche" value={data.stats.storiesThisWeek} sub={`${data.stats.storiesTotal} gesamt`} />
                    <StatCard icon={<Gift className="w-4 h-4 text-blue-500" />} label="Deals eingelöst" value={data.stats.dealsTotal} />
                    <StatCard icon={<Star className="w-4 h-4 text-amber-500" />} label="Stempelkarten" value={data.stats.stampCards} />
                    <StatCard icon={<BarChart3 className="w-4 h-4 text-purple-500" />} label="Punkte diese Woche" value={data.stats.pointsThisWeek} />
                  </div>
                  {data.stats.pendingStories > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                      <p className="text-sm text-amber-700 font-medium">{data.stats.pendingStories} Story{data.stats.pendingStories > 1 ? 's' : ''} warten</p>
                    </div>
                  )}
                  <div>
                    <h3 className="text-xs font-semibold text-[#1C1F1A] mb-2">Letzte Aktivitäten</h3>
                    <div className="space-y-2">
                      {data.recentStories.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-3">Noch keine Stories</p>
                      ) : data.recentStories.map(story => (
                        <div key={story.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50">
                          <div className="w-7 h-7 rounded-full bg-[#8BB06A]/20 flex items-center justify-center text-xs font-semibold text-[#8BB06A]">
                            {(story.user?.full_name ?? 'U')[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{story.user?.full_name ?? 'Unbekannt'}</p>
                            <p className="text-xs text-gray-400">{timeAgo(story.created_at)} · {story.reach || 0} Reach</p>
                          </div>
                          <StatusChip status={story.status} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>

        </div>

        {/* Bottom bar */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4">
          <button onClick={() => onImpersonate(acc)} disabled={isBanned}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#8BB06A] text-white text-sm font-medium hover:bg-[#7a9e5e] transition-colors disabled:opacity-40">
            <ExternalLink className="w-4 h-4" /> Als Owner einloggen
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AccountsPage() {
  const router = useRouter()
  const [accounts, setAccounts]     = useState<AccountRow[]>([])
  const [subs, setSubs]             = useState<SubRow[]>([])
  const [restaurants, setRests]     = useState<RestaurantOption[]>([])
  const [loading, setLoading]       = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEdit]       = useState<AccountRow | null>(null)
  const [confirmBan, setBan]        = useState<AccountRow | null>(null)
  const [panelAcc, setPanel]        = useState<AccountRow | null>(null)
  const [submitting, setSub2]       = useState(false)
  const [seeding, setSeeding]       = useState(false)
  const [filterStatus, setFiltS]    = useState<'all' | SubscriptionStatus>('all')

  const subByRestaurant = Object.fromEntries(subs.map(s => [s.restaurant_id, s]))

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [accRes, subRes] = await Promise.all([
        fetch('/api/admin/accounts'),
        fetch('/api/admin/subscriptions'),
      ])
      const accData = await accRes.json()
      const subData = await subRes.json()
      const accs: AccountRow[] = accData.accounts ?? []
      setAccounts(accs)
      setSubs(subData.subscriptions ?? [])
      const restMap = new Map<string, RestaurantOption>()
      for (const acc of accs) {
        if (acc.restaurant_slug && acc.restaurant_name && !restMap.has(acc.restaurant_slug)) {
          restMap.set(acc.restaurant_slug, { id: acc.restaurant_id ?? '', name: acc.restaurant_name, slug: acc.restaurant_slug, city: acc.restaurant_city ?? '' })
        }
      }
      setRests(Array.from(restMap.values()).sort((a, b) => a.name.localeCompare(b.name)))
    } catch { toast.error('Fehler beim Laden') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filtered = accounts.filter(acc => {
    if (acc.role === 'super_admin') return filterStatus === 'all'
    if (filterStatus === 'all') return true
    const sub = acc.restaurant_id ? subByRestaurant[acc.restaurant_id] : null
    return sub?.status === filterStatus
  })

  async function handleSeed() {
    if (!confirm('16 Restaurant-Accounts anlegen?')) return
    setSeeding(true)
    try {
      const res = await fetch('/api/admin/seed', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const ok = data.results.filter((r: { status: string }) => r.status.includes('OK')).length
      toast.success(`${ok} Accounts angelegt`)
      loadData()
    } catch (e: unknown) { toast.error((e as Error).message) }
    finally { setSeeding(false) }
  }

  async function handleCreate(form: CreateForm) {
    const { full_name, password, restaurant_slug, restaurant_name, city, isNew } = form
    if (!full_name || !password) { toast.error('Name und Passwort erforderlich'); return }
    if (!restaurant_slug) { toast.error('Bitte Restaurant angeben'); return }
    const slug = isNew ? restaurant_slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : restaurant_slug
    const selectedRest = restaurants.find(r => r.slug === restaurant_slug)
    const email = `${slug}@gastro.pistazz.io`
    setSub2(true)
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name, restaurant_slug: slug, restaurant_name: isNew ? restaurant_name : selectedRest?.name, city: isNew ? city : selectedRest?.city }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Owner erstellt')
      setCreateOpen(false)
      loadData()
    } catch (err: unknown) { toast.error((err as Error).message) }
    finally { setSub2(false) }
  }

  async function handleEdit(form: EditForm) {
    if (!form.full_name) { toast.error('Name erforderlich'); return }
    setSub2(true)
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: form.user_id, full_name: form.full_name || undefined, password: form.password || undefined, restaurant_slug: form.restaurant_slug || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Account aktualisiert')
      setEdit(null)
      loadData()
    } catch (err: unknown) { toast.error((err as Error).message) }
    finally { setSub2(false) }
  }

  async function handleBan() {
    if (!confirmBan) return
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: confirmBan.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Account gesperrt')
      setBan(null)
      setAccounts(prev => prev.map(a => a.id === confirmBan.id ? { ...a, is_banned: true } : a))
    } catch (err: unknown) { toast.error((err as Error).message) }
  }

  async function handleImpersonate(acc: AccountRow) {
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: acc.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Als ${data.restaurant_name} einloggen…`)
      window.open(data.link, '_blank', 'noopener')
    } catch (err: unknown) { toast.error((err as Error).message) }
  }

  const trialCount   = subs.filter(s => s.is_trial_active).length
  const expiredCount = subs.filter(s => s.status === 'expired' || s.is_trial_expired).length
  const activeCount  = subs.filter(s => s.status === 'active').length

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-serif text-[#1C1F1A]">Account-Verwaltung</h1>
          <p className="text-sm text-gray-500 mt-1">Owner-Konten und Testphasen verwalten</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50">
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
          <button onClick={handleSeed} disabled={seeding}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#8BB06A] text-[#8BB06A] text-sm font-medium hover:bg-[#8BB06A]/5 disabled:opacity-40">
            <Database className="w-4 h-4" />{seeding ? 'Lädt…' : '16 Accounts anlegen'}
          </button>
          <button onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8BB06A] text-white text-sm font-medium hover:bg-[#7a9e5e]">
            <Plus className="w-4 h-4" />Neuer Owner
          </button>
        </div>
      </div>

      {/* KPI Karten */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Accounts gesamt', value: accounts.filter(a => a.role !== 'super_admin').length, icon: '👥', color: '#8BB06A' },
          { label: 'In Testphase',    value: trialCount,   icon: '🧪', color: '#3D7A22' },
          { label: 'Aktive Kunden',   value: activeCount,  icon: '✅', color: '#065F46' },
          { label: 'Abgelaufen',      value: expiredCount, icon: '🔴', color: '#991B1B' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: c.color }}>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{c.label}</p>
            <p className="text-2xl font-bold text-[#1C1F1A] mt-1">{c.icon} {c.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <select value={filterStatus} onChange={e => setFiltS(e.target.value as typeof filterStatus)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-[#8BB06A]">
          <option value="all">Alle Status</option>
          <option value="trial">🧪 In Testphase</option>
          <option value="active">✅ Aktiv (zahlend)</option>
          <option value="expired">🔴 Abgelaufen</option>
          <option value="cancelled">⛔ Gekündigt</option>
        </select>
        <span className="text-sm text-gray-400">{filtered.length} Accounts</span>
      </div>

      {/* Tabelle */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#8BB06A]" />
          <h2 className="font-semibold text-[#1C1F1A]">Konten</h2>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center"><Users className="w-10 h-10 text-gray-300 mx-auto mb-3" /><p className="text-gray-400 text-sm">Keine Konten</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Restaurant</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rolle</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Subscription & Trial</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Quick-Actions</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Konto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(acc => {
                  const sub = acc.restaurant_id ? subByRestaurant[acc.restaurant_id] ?? null : null
                  return (
                    <tr key={acc.id}
                      className={`hover:bg-gray-50/60 transition-colors cursor-pointer ${acc.is_banned ? 'opacity-50' : ''}`}
                      onClick={() => acc.role !== 'super_admin' && setPanel(acc)}>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={acc.full_name} />
                          <div>
                            <p className={`font-medium text-[#1C1F1A] text-sm ${acc.is_banned ? 'line-through' : ''}`}>
                              {acc.restaurant_name ?? acc.full_name ?? '-'}
                            </p>
                            <p className="text-xs text-gray-400">{acc.restaurant_city ?? acc.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><RoleBadge role={acc.role} /></td>
                      <td className="px-4 py-3.5"><TrialBadge sub={sub} /></td>
                      <td className="px-4 py-3.5">
                        {acc.role !== 'super_admin' && (
                          <TrialActions sub={sub} restaurantId={acc.restaurant_id} onUpdate={loadData} />
                        )}
                      </td>
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setEdit(acc)}
                            className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center gap-1">
                            <Pencil className="w-3 h-3" />Edit
                          </button>
                          {!acc.is_banned && acc.role !== 'super_admin' && (
                            <button onClick={() => setBan(acc)}
                              className="text-xs px-2.5 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 flex items-center gap-1">
                              <UserX className="w-3 h-3" />Sperren
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-3 text-center">Auf eine Zeile klicken → Schnellansicht mit Live-Daten</p>

      {panelAcc && (
        <RestaurantPanel
          acc={panelAcc}
          sub={panelAcc.restaurant_id ? subByRestaurant[panelAcc.restaurant_id] ?? null : null}
          onClose={() => setPanel(null)}
          onImpersonate={acc => { handleImpersonate(acc); setPanel(null) }}
          onUpdate={loadData}
        />
      )}
      {createOpen && <CreateOwnerModal restaurants={restaurants} onClose={() => setCreateOpen(false)} onSubmit={handleCreate} submitting={submitting} />}
      {editTarget && <EditOwnerModal restaurants={restaurants} initial={{ user_id: editTarget.id, full_name: editTarget.full_name ?? '', password: '', restaurant_slug: editTarget.restaurant_slug ?? '' }} onClose={() => setEdit(null)} onSubmit={handleEdit} submitting={submitting} />}
      {confirmBan && <BanConfirmModal name={confirmBan.full_name} onClose={() => setBan(null)} onConfirm={handleBan} />}
    </div>
  )
}
