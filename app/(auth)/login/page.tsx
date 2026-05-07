'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(1, 'Passwort ist erforderlich'),
})

type FormData = z.infer<typeof schema>

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    if (error) {
      setLoading(false)
      toast.error(error.message)
      return
    }

    // Role-based redirect
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, onboarding_completed')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'restaurant_owner' || profile?.role === 'admin') {
        router.push('/dashboard')
      } else if (!profile?.onboarding_completed) {
        router.push('/onboarding')
      } else {
        router.push('/home')
      }
    } else {
      router.push('/home')
    }
    setLoading(false)
  }

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setOauthLoading(provider)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      toast.error(error.message)
      setOauthLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1
          className="text-2xl text-[#1C1F1A]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Willkommen zurück 👋
        </h1>
        <p className="text-[#1C1F1A]/50 text-sm mt-1">Melde dich in deinem Konto an</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1C1F1A]/40" />
            <input
              {...register('email')}
              type="email"
              placeholder="E-Mail"
              autoComplete="email"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#D4E8C2] bg-[#EEF5E6]/50 text-[#1C1F1A] placeholder-[#1C1F1A]/40 focus:outline-none focus:border-[#8BB06A] focus:ring-2 focus:ring-[#8BB06A]/20 transition-all text-sm"
            />
          </div>
          {errors.email && <p className="text-[#E86B5A] text-xs mt-1 ml-1">{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1C1F1A]/40" />
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="Passwort"
              autoComplete="current-password"
              className="w-full pl-10 pr-10 py-3 rounded-xl border border-[#D4E8C2] bg-[#EEF5E6]/50 text-[#1C1F1A] placeholder-[#1C1F1A]/40 focus:outline-none focus:border-[#8BB06A] focus:ring-2 focus:ring-[#8BB06A]/20 transition-all text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1C1F1A]/40 hover:text-[#1C1F1A]/70 transition-colors"
              aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-[#E86B5A] text-xs mt-1 ml-1">{errors.password.message}</p>}
        </div>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs text-[#8BB06A] hover:text-[#6D9450] transition-colors"
          >
            Passwort vergessen?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full gradient-primary text-white font-semibold py-3 rounded-xl hover:opacity-90 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : null}
          Einloggen
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[#D4E8C2]" />
        <span className="text-xs text-[#1C1F1A]/40">oder</span>
        <div className="flex-1 h-px bg-[#D4E8C2]" />
      </div>

      {/* OAuth */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => handleOAuth('google')}
          disabled={oauthLoading !== null}
          className="w-full flex items-center justify-center gap-3 border border-[#D4E8C2] bg-white text-[#1C1F1A] font-medium py-3 rounded-xl hover:bg-[#EEF5E6] disabled:opacity-60 transition-colors text-sm"
        >
          {oauthLoading === 'google' ? (
            <span className="w-4 h-4 border-2 border-[#1C1F1A]/20 border-t-[#1C1F1A] rounded-full animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          Mit Google anmelden
        </button>

        <button
          type="button"
          onClick={() => handleOAuth('apple')}
          disabled={oauthLoading !== null}
          className="w-full flex items-center justify-center gap-3 bg-[#1C1F1A] text-white font-medium py-3 rounded-xl hover:bg-[#2a2f27] disabled:opacity-60 transition-colors text-sm"
        >
          {oauthLoading === 'apple' ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg width="16" height="18" viewBox="0 0 16 18" fill="currentColor" aria-hidden="true">
              <path d="M13.18 9.22c-.02-2.1 1.72-3.11 1.8-3.16-1-1.45-2.54-1.65-3.08-1.67-1.31-.13-2.57.77-3.23.77-.68 0-1.7-.75-2.8-.73C4.4 4.46 3 5.3 2.23 6.6c-1.54 2.65-.39 6.56 1.09 8.71.74 1.05 1.6 2.23 2.74 2.18 1.1-.04 1.52-.71 2.85-.71 1.32 0 1.7.71 2.86.69 1.19-.02 1.94-1.07 2.66-2.13.84-1.22 1.19-2.4 1.2-2.46-.03-.01-2.3-.88-2.45-3.66ZM10.98 2.8C11.6 2.05 12 1.02 11.86 0c-.87.04-1.94.58-2.57 1.31-.56.63-1.05 1.65-.92 2.62.97.07 1.96-.48 2.61-1.13Z"/>
            </svg>
          )}
          Mit Apple anmelden
        </button>
      </div>

      <p className="text-center text-sm text-[#1C1F1A]/50">
        Noch kein Konto?{' '}
        <Link href="/register" className="text-[#8BB06A] font-semibold hover:text-[#6D9450] transition-colors">
          Registrieren
        </Link>
      </p>
    </div>
  )
}
