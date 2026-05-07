'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eye, EyeOff, UtensilsCrossed, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function RestaurantLoginPage() {
  const router = useRouter()
  const [slug, setSlug] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()

    // Internal email derived from slug — owners never see this
    const cleanSlug = slug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const internalEmail = `${cleanSlug}@gastro.pistazz.io`

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: internalEmail,
      password,
    })

    if (authError || !data.user) {
      setError('Restaurant-Name oder Passwort falsch.')
      setLoading(false)
      return
    }

    // Verify role
    const { data: roleData } = await supabase.rpc('get_my_role')
    const role = roleData as string | null

    if (role !== 'restaurant_owner' && role !== 'super_admin' && role !== 'admin') {
      await supabase.auth.signOut()
      setError('Kein Zugang für diesen Account.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #EEF5E6 0%, #D8EDCC 100%)' }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20"
          style={{ background: '#8BB06A' }} />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-10"
          style={{ background: '#577A3D' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg"
            style={{ background: 'linear-gradient(135deg,#8BB06A,#577A3D)' }}
          >
            <UtensilsCrossed className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#1C1F1A' }}>Restaurant-Login</h1>
          <p className="text-sm mt-1.5" style={{ color: '#1C1F1A60' }}>
            <span style={{ color: '#577A3D' }}>pistazz</span>.io — Dein Dashboard
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <input type="text" name="fake_user" style={{ display: 'none' }} tabIndex={-1} readOnly />
          <input type="password" name="fake_pw" style={{ display: 'none' }} tabIndex={-1} readOnly />

          {/* Restaurant Name */}
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
              <UtensilsCrossed className="w-4 h-4" style={{ color: '#8BB06A' }} />
            </div>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="Restaurant-Name"
              className="w-full pl-10 pr-4 py-3.5 rounded-xl text-sm focus:outline-none transition-all bg-white shadow-sm"
              style={{ border: '1.5px solid #D8EDCC', color: '#1C1F1A' }}
              onFocus={(e) => { e.currentTarget.style.border = '1.5px solid #8BB06A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139,176,106,0.15)' }}
              onBlur={(e) => { e.currentTarget.style.border = '1.5px solid #D8EDCC'; e.currentTarget.style.boxShadow = 'none' }}
              autoComplete="off"
              name="restaurant_name_field"
              data-form-type="other"
              required
            />
          </div>

          {/* Password */}
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
              <Lock className="w-4 h-4" style={{ color: '#8BB06A' }} />
            </div>
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Passwort"
              className="w-full pl-10 pr-12 py-3.5 rounded-xl text-sm focus:outline-none transition-all bg-white shadow-sm"
              style={{ border: error ? '1.5px solid #ef4444' : '1.5px solid #D8EDCC', color: '#1C1F1A' }}
              onFocus={(e) => { e.currentTarget.style.border = '1.5px solid #8BB06A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139,176,106,0.15)' }}
              onBlur={(e) => { e.currentTarget.style.border = error ? '1.5px solid #ef4444' : '1.5px solid #D8EDCC'; e.currentTarget.style.boxShadow = 'none' }}
              autoComplete="new-password"
              name="restaurant_pw_field"
              data-form-type="other"
              required
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: '#8BB06A60' }}
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-xs text-center"
            >
              ⚠ {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading || !slug || !password}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
            style={{ background: loading ? '#577A3D' : 'linear-gradient(135deg,#8BB06A,#577A3D)' }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Anmeldung läuft…
              </span>
            ) : 'Zum Dashboard →'}
          </button>
        </form>

        <p className="text-center text-xs mt-8" style={{ color: '#1C1F1A40' }}>
          Zugangsdaten erhältst du von pistazz.io
        </p>
      </motion.div>
    </div>
  )
}
