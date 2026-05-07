'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Users, Plus, Pencil, Shield, Store, UserX, Database,
  X, BarChart3, ImageIcon, Star, Gift, Clock, CheckCircle, AlertCircle,
  ExternalLink,
} from 'lucide-react'
import {
  CreateOwnerModal, EditOwnerModal, BanConfirmModal,
  type CreateForm, type EditForm,
} from '@/components/admin/AccountModals'

interface AccountRow {
  id: string
  email: string
  full_name: string | null
  role: string
  restaurant_name: string | null
  restaurant_city: string | null
  restaurant_slug: string | null
  restaurant_id: string | null
  created_at: string
  last_sign_in_at: string | null
  is_banned: boolean
}

interface RestaurantOption {
  id: string
  name: string
  slug: string
  city: string
}

interface RestaurantOverview {
  restaurant: { id: string; name: string; city: string; is_active: boolean }
  stats: {
    storiesThisWeek: number
    storiesTotal: number
    dealsTotal: number
    stampCards: number
    pointsThisWeek: number
    pendingStories: number
  }
  recentStories: Array<{
    id: string
    status: string
    created_at: string
    reach: number
    user: { full_name: string | null } | null
  }>
}

function RoleBadge({ role }: { role: string }) {
  if (role === 'super_admin') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
        <Shield className="w-3 h-3" />Super Admin
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
      <Store className="w-3 h-3" />Owner
    </span>
  )
}

function Avatar({ name }: { name: string | null }) {
  const initials = (name ?? '?').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="w-8 h-8 rounded-full bg-[#8BB06A]/20 flex items-center justify-center text-xs font-semibold text-[#8BB06A] flex-shrink-0">
      {initials}
    </div>
  )
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'gerade eben'
  if (diff < 3600) return `${Math.floor(diff / 60)} Min.`
  if (diff < 86400) return `${Math.floor(diff / 3600)} Std.`
  return `${Math.floor(diff / 86400)} Tage`
}

// ─── Restaurant Quick-View Panel ────────────────────────────────────────────

function RestaurantPanel({
  acc,
  onClose,
  onImpersonate,
}: {
  acc: AccountRow
  onClose: () => void
  onImpersonate: (acc: AccountRow) => void
}) {
  const [data, setData] = useState<RestaurantOverview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!acc.restaurant_id) { setLoading(false); return }
    fetch(`/api/admin/restaurant-overview?id=${acc.restaurant_id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [acc.restaurant_id])

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-semibold text-[#1C1F1A]">{acc.restaurant_name ?? acc.full_name}</h2>
            <p className="text-xs text-gray-400">{acc.restaurant_city}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : !data?.restaurant ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            Kein Restaurant gefunden
          </div>
        ) : (
          <div className="p-5 space-y-5 flex-1">
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={<ImageIcon className="w-4 h-4 text-[#8BB06A]" />}
                label="Stories diese Woche" value={data.stats.storiesThisWeek}
                sub={`${data.stats.storiesTotal} gesamt`} />
              <StatCard icon={<Gift className="w-4 h-4 text-blue-500" />}
                label="Deals eingelöst" value={data.stats.dealsTotal} />
              <StatCard icon={<Star className="w-4 h-4 text-amber-500" />}
                label="Stempelkarten" value={data.stats.stampCards} />
              <StatCard icon={<BarChart3 className="w-4 h-4 text-purple-500" />}
                label="Punkte diese Woche" value={data.stats.pointsThisWeek} />
            </div>

            {/* Pending stories alert */}
            {data.stats.pendingStories > 0 && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p className="text-sm text-amber-700 font-medium">
                  {data.stats.pendingStories} Story{data.stats.pendingStories > 1 ? 's' : ''} warten auf Genehmigung
                </p>
              </div>
            )}

            {/* Recent stories */}
            <div>
              <h3 className="text-sm font-semibold text-[#1C1F1A] mb-3">Letzte Aktivitäten</h3>
              <div className="space-y-2">
                {data.recentStories.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Noch keine Stories</p>
                ) : data.recentStories.map(story => (
                  <div key={story.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50">
                    <div className="w-7 h-7 rounded-full bg-[#8BB06A]/20 flex items-center justify-center text-xs font-semibold text-[#8BB06A]">
                      {(story.user?.full_name ?? 'U')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{story.user?.full_name ?? 'Unbekannt'}</p>
                      <p className="text-xs text-gray-400">{timeAgo(story.created_at)} • {story.reach || 0} Reach</p>
                    </div>
                    <StatusChip status={story.status} />
                  </div>
                ))}
              </div>
            </div>

            {/* Access info */}
            <div className="rounded-xl border border-gray-100 p-4 space-y-2">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Login-Daten</p>
              <p className="text-sm font-mono text-gray-700">{acc.email}</p>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 space-y-2">
          <button
            onClick={() => onImpersonate(acc)}
            disabled={acc.is_banned}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#8BB06A] text-white text-sm font-medium hover:bg-[#7a9e5e] transition-colors disabled:opacity-40"
          >
            <ExternalLink className="w-4 h-4" />
            Als Owner einloggen (neues Tab)
          </button>
          <p className="text-xs text-center text-gray-400">
            Öffnet die Restaurant-Ansicht in einem neuen Browser-Tab
          </p>
        </div>
      </div>
    </div>
  )
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

function StatusChip({ status }: { status: string }) {
  if (status === 'approved') return (
    <span className="flex items-center gap-1 text-xs text-green-600">
      <CheckCircle className="w-3 h-3" />OK
    </span>
  )
  if (status === 'pending') return (
    <span className="flex items-center gap-1 text-xs text-amber-500">
      <Clock className="w-3 h-3" />Ausstehend
    </span>
  )
  return <span className="text-xs text-red-400">Abgelehnt</span>
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AccountsPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<AccountRow[]>([])
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<AccountRow | null>(null)
  const [confirmBan, setConfirmBan] = useState<AccountRow | null>(null)
  const [panelAcc, setPanelAcc] = useState<AccountRow | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [seeding, setSeeding] = useState(false)

  async function handleSeed() {
    if (!confirm('Alle 16 Restaurant-Accounts anlegen? Bereits vorhandene werden aktualisiert.')) return
    setSeeding(true)
    try {
      const res = await fetch('/api/admin/seed', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Fehler')
      const ok = data.results.filter((r: { status: string }) => r.status.includes('OK')).length
      const err = data.results.filter((r: { status: string }) => !r.status.includes('OK')).length
      toast.success(`${ok} Accounts angelegt${err > 0 ? `, ${err} Fehler` : ''}`)
      loadData()
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Seed fehlgeschlagen')
    } finally {
      setSeeding(false)
    }
  }

  useEffect(() => { loadData() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/accounts')
      const data = await res.json()
      const accs: AccountRow[] = data.accounts ?? []
      setAccounts(accs)

      const restMap = new Map<string, RestaurantOption>()
      for (const acc of accs) {
        if (acc.restaurant_slug && acc.restaurant_name && !restMap.has(acc.restaurant_slug)) {
          restMap.set(acc.restaurant_slug, {
            id: acc.restaurant_id ?? acc.restaurant_slug,
            name: acc.restaurant_name,
            slug: acc.restaurant_slug,
            city: acc.restaurant_city ?? '',
          })
        }
      }
      setRestaurants(Array.from(restMap.values()).sort((a, b) => a.name.localeCompare(b.name)))
    } catch {
      toast.error('Fehler beim Laden der Accounts')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(form: CreateForm) {
    const { full_name, password, restaurant_slug, restaurant_name, city, isNew } = form
    if (!full_name || !password) { toast.error('Name und Passwort sind erforderlich'); return }
    if (!restaurant_slug) { toast.error('Bitte ein Restaurant auswählen oder angeben'); return }

    const slug = isNew
      ? restaurant_slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      : restaurant_slug
    const selectedRest = restaurants.find(r => r.slug === restaurant_slug)
    const email = `${slug}@gastro.pistazz.io`

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, password, full_name,
          restaurant_slug: slug,
          restaurant_name: isNew ? restaurant_name : selectedRest?.name,
          city: isNew ? city : selectedRest?.city,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Fehler')
      toast.success('Owner erstellt')
      setCreateOpen(false)
      loadData()
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Fehler')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEdit(form: EditForm) {
    if (!form.full_name) { toast.error('Name ist erforderlich'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: form.user_id,
          full_name: form.full_name || undefined,
          password: form.password || undefined,
          restaurant_slug: form.restaurant_slug || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Fehler')
      toast.success('Account aktualisiert')
      setEditTarget(null)
      loadData()
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Fehler')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleBan() {
    if (!confirmBan) return
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: confirmBan.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Fehler')
      toast.success('Account gesperrt')
      setConfirmBan(null)
      setAccounts(prev => prev.map(a => a.id === confirmBan.id ? { ...a, is_banned: true } : a))
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Fehler')
    }
  }

  async function handleImpersonate(acc: AccountRow) {
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: acc.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Fehler')
      toast.success(`Als ${data.restaurant_name} einloggen…`)
      // Open in new tab so admin session stays in current tab
      window.open(data.link, '_blank', 'noopener')
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Fehler beim Einloggen')
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-serif text-[#1C1F1A]">Account-Verwaltung</h1>
          <p className="text-sm text-gray-500 mt-1">Owner und Super-Admin Konten verwalten</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#8BB06A] text-[#8BB06A] text-sm font-medium hover:bg-[#8BB06A]/5 transition-colors disabled:opacity-40"
          >
            <Database className="w-4 h-4" />
            {seeding ? 'Lädt…' : '16 Accounts anlegen'}
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8BB06A] text-white text-sm font-medium hover:bg-[#7a9e5e] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Neuen Owner erstellen
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#8BB06A]" />
          <h2 className="font-semibold text-[#1C1F1A]">Konten ({accounts.length})</h2>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Keine Konten vorhanden</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Restaurant / Name</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rolle</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {accounts.map(acc => (
                  <tr
                    key={acc.id}
                    className={`hover:bg-gray-50/60 transition-colors cursor-pointer ${acc.is_banned ? 'opacity-50' : ''}`}
                    onClick={() => acc.role !== 'super_admin' && setPanelAcc(acc)}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={acc.full_name} />
                        <div>
                          <p className={`font-medium text-[#1C1F1A] text-sm ${acc.is_banned ? 'line-through' : ''}`}>
                            {acc.restaurant_name ?? acc.full_name ?? '—'}
                          </p>
                          <p className="text-xs text-gray-400">{acc.restaurant_city ?? acc.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5"><RoleBadge role={acc.role} /></td>
                    <td className="px-4 py-3.5">
                      {acc.is_banned ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">Gesperrt</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Aktiv</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setEditTarget(acc)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1"
                        >
                          <Pencil className="w-3 h-3" />Bearbeiten
                        </button>
                        {!acc.is_banned && acc.role !== 'super_admin' && (
                          <button
                            onClick={() => setConfirmBan(acc)}
                            className="text-xs px-2.5 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors flex items-center gap-1"
                          >
                            <UserX className="w-3 h-3" />Sperren
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-3 text-center">
        Auf eine Restaurant-Zeile klicken → Schnellansicht mit Live-Daten
      </p>

      {/* Restaurant Quick-View Panel */}
      {panelAcc && (
        <RestaurantPanel
          acc={panelAcc}
          onClose={() => setPanelAcc(null)}
          onImpersonate={(acc) => { handleImpersonate(acc); setPanelAcc(null) }}
        />
      )}

      {createOpen && (
        <CreateOwnerModal
          restaurants={restaurants}
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreate}
          submitting={submitting}
        />
      )}

      {editTarget && (
        <EditOwnerModal
          restaurants={restaurants}
          initial={{
            user_id: editTarget.id,
            full_name: editTarget.full_name ?? '',
            password: '',
            restaurant_slug: editTarget.restaurant_slug ?? '',
          }}
          onClose={() => setEditTarget(null)}
          onSubmit={handleEdit}
          submitting={submitting}
        />
      )}

      {confirmBan && (
        <BanConfirmModal
          name={confirmBan.full_name}
          onClose={() => setConfirmBan(null)}
          onConfirm={handleBan}
        />
      )}
    </div>
  )
}
