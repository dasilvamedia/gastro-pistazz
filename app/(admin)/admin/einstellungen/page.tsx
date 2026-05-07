'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { User, Settings, CreditCard, Camera, Euro, TrendingUp, Key, Eye, EyeOff, CheckCircle } from 'lucide-react'

type Tab = 'profil' | 'system' | 'abrechnung'

interface ProfileData {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
}

interface RestaurantBilling {
  id: string
  name: string
  city: string | null
  contract_status: string
  monthly_fee: number | null
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
  const [serviceKey, setServiceKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [savingKey, setSavingKey] = useState(false)
  const [keySaved, setKeySaved] = useState(false)

  async function saveServiceKey() {
    if (!serviceKey.startsWith('eyJ')) { toast.error('Key muss mit eyJ... beginnen'); return }
    setSavingKey(true)
    try {
      const res = await fetch('/api/admin/setup-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_role_key: serviceKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setKeySaved(true)
      setServiceKey('')
      toast.success('Key gespeichert! Server startet neu…')
      setTimeout(() => window.location.reload(), 5000)
    } catch (e: unknown) {
      toast.error((e as Error).message)
    } finally {
      setSavingKey(false)
    }
  }

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
    const { data, error } = await supabase
      .from('restaurants')
      .select('id, name, city, contract_status, monthly_fee')
      .order('name')
    if (error) { toast.error('Fehler beim Laden'); setBillingLoading(false); return }
    setBillingRestaurants(data ?? [])
    setBillingLoading(false)
  }

  const totalMonthlyRevenue = billingRestaurants.reduce(
    (sum, r) => sum + (r.contract_status === 'active' ? (r.monthly_fee ?? 0) : 0),
    0
  )
  const activeCount = billingRestaurants.filter(r => r.contract_status === 'active').length

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
                <p className="font-medium text-[#1C1F1A]">{profile?.full_name ?? '—'}</p>
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
          {/* Service Role Key */}
          <div className="bg-white rounded-2xl border-2 border-[#8BB06A]/30 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-[#8BB06A]" />
              <h2 className="font-semibold text-[#1C1F1A]">Supabase Service Role Key</h2>
            </div>
            <p className="text-xs text-gray-400">
              Supabase → <strong>Project Settings → API → service_role</strong> (secret, beginnt mit eyJ...)
            </p>
            {keySaved ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl text-green-700 text-sm">
                <CheckCircle className="w-4 h-4" /> Key gespeichert! Seite lädt neu…
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={serviceKey}
                    onChange={e => setServiceKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-3 py-2.5 pr-10 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:border-[#8BB06A] focus:ring-1 focus:ring-[#8BB06A]/20"
                    autoComplete="new-password"
                    data-form-type="other"
                  />
                  <button type="button" onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  onClick={saveServiceKey}
                  disabled={savingKey || !serviceKey}
                  className="px-4 py-2.5 rounded-xl bg-[#8BB06A] text-white text-sm font-medium hover:bg-[#7a9e5e] disabled:opacity-40 whitespace-nowrap"
                >
                  {savingKey ? 'Speichert…' : 'Speichern'}
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-[#1C1F1A] mb-4">Systemkonfiguration</h2>
            <div className="space-y-4">
              {[
                { label: 'Plattform-Name', value: 'pistazz.io', editable: false },
                { label: 'Umgebung', value: process.env.NODE_ENV ?? 'production', editable: false },
                { label: 'Standard Monatspreis', value: '€149,00', editable: true },
                { label: 'Onboarding Flow', value: 'Aktiviert', editable: true },
                { label: 'Email-Provider', value: 'Supabase Auth (Magic Link)', editable: false },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-[#1C1F1A]">{item.label}</p>
                    <p className="text-sm text-gray-500">{item.value}</p>
                  </div>
                  {item.editable && (
                    <button
                      onClick={() => toast('Systemeinstellungen demnächst verfügbar')}
                      className="text-xs px-3 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                    >
                      Bearbeiten
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-[#1C1F1A] mb-2">Feature Flags</h2>
            <p className="text-sm text-gray-500 mb-4">Systemweite Funktionen aktivieren oder deaktivieren</p>
            <div className="space-y-3">
              {[
                { label: 'Story-Verifizierung (KI)', enabled: true },
                { label: 'Instagram OAuth', enabled: false },
                { label: 'WhatsApp Notifications', enabled: false },
                { label: 'Stripe Payments', enabled: false },
              ].map(flag => (
                <div key={flag.label} className="flex items-center justify-between">
                  <span className="text-sm text-[#1C1F1A]">{flag.label}</span>
                  <div className="relative opacity-60 cursor-not-allowed">
                    <div className={`w-10 h-5 rounded-full transition-colors ${flag.enabled ? 'bg-[#8BB06A]' : 'bg-gray-300'}`} />
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${flag.enabled ? 'translate-x-5' : ''}`} />
                  </div>
                </div>
              ))}
            </div>
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
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Monatspreis</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Jahreswert</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {billingRestaurants.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-6 py-3.5 font-medium text-[#1C1F1A]">{r.name}</td>
                        <td className="px-6 py-3.5 text-gray-500">{r.city ?? '—'}</td>
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            r.contract_status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {r.contract_status === 'active' ? 'Aktiv' : r.contract_status}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          {r.monthly_fee != null ? (
                            <span className="font-semibold text-[#8BB06A]">
                              €{r.monthly_fee.toFixed(2).replace('.', ',')}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-gray-600">
                          {r.monthly_fee != null && r.contract_status === 'active'
                            ? `€${(r.monthly_fee * 12).toLocaleString('de-DE', { minimumFractionDigits: 2 })}`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t-2 border-gray-200">
                      <td colSpan={3} className="px-6 py-3.5 text-sm font-semibold text-[#1C1F1A]">
                        Gesamt ({activeCount} aktiv)
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
