'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Mail, ArrowLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
})

type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    setLoading(false)
    if (error) {
      toast.error(error.message)
      return
    }
    setSubmittedEmail(data.email)
    setSent(true)
  }

  return (
    <AnimatePresence initial={false} mode="wait">
      {sent ? (
        <motion.div
          key="success"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.4 }}
          className="text-center space-y-4"
        >
          <div className="w-16 h-16 bg-[#EEF5E6] rounded-full flex items-center justify-center mx-auto text-3xl">
            ✅
          </div>
          <h2
            className="text-2xl text-[#1C1F1A]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            E-Mail wurde gesendet ✅
          </h2>
          <p className="text-[#1C1F1A]/60 text-sm leading-relaxed">
            Wir haben eine E-Mail an{' '}
            <span className="font-semibold text-[#1C1F1A]">{submittedEmail}</span>{' '}
            gesendet. Klicke auf den Link in der E-Mail, um dein Passwort zurückzusetzen.
          </p>
          <p className="text-xs text-[#1C1F1A]/40">
            Keine E-Mail erhalten? Bitte prüfe deinen Spam-Ordner.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-[#8BB06A] font-semibold text-sm hover:text-[#6D9450] transition-colors mt-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zum Login
          </Link>
        </motion.div>
      ) : (
        <motion.div
          key="form"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          <div className="text-center">
            <h1
              className="text-2xl text-[#1C1F1A]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Passwort vergessen?
            </h1>
            <p className="text-[#1C1F1A]/50 text-sm mt-1">
              Gib deine E-Mail ein – wir schicken dir einen Reset-Link.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              {errors.email && (
                <p className="text-[#E86B5A] text-xs mt-1 ml-1">{errors.email.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full gradient-primary text-white font-semibold py-3 rounded-xl hover:opacity-90 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : null}
              Passwort zurücksetzen
            </button>
          </form>

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 text-[#1C1F1A]/50 text-sm hover:text-[#1C1F1A] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zum Login
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
