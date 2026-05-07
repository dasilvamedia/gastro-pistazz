'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff, Shield, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()

    // 1. Sign in with email + password
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError || !data.user) {
      setError('E-Mail oder Passwort falsch. Bitte erneut versuchen.')
      setLoading(false)
      return
    }

    // 2. Verify admin role via RPC (bypasses RLS)
    const { data: roleData } = await supabase.rpc('get_my_role')
    const role = roleData as string | null

    if (role !== 'super_admin' && role !== 'admin') {
      await supabase.auth.signOut()
      setError('Kein Admin-Zugang für diesen Account.')
      setLoading(false)
      return
    }

    // 3. Redirect — middleware auto-sets admin_session cookie
    router.push('/admin/dashboard')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: '#1C1F1A' }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: '#8BB06A' }} />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-5"
          style={{ background: '#8BB06A' }} />
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
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'rgba(139,176,106,0.15)', border: '1px solid rgba(139,176,106,0.3)' }}
          >
            <Shield className="w-8 h-8 text-[#8BB06A]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Admin-Bereich</h1>
          <p className="text-white/40 text-sm mt-1.5">
            <span className="text-[#8BB06A]">pistazz</span>.io — Geschützter Zugang
          </p>
        </div>

        {/* Form — autocomplete disabled to prevent browser pre-fill */}
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          {/* Hidden honeypot fields fool password managers into filling these instead */}
          <input type="text" name="username_fake" style={{ display: 'none' }} tabIndex={-1} readOnly />
          <input type="password" name="password_fake" style={{ display: 'none' }} tabIndex={-1} readOnly />

          {/* Email */}
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
              <Mail className="w-4 h-4 text-white/30" />
            </div>
            <input
              type="text"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-Mail Adresse"
              className="w-full pl-10 pr-4 py-3.5 rounded-xl text-white placeholder-white/25 text-sm focus:outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
              onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(139,176,106,0.5)' }}
              onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)' }}
              autoComplete="off"
              name="admin_email"
              data-form-type="other"
              required
            />
          </div>

          {/* Password */}
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
              <Lock className="w-4 h-4 text-white/30" />
            </div>
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Passwort eingeben"
              className="w-full pl-10 pr-12 py-3.5 rounded-xl text-white placeholder-white/25 text-sm focus:outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: error ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.1)',
              }}
              onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(139,176,106,0.5)' }}
              onBlur={(e) => { e.currentTarget.style.border = error ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.1)' }}
              autoComplete="new-password"
              name="admin_pw"
              data-form-type="other"
              required
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-400 text-xs text-center"
            >
              ⚠ {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: loading ? '#577A3D' : 'linear-gradient(135deg,#8BB06A,#577A3D)' }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Anmeldung läuft…
              </span>
            ) : 'Einloggen →'}
          </button>
        </form>

        <p className="text-center text-white/20 text-xs mt-8">
          Nur für autorisierte Administratoren
        </p>
      </motion.div>
    </div>
  )
}
