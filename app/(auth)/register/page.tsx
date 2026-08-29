'use client'

import { useState, useEffect, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { notifyNewUser } from '@/lib/notify'

const schema = z
  .object({
    full_name: z.string().min(2, 'Name ist zu kurz'),
    email: z.string().email('Ungültige E-Mail-Adresse'),
    password: z.string().min(8, 'Mindestens 8 Zeichen'),
    confirm_password: z.string(),
    privacy: z.literal(true, 'Datenschutz muss akzeptiert werden'),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'Passwörter stimmen nicht überein',
    path: ['confirm_password'],
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

function RegisterInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const restaurantSlug = searchParams.get('restaurant') ?? ''
  const supabase = createClient()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { full_name: data.full_name } },
    })

    if (error) {
      setLoading(false)
      toast.error(error.message)
      return
    }

    // Benachrichtigung an info@pistazz.io (nicht-blockierend)
    notifyNewUser({ email: data.email, name: data.full_name, method: 'email' })

    const dest = restaurantSlug ? `/onboarding?restaurant=${restaurantSlug}` : '/onboarding'

    // Session sofort vorhanden (E-Mail-Bestätigung deaktiviert) → direkt weiter, kein Login nötig
    if (authData.session) {
      router.push(dest)
      return
    }

    // Fallback: keine Session zurückgegeben → sofort automatisch einloggen,
    // damit der Nutzer die Daten NICHT erneut eingeben muss.
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    setLoading(false)

    if (signInData?.session) {
      router.push(dest)
      return
    }

    // Nur wenn wirklich E-Mail-Bestätigung erzwungen wird (Server-seitig)
    if (signInError?.message?.toLowerCase().includes('not confirmed') || signInError?.message?.toLowerCase().includes('confirm')) {
      toast.success('Konto erstellt! Bitte bestätige deine E-Mail, dann kannst du dich einloggen.')
    } else if (signInError) {
      toast.error(signInError.message)
    }
    router.push('/login' + (restaurantSlug ? `?restaurant=${restaurantSlug}` : ''))
  }

  // Kommt der Nutzer aus dem System-Browser zurueck ohne den Login
  // abzuschliessen, darf der Button-Spinner nicht ewig weiterdrehen.
  useEffect(() => {
    const reset = () => { if (!document.hidden) setOauthLoading(null) }
    document.addEventListener('visibilitychange', reset)
    return () => document.removeEventListener('visibilitychange', reset)
  }, [])

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setOauthLoading(provider)
    const w = window as unknown as {
      Capacitor?: {
        Plugins?: {
          NativeAuth?: {
            signInWithApple: () => Promise<{ identityToken: string; nonce: string; fullName: string }>
            signInWithGoogle: () => Promise<{ idToken: string }>
          }
        }
      }
    }
    const nativeAuth = w.Capacitor?.Plugins?.NativeAuth

    // Voll nativer Login (ab Build 5): Apples/Googles System-Sheet direkt in
    // der App, ID-Token wird ohne Browser gegen die Supabase-Session
    // getauscht. Kein Redirect, kein Safari/Chrome.
    if (nativeAuth) {
      try {
        if (provider === 'google') {
          const { idToken } = await nativeAuth.signInWithGoogle()
          const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })
          if (error) throw error
        } else {
          const { identityToken, nonce, fullName } = await nativeAuth.signInWithApple()
          const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: identityToken, nonce })
          if (error) throw error
          // Der Name kommt nur beim allerersten Apple-Login mit
          if (fullName) supabase.auth.updateUser({ data: { full_name: fullName } }).then(undefined, () => {})
        }
        // Callback-Seite uebernimmt Profil-Anlage + rollenbasierten Redirect
        window.location.href = '/auth/callback' + (restaurantSlug ? `?restaurant=${restaurantSlug}` : '')
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (msg !== 'cancelled') toast.error('Anmeldung fehlgeschlagen. Bitte erneut versuchen.')
        setOauthLoading(null)
      }
      return
    }

    const isNative = !!(window as unknown as { Capacitor?: unknown }).Capacitor
    // Nativ: Login im System-Browser, Rueckkehr per Custom-URL-Scheme in die
    // App (siehe NativeAuthHandler). Web: normaler Redirect-Flow.
    // Nativ NICHT direkt aufs Custom-Scheme redirecten - iOS blockt
    // Scheme-Spruenge in automatischen 302-Ketten. Die native-bridge-Seite
    // (normales https) verteilt den Ruecksprung zuverlaessig.
    const callbackUrl = isNative
      ? `${window.location.origin}/auth/native-bridge${restaurantSlug ? `?restaurant=${restaurantSlug}` : ''}`
      : restaurantSlug
        ? `${window.location.origin}/auth/callback?restaurant=${restaurantSlug}`
        : `${window.location.origin}/auth/callback`

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl, skipBrowserRedirect: isNative },
    })
    if (error) {
      toast.error(error.message)
      setOauthLoading(null)
      return
    }
    // window.open ist im WKWebView wirkungslos (kein Popup-Delegate) -
    // normale Navigation dagegen wirft Capacitor bei fremden Domains
    // zuverlaessig in den System-Browser, genau was wir hier wollen.
    if (isNative && data?.url) window.location.href = data.url
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1
          className="text-2xl text-[#1C1F1A]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Konto erstellen ✨
        </h1>
        <p className="text-[#1C1F1A]/50 text-sm mt-1">
          {restaurantSlug
            ? 'Registriere dich kostenlos und sammle Punkte'
            : 'Starte kostenlos, keine Kreditkarte nötig'}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Full name */}
        <div>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1C1F1A]/40" />
            <input
              {...register('full_name')}
              type="text"
              placeholder="Vollständiger Name"
              autoComplete="name"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#D4E8C2] bg-[#EEF5E6]/50 text-[#1C1F1A] placeholder-[#1C1F1A]/40 focus:outline-none focus:border-[#8BB06A] focus:ring-2 focus:ring-[#8BB06A]/20 transition-all text-sm"
            />
          </div>
          {errors.full_name && <p className="text-[#E86B5A] text-xs mt-1 ml-1">{errors.full_name.message}</p>}
        </div>

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
              placeholder="Passwort (min. 8 Zeichen)"
              autoComplete="new-password"
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

        {/* Confirm password */}
        <div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1C1F1A]/40" />
            <input
              {...register('confirm_password')}
              type={showConfirm ? 'text' : 'password'}
              placeholder="Passwort bestätigen"
              autoComplete="new-password"
              className="w-full pl-10 pr-10 py-3 rounded-xl border border-[#D4E8C2] bg-[#EEF5E6]/50 text-[#1C1F1A] placeholder-[#1C1F1A]/40 focus:outline-none focus:border-[#8BB06A] focus:ring-2 focus:ring-[#8BB06A]/20 transition-all text-sm"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1C1F1A]/40 hover:text-[#1C1F1A]/70 transition-colors"
              aria-label={showConfirm ? 'Passwort verbergen' : 'Passwort anzeigen'}
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirm_password && (
            <p className="text-[#E86B5A] text-xs mt-1 ml-1">{errors.confirm_password.message}</p>
          )}
        </div>

        {/* Privacy checkbox */}
        <div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              {...register('privacy')}
              type="checkbox"
              className="mt-0.5 w-4 h-4 rounded border-[#D4E8C2] accent-[#8BB06A] cursor-pointer"
            />
            <span className="text-xs text-[#1C1F1A]/60 leading-relaxed">
              Ich akzeptiere die{' '}
              <Link href="/datenschutz" className="text-[#8BB06A] hover:underline">
                Datenschutzbestimmungen
              </Link>{' '}
              und{' '}
              <Link href="/impressum" className="text-[#8BB06A] hover:underline">
                Nutzungsbedingungen
              </Link>
            </span>
          </label>
          {errors.privacy && <p className="text-[#E86B5A] text-xs mt-1 ml-7">{errors.privacy.message}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full gradient-primary text-white font-semibold py-3 rounded-xl hover:opacity-90 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : null}
          Registrieren
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
          Mit Google registrieren
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
          Mit Apple registrieren
        </button>
      </div>

      <p className="text-center text-sm text-[#1C1F1A]/50">
        Bereits ein Konto?{' '}
        <Link
          href={'/login' + (restaurantSlug ? `?restaurant=${restaurantSlug}` : '')}
          className="text-[#8BB06A] font-semibold hover:text-[#6D9450] transition-colors"
        >
          Einloggen
        </Link>
      </p>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="h-96 flex items-center justify-center"><span className="w-8 h-8 border-2 border-[#8BB06A] border-t-transparent rounded-full animate-spin" /></div>}>
      <RegisterInner />
    </Suspense>
  )
}
