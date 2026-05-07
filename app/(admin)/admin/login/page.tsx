'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/admin/dashboard')
    } else {
      setError('Falsches Passwort. Bitte erneut versuchen.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#1C1F1A] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#8BB06A]/20 border border-[#8BB06A]/30 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-[#8BB06A]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Admin-Bereich</h1>
          <p className="text-white/40 text-sm mt-1">pistazz.io — Geschützter Zugang</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin-Passwort"
              className="w-full bg-white/8 border border-white/12 text-white placeholder-white/30 px-4 py-3.5 rounded-xl pr-12 focus:outline-none focus:border-[#8BB06A]/60 focus:ring-1 focus:ring-[#8BB06A]/20 transition-all"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
              {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-400 text-sm text-center"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-sm disabled:opacity-50 transition-all"
            style={{ background: 'linear-gradient(135deg,#8BB06A,#577A3D)' }}
          >
            {loading ? 'Prüfe…' : 'Einloggen →'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
