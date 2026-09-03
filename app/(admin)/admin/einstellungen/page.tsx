'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { User, Settings, CreditCard, Camera, Euro, TrendingUp } from 'lucide-react'
import { PLANS, STATUS_LABEL, type PlanKey, type SubscriptionStatus } from '@/lib/plans'

type Tab = 'profil' | 'system' | 'abrechnung'

interface ProfileData {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
}

// Umsatz kommt aus subscriptions (einzige Preisquelle), nicht mehr aus
// restaurants.monthly_fee
interface RestaurantBilling {
  id: string
  name: string
  city: string | null
  plan: PlanKey | null
  status: SubscriptionStatus | null
  monthly_fee: number | null
  setup_fee: number | null
  setup_paid: boolean
}

const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#8BB06A] focus:ring-1 focus:ring-[#8BB06A]/20'
const labelCls = 'block text-sm font-medium text-[#1C1F1A] mb-1.5'

export default function SuperAdminEinstellungenPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<Tab>('profil')
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [editName, setEditName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [billingRestaurants, setBillingRestaurants] = useState<RestaurantBilling[]>([])
  const [billingLoading, setBillingLoading] = useState(false)
  const [envStatus, setEnvStatus] = useState<Record<string, boolean> | null>(null)
  useEffect(() => {
    fetch('/api/admin/env-status').then(r => r.ok ? r.json() : null).then(j => setEnvStatus(j?.status ?? null)).catch(() => {})
  }, [])

  useEffect(() => {
    loadProfile()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === 'abrechnung' && billingRestaurants.length === 0) {
      loadBilling()
    }
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .eq('id', user.id)
      .single()
    if (data) {
      setProfile(data)
      setEditName(data.full_name ?? '')
    }
  }

  async function saveProfile() {
    if (!profile) return
    setSavingProfile(true)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: editName })
      .eq('id', profile.id)
    if (error) { toast.error('Fehler beim Speichern'); setSavingProfile(false); return }
    setProfile(p => p ? { ...p, full_name: editName } : p)
    toast.success('Profil gespeichert')
    setSavingProfile(false)
  }

  async function changePassword() {
    if (!newPassword || newPassword !== confirmPassword) {
      toast.error('Passwörter stimmen nicht überein')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Mindestens 6 Zeichen erforderlich')
      return
    }
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) { toast.error(error.message); setSavingPassword(false); return }
    toast.success('Passwort geändert')
    setNewPassword('')
    setConfirmPassword('')
    setSavingPassword(false)
  }

  async function loadBilling() {
    setBillingLoading(true)
    const [{ data: restaurants, error }, { data: subs }] = await Promise.all([
      supabase.from('restaurants').select('id, name, city').order('name'),
      supabase.from('subscriptions').select('restaurant_id, plan, status, monthly_fee, setup_fee, setup_paid'),
    ])
    if (error) { toast.error('Fehler beim Laden'); setBillingLoading(false); return }
    const byRestaurant = new Map((subs ?? []).map(s => [s.restaurant_id, s]))
    setBillingRestaurants((restaurants ?? []).map(r => {
      const s = byRestaurant.get(r.id)
      return {
        id: r.id, name: r.name, city: r.city,
        plan: (s?.plan as PlanKey | undefined) ?? null,
        status: (s?.status as SubscriptionStatus | undefined) ?? null,
        monthly_fee: s?.monthly_fee ?? null,
        setup_fee: s?.setup_fee ?? null,
        setup_paid: !!s?.setup_paid,
      }
    }))
    setBillingLoading(false)
  }

  const totalMonthlyRevenue = billingRestaurants.reduce(
    (sum, r) => sum + (r.status === 'active' ? (r.monthly_fee ?? 0) : 0),
    0
  )
  const activeCount = billingRestaurants.filter(r => r.status === 'active').length
  const openSetups = billingRestaurants.filter(r => r.status === 'active' && !r.setup_paid).length

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'profil',    label: 'Profil',      icon: User },
    { key: 'system',    label: 'System',       icon: Settings },
    { key: 'abrechnung', label: 'Abrechnung',  icon: CreditCard },
  ]

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-serif text-[#1C1F1A]">Einstellungen</h1>
        <p className="text-sm text-gray-500 mt-1">Super-Admin Systemeinstellungen</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-[#8BB06A] text-[#8BB06A]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profil Tab */}
      {activeTab === 'profil' && (
        <div className="space-y-6">
          {/* Avatar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-[#1C1F1A] mb-4">Profilbild</h2>
            <div className="flex items-center gap-5">
              <div className="relative">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name ?? ''}
                    className="w-20 h-20 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-[#8BB06A]/20 flex items-center justify-center">
                    <span className="text-2xl font-bold text-[#8BB06A]">
                      {(profile?.full_name ?? profile?.email ?? '?')[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-[#8BB06A] flex items-center justify-center shadow">
                  <Camera className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
              <div>
                <p className="font-medium text-[#1C1F1A]">{profile?.full_name ?? '-'}</p>
                <p className="text-sm text-gray-500">{profile?.email}</p>
                <p className="text-xs text-gray-400 mt-0.5">Super Admin</p>
              </div>
            </div>
          </div>

          {/* Name & Email */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-[#1C1F1A]">Persönliche Daten</h2>
            <div>
              <label className={labelCls}>Vollständiger Name</label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>E-Mail</label>
              <input
                type="email"
                value={profile?.email ?? ''}
                readOnly
                className={`${inputCls} bg-gray-50 text-gray-400 cursor-not-allowed`}
              />
              <p className="text-xs text-gray-400 mt-1">E-Mail kann nicht geändert werden</p>
            </div>
            <button
              onClick={saveProfile}
              disabled={savingProfile}
              className="px-5 py-2.5 rounded-xl bg-[#8BB06A] text-white text-sm font-medium hover:bg-[#7a9e5e] transition-colors disabled:opacity-50"
            >
              {savingProfile ? 'Speichern…' : 'Profil speichern'}
            </button>
          </div>

          {/* Password */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-[#1C1F1A]">Passwort ändern</h2>
            <div>
              <label className={labelCls}>Neues Passwort</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Mindestens 6 Zeichen"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Passwort bestätigen</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Passwort wiederholen"
                className={inputCls}
              />
            </div>
            <button
              onClick={changePassword}
              disabled={savingPassword || !newPassword}
              className="px-5 py-2.5 rounded-xl bg-[#8BB06A] text-white text-sm font-medium hover:bg-[#7a9e5e] transition-colors disabled:opacity-50"
            >
              {savingPassword ? 'Speichern…' : 'Passwort ändern'}
            </button>
          </div>
        </div>
      )}

      {/* System Tab */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-[#1C1F1A] mb-1">Systemstatus</h2>
            <p className="text-xs text-gray-400 mb-4">Welche Dienste auf dem Server konfiguriert sind. Werte werden nie angezeigt, nur ob sie gesetzt sind.</p>
            {!envStatus ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />)}</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {[
                  { key: 'supabase', label: 'Supabase (Datenbank, Auth, Storage)' },
                  { key: 'service_role', label: 'Supabase Service-Role (Server-Schreibrechte)' },
                  { key: 'apns', label: 'Apple Push (APNs, iOS-App)' },
                  { key: 'web_push', label: 'Web-Push (VAPID, Browser)' },
                  { key: 'anthropic', label: 'KI-Pruefung (Anthropic)' },
                  { key: 'google_places', label: 'Google Places (Geokodierung, Ratings)' },
                  { key: 'smtp', label: 'E-Mail-Versand (SMTP)' },
                  { key: 'cron', label: 'Cron-Secret (Ablauf-Jobs)' },
                  { key: 'internal_secret', label: 'Internes Secret (KI-Pipeline)' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between py-3">
                    <span className="text-sm text-[#1C1F1A]">{item.label}</span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${envStatus[item.key] ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {envStatus[item.key] ? 'Konfiguriert' : 'Fehlt'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Abrechnung Tab */}
      {activeTab === 'abrechnung' && (
        <div className="space-y-6">
          {/* KPI Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-[#8BB06A]">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Monatsumsatz</p>
                <p className="text-2xl font-bold text-[#1C1F1A]">
                  €{totalMonthlyRevenue.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-500">
                <Euro className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Aktive Verträge</p>
                <p className="text-2xl font-bold text-[#1C1F1A]">{activeCount}</p>
              </div>
            </div>
          </div>

          {/* Billing Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#8BB06A]" />
              <h2 className="font-semibold text-[#1C1F1A]">Restaurantabrechnung</h2>
            </div>

            {billingLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Restaurant</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stadt</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Paket</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Monatspreis</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Jahreswert</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {billingRestaurants.map(r => {
                      const st = r.status ? STATUS_LABEL[r.status] : null
                      return (
                      <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-6 py-3.5 font-medium text-[#1C1F1A]">{r.name}</td>
                        <td className="px-6 py-3.5 text-gray-500">{r.city ?? '-'}</td>
                        <td className="px-6 py-3.5 text-gray-600">{r.plan ? PLANS[r.plan]?.name ?? r.plan : '-'}</td>
                        <td className="px-6 py-3.5">
                          {st ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: st.bg, color: st.color }}>
                              {st.label}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Kein Abo</span>
                          )}
                          {r.status === 'active' && !r.setup_paid && (
                            <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Setup offen</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5">
                          {r.monthly_fee != null ? (
                            <span className="font-semibold text-[#8BB06A]">
                              €{r.monthly_fee.toFixed(2).replace('.', ',')}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-gray-600">
                          {r.monthly_fee != null && r.status === 'active'
                            ? `€${(r.monthly_fee * 12).toLocaleString('de-DE', { minimumFractionDigits: 2 })}`
                            : '-'}
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t-2 border-gray-200">
                      <td colSpan={4} className="px-6 py-3.5 text-sm font-semibold text-[#1C1F1A]">
                        Gesamt ({activeCount} aktiv{openSetups > 0 ? `, ${openSetups} Setup offen` : ''})
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="font-bold text-[#8BB06A] text-base">
                          €{totalMonthlyRevenue.toFixed(2).replace('.', ',')}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="font-bold text-[#1C1F1A] text-base">
                          €{(totalMonthlyRevenue * 12).toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
