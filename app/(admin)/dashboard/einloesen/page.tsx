'use client'

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { ScanLine, Star, Gift, CheckCircle2, RefreshCw } from 'lucide-react'
import { Confetti } from '@/components/Confetti'

// Einloesen am Tresen: Code eingeben (oder QR mit der Kamera scannen, das
// oeffnet /redeem/CODE), pruefen, bestaetigen. Darunter offene Stempel-
// Belohnungen und die Einloesungen von heute.

type Preview = {
  kind: 'deal' | 'stamp'; code: string; title: string; guest_name: string | null
  status: string; expires_at: string | null; points_spent: number; reward: string | null
}
type OpenReward = { id: string; reward_code: string; total_stamps_required: number; completed_at: string; user: { full_name: string | null } | null }
type Redemption = { id: string; status: string; points_spent: number; redeemed_at: string; used_at: string | null; redemption_code: string; deal: { title: string } | null; user: { full_name: string | null } | null }
type Claim = { id: string; reward_text: string | null; reward_code: string; confirmed_at: string; user: { full_name: string | null } | null }

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Offen', cls: 'bg-yellow-100 text-yellow-700' },
  used: { label: 'Eingeloest', cls: 'bg-green-100 text-green-700' },
  expired: { label: 'Abgelaufen', cls: 'bg-red-100 text-red-600' },
  cancelled: { label: 'Storniert', cls: 'bg-gray-100 text-gray-500' },
}

export default function EinloesenPage() {
  const [code, setCode] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [busy, setBusy] = useState(false)
  const [confetti, setConfetti] = useState(0)
  const [openRewards, setOpenRewards] = useState<OpenReward[]>([])
  const [rewardText, setRewardText] = useState<string | null>(null)
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [claims, setClaims] = useState<Claim[]>([])
  const [range, setRange] = useState<'today' | 'week'>('today')

  const loadLists = useCallback(async () => {
    const [a, b] = await Promise.all([
      fetch('/api/dashboard/stamp-rewards').then(r => r.ok ? r.json() : null),
      fetch(`/api/dashboard/redemptions?range=${range}`).then(r => r.ok ? r.json() : null),
    ])
    if (a) { setOpenRewards(a.rewards ?? []); setRewardText(a.reward_text ?? null) }
    if (b) { setRedemptions(b.redemptions ?? []); setClaims(b.stamp_claims ?? []) }
  }, [range])

  useEffect(() => { loadLists() }, [loadLists])

  const check = async (c: string) => {
    const clean = c.trim().toUpperCase()
    if (clean.length < 6) { toast.error('Code hat 8 Zeichen'); return }
    setBusy(true)
    setPreview(null)
    const res = await fetch(`/api/deals/redeem/confirm?code=${encodeURIComponent(clean)}`)
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { toast.error(data.error ?? 'Code nicht gefunden'); return }
    const p = data.preview as Preview
    if (p.status === 'used') { toast.error('Dieser Code wurde bereits eingeloest.'); return }
    if (p.status === 'expired' || p.status === 'cancelled') { toast.error('Dieser Code ist abgelaufen. Der Gast hat seine Punkte zurueck.'); return }
    setPreview(p)
  }

  const confirm = async (c: string) => {
    setBusy(true)
    const res = await fetch('/api/deals/redeem/confirm', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: c }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { toast.error(data.error ?? 'Bestaetigung fehlgeschlagen'); return }
    setConfetti(x => x + 1)
    toast.success(`Eingeloest: ${data.preview?.title ?? 'Code'}`)
    setPreview(null)
    setCode('')
    loadLists()
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <Confetti trigger={confetti} />
      <div>
        <h1 className="text-2xl font-bold text-[#1C1F1A]">Einloesen</h1>
        <p className="text-sm text-gray-500 mt-1">
          Deal-Codes und Stempel-Belohnungen deiner Gaeste bestaetigen. Tipp: QR-Code des Gastes mit der Handy-Kamera scannen, das oeffnet die Bestaetigung direkt.
        </p>
      </div>

      {/* Code-Eingabe */}
      <div className="glass rounded-2xl p-5">
        <label className="text-sm font-semibold text-[#1C1F1A] flex items-center gap-2 mb-2">
          <ScanLine size={16} className="text-[#6D9450]" /> Code des Gastes
        </label>
        <form
          onSubmit={e => { e.preventDefault(); check(code) }}
          className="flex gap-2"
        >
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
            placeholder="z.B. K7M2P9QX"
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 font-mono text-lg tracking-widest uppercase focus:outline-none focus:border-[#8BB06A]"
          />
          <button type="submit" disabled={busy || code.length < 6}
            className="px-5 py-3 rounded-xl bg-[#1C1F1A] text-white font-semibold disabled:opacity-40">
            Pruefen
          </button>
        </form>

        {preview && (
          <div className="mt-4 rounded-2xl border border-[#D4E8C2] bg-[#F8FAF5] p-4">
            <div className="flex items-center gap-3 mb-3">
              {preview.kind === 'deal' ? <Gift className="text-[#6D9450]" /> : <Star className="text-[#E5B84C]" />}
              <div className="min-w-0">
                <p className="text-xs text-[#6D9450]">{preview.kind === 'deal' ? 'Deal' : 'Stempel-Belohnung'}</p>
                <p className="font-bold text-[#1C1F1A] truncate">{preview.title}</p>
              </div>
            </div>
            <div className="text-sm text-[#1C1F1A] space-y-1 mb-4">
              <p>Gast: <span className="font-semibold">{preview.guest_name ?? 'Unbekannt'}</span></p>
              {preview.kind === 'deal' && preview.points_spent > 0 && <p>Eingesetzte Punkte: <span className="font-semibold">{preview.points_spent}</span></p>}
              {preview.kind === 'stamp' && preview.reward && <p>Belohnung: <span className="font-semibold">{preview.reward}</span></p>}
              {preview.expires_at && <p>Gueltig bis {new Date(preview.expires_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</p>}
            </div>
            <button onClick={() => confirm(preview.code)} disabled={busy}
              className="w-full gradient-primary text-white font-bold py-3 rounded-xl disabled:opacity-60 flex items-center justify-center gap-2">
              <CheckCircle2 size={18} /> Einloesung bestaetigen
            </button>
          </div>
        )}
      </div>

      {/* Offene Stempel-Belohnungen */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-[#1C1F1A] flex items-center gap-2"><Star size={16} className="text-[#E5B84C]" /> Offene Stempel-Belohnungen</h2>
          <span className="text-xs text-gray-400">{openRewards.length}</span>
        </div>
        {openRewards.length === 0 ? (
          <p className="text-sm text-gray-400">Keine volle Stempelkarte wartet gerade auf ihre Belohnung.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {openRewards.map(r => (
              <li key={r.id} className="py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#1C1F1A] truncate">{r.user?.full_name ?? 'Gast'}</p>
                  <p className="text-xs text-gray-500">
                    {r.total_stamps_required} Stempel voll{rewardText ? `, ${rewardText}` : ''}, Code <span className="font-mono">{r.reward_code}</span>
                  </p>
                </div>
                <button onClick={() => confirm(r.reward_code)} disabled={busy}
                  className="px-3 py-2 rounded-lg bg-[#8BB06A] text-white text-xs font-semibold disabled:opacity-50">
                  Bestaetigen
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Verlauf */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-[#1C1F1A]">Einloesungen</h2>
          <div className="flex items-center gap-2">
            {(['today', 'week'] as const).map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium ${range === r ? 'bg-[#1C1F1A] text-white' : 'bg-gray-100 text-gray-600'}`}>
                {r === 'today' ? 'Heute' : '7 Tage'}
              </button>
            ))}
            <button onClick={loadLists} className="p-1.5 rounded-full text-gray-400 hover:text-gray-600" aria-label="Aktualisieren"><RefreshCw size={14} /></button>
          </div>
        </div>
        {redemptions.length === 0 && claims.length === 0 ? (
          <p className="text-sm text-gray-400">Noch keine Einloesungen in diesem Zeitraum.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {claims.map(c => (
              <li key={c.id} className="py-3 flex items-center gap-3 text-sm">
                <Star size={14} className="text-[#E5B84C] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#1C1F1A] truncate">{c.reward_text ?? 'Stempel-Belohnung'}</p>
                  <p className="text-xs text-gray-500">{c.user?.full_name ?? 'Gast'}, {new Date(c.confirmed_at).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}</p>
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">Eingeloest</span>
              </li>
            ))}
            {redemptions.map(r => {
              const s = STATUS[r.status] ?? STATUS.pending
              return (
                <li key={r.id} className="py-3 flex items-center gap-3 text-sm">
                  <Gift size={14} className="text-[#6D9450] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#1C1F1A] truncate">{r.deal?.title ?? 'Deal'}</p>
                    <p className="text-xs text-gray-500">
                      {r.user?.full_name ?? 'Gast'}, {new Date(r.used_at ?? r.redeemed_at).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}
                      {r.points_spent > 0 ? `, ${r.points_spent} P` : ''}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${s.cls}`}>{s.label}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
