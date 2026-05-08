'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Share2, Bell, Lock, LogOut, Star } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name zu kurz').max(80),
  city: z.string().max(80).optional().or(z.literal('')),
  phone: z.string().max(30).optional().or(z.literal('')),
})

type ProfileForm = z.infer<typeof profileSchema>

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[#6D9450] text-xs font-bold uppercase tracking-wider mb-2 px-1">{children}</h2>
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full transition-all duration-200 relative ${checked ? 'bg-[#8BB06A]' : 'bg-[#D4E8C2]'}`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${checked ? 'left-5.5 translate-x-0.5' : 'left-0.5'}`}
        style={{ left: checked ? 'calc(100% - 1.375rem)' : '0.125rem' }}
      />
    </button>
  )
}

export default function EinstellungenPage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [instagramHandle, setInstagramHandle] = useState('')
  const [instagramConnected, setInstagramConnected] = useState(false)
  const [googleProfileUrl, setGoogleProfileUrl] = useState('')
  const [notifInApp, setNotifInApp] = useState(true)
  const [notifEmail, setNotifEmail] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  })

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }

        const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (p) {
          setProfile(p)
          setInstagramHandle(p.instagram_handle ?? '')
          setInstagramConnected(p.instagram_connected ?? false)
          setGoogleProfileUrl((p as unknown as { google_profile_url?: string }).google_profile_url ?? '')
          reset({
            full_name: p.full_name ?? '',
            city: p.city ?? '',
            phone: p.phone ?? '',
          })
        }
      } catch {
        toast.error('Fehler beim Laden')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const onSaveProfile = async (values: ProfileForm) => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase.from('profiles').update({
        full_name: values.full_name,
        city: values.city || null,
        phone: values.phone || null,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id)
      if (error) throw error
      toast.success('Profil gespeichert ✓')
    } catch {
      toast.error('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const handleInstagramSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('profiles').update({
        instagram_handle: instagramHandle || null,
        instagram_connected: instagramConnected,
      }).eq('id', user.id)
      toast.success('Instagram gespeichert ✓')
    } catch {
      toast.error('Fehler beim Speichern')
    }
  }

  const handleGoogleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('profiles').update({
        google_profile_url: googleProfileUrl || null,
      } as Record<string, unknown>).eq('id', user.id)
      toast.success('Google-Konto gespeichert ✓')
    } catch {
      toast.error('Fehler beim Speichern')
    }
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch {
      toast.error('Fehler beim Abmelden')
      setSigningOut(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#EEF5E6] px-5 pt-12">
        <div className="skeleton h-8 w-40 rounded mb-6" />
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl mb-3" />)}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#EEF5E6] pb-24">
      <div className="px-5 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 bg-white rounded-full flex items-center justify-center border border-[#D4E8C2]">
          <ArrowLeft size={18} className="text-[#6D9450]" />
        </button>
        <h1 className="text-2xl font-bold text-[#1C1F1A]" style={{ fontFamily: 'DM Serif Display, serif' }}>
          Einstellungen ⚙️
        </h1>
      </div>

      <div className="px-5 space-y-5">
        {/* Profile */}
        <div>
          <SectionTitle>Profil bearbeiten</SectionTitle>
          <form onSubmit={handleSubmit(onSaveProfile)} className="bg-white rounded-2xl p-4 border border-[#EEF5E6] space-y-3">
            <div>
              <label className="text-[#1C1F1A] text-sm font-semibold block mb-1">Name</label>
              <input
                {...register('full_name')}
                placeholder="Dein Name"
                className="w-full border border-[#D4E8C2] rounded-xl px-3 py-2.5 text-sm text-[#1C1F1A] outline-none focus:border-[#8BB06A]"
              />
              {errors.full_name && <p className="text-[#E86B5A] text-xs mt-1">{errors.full_name.message}</p>}
            </div>
            <div>
              <label className="text-[#1C1F1A] text-sm font-semibold block mb-1">Stadt</label>
              <input
                {...register('city')}
                placeholder="Deine Stadt"
                className="w-full border border-[#D4E8C2] rounded-xl px-3 py-2.5 text-sm text-[#1C1F1A] outline-none focus:border-[#8BB06A]"
              />
            </div>
            <div>
              <label className="text-[#1C1F1A] text-sm font-semibold block mb-1">Telefon</label>
              <input
                {...register('phone')}
                placeholder="+49 ..."
                type="tel"
                className="w-full border border-[#D4E8C2] rounded-xl px-3 py-2.5 text-sm text-[#1C1F1A] outline-none focus:border-[#8BB06A]"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full gradient-primary text-white font-bold py-2.5 rounded-xl disabled:opacity-60"
            >
              {saving ? 'Wird gespeichert...' : 'Speichern'}
            </button>
          </form>
        </div>

        {/* Instagram */}
        <div>
          <SectionTitle>Instagram verbinden</SectionTitle>
          <div className="bg-white rounded-2xl p-4 border border-[#EEF5E6] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 size={18} className="text-[#E86B5A]" />
                <span className="text-[#1C1F1A] font-semibold text-sm">Instagram</span>
              </div>
              <Toggle checked={instagramConnected} onChange={setInstagramConnected} />
            </div>
            {instagramConnected && (
              <input
                value={instagramHandle}
                onChange={e => setInstagramHandle(e.target.value)}
                placeholder="@dein_handle"
                className="w-full border border-[#D4E8C2] rounded-xl px-3 py-2.5 text-sm text-[#1C1F1A] outline-none focus:border-[#8BB06A]"
              />
            )}
            <button
              onClick={handleInstagramSave}
              className="w-full gradient-primary text-white font-bold py-2.5 rounded-xl"
            >
              Speichern
            </button>
          </div>
        </div>

        {/* Google */}
        <div>
          <SectionTitle>Google-Konto verknüpfen</SectionTitle>
          <div className="bg-white rounded-2xl p-4 border border-[#EEF5E6] space-y-3">
            <div className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
              </svg>
              <span className="text-[#1C1F1A] font-semibold text-sm">Google Profil</span>
            </div>
            <p className="text-[#6D7A6D] text-xs leading-relaxed">
              Verknüpfe dein Google-Profil, damit deine Google-Bewertungen schneller verifiziert werden können.
            </p>
            <input
              value={googleProfileUrl}
              onChange={e => setGoogleProfileUrl(e.target.value)}
              placeholder="https://maps.google.com/contrib/..."
              className="w-full border border-[#D4E8C2] rounded-xl px-3 py-2.5 text-sm text-[#1C1F1A] outline-none focus:border-[#8BB06A]"
            />
            <button
              onClick={handleGoogleSave}
              className="w-full gradient-primary text-white font-bold py-2.5 rounded-xl text-sm"
            >
              Speichern
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div>
          <SectionTitle>Benachrichtigungen</SectionTitle>
          <div className="bg-white rounded-2xl p-4 border border-[#EEF5E6] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-[#8BB06A]" />
                <span className="text-[#1C1F1A] text-sm">In-App Benachrichtigungen</span>
              </div>
              <Toggle checked={notifInApp} onChange={setNotifInApp} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">✉️</span>
                <span className="text-[#1C1F1A] text-sm">E-Mail Benachrichtigungen</span>
              </div>
              <Toggle checked={notifEmail} onChange={setNotifEmail} />
            </div>
          </div>
        </div>

        {/* Password */}
        <div>
          <SectionTitle>Konto</SectionTitle>
          <div className="bg-white rounded-2xl p-4 border border-[#EEF5E6]">
            <div className="flex items-center gap-2 mb-3">
              <Lock size={16} className="text-[#8BB06A]" />
              <span className="text-[#1C1F1A] font-semibold text-sm">Passwort ändern</span>
            </div>
            <button
              onClick={async () => {
                try {
                  const { data: { user } } = await supabase.auth.getUser()
                  if (!user?.email) return
                  await supabase.auth.resetPasswordForEmail(user.email)
                  toast.success('Reset-Link wurde gesendet!')
                } catch {
                  toast.error('Fehler beim Senden')
                }
              }}
              className="w-full border border-[#D4E8C2] text-[#6D9450] font-semibold py-2.5 rounded-xl text-sm"
            >
              Reset-Link senden
            </button>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full bg-[#E86B5A] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <LogOut size={18} />
          {signingOut ? 'Wird abgemeldet...' : 'Abmelden'}
        </button>
      </div>
    </div>
  )
}
