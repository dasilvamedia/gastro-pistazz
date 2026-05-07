'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

/* ─────────────────────────────────────────────
   Slide 1 – Welcome
───────────────────────────────────────────── */
function Slide0() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-8 text-center relative">
      <span className="absolute top-[8%] left-[10%] text-2xl opacity-25 select-none pointer-events-none">🍽️</span>
      <span className="absolute top-[18%] right-[8%] text-xl opacity-20 select-none pointer-events-none">✨</span>
      <span className="absolute bottom-[15%] left-[6%] text-2xl opacity-20 select-none pointer-events-none">💰</span>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div
          className="w-28 h-28 rounded-full bg-white flex items-center justify-center mx-auto mb-3"
          style={{ boxShadow: '0 8px 32px rgba(139,176,106,0.3)' }}
        >
          <span className="text-5xl">🫙</span>
        </div>
        <p className="text-[#577A3D] font-bold text-lg tracking-wide">pistazz.io</p>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="space-y-4"
      >
        <h2 className="text-[32px] font-bold text-[#1C1F1A] leading-tight">
          Entdecke dein<br />Lieblingsrestaurant!
        </h2>
        <p className="text-[#6D7A6D] text-base leading-relaxed">
          Free Food? Yes, please! 🎉<br />
          Schnapp dir deine Freunde – los geht&apos;s!
        </p>
      </motion.div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Slide 2 – Stories & Punkte
───────────────────────────────────────────── */
function Slide1() {
  const cards = [
    { emoji: '🥗', bg: 'linear-gradient(135deg,#d4e8c2,#a8c88e)', rotate: -12, tx: '-34%' },
    { emoji: '🍔', bg: 'linear-gradient(135deg,#8bb06a,#577a3d)', rotate: 0,   tx: '0%'   },
    { emoji: '🍕', bg: 'linear-gradient(135deg,#c8ddb0,#8bb06a)', rotate: 13,  tx: '34%'  },
  ]

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-8 text-center relative">
      <span className="absolute top-[8%] left-[8%] text-2xl opacity-25 select-none pointer-events-none">📌</span>
      <span className="absolute top-[20%] right-[6%] text-xl opacity-20 select-none pointer-events-none">💰</span>
      <span className="absolute bottom-[18%] right-[10%] text-2xl opacity-20 select-none pointer-events-none">✨</span>

      {/* Stacked photo cards */}
      <div className="relative h-52 w-full flex items-center justify-center mb-8">
        {cards.map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className="absolute w-36 h-44 rounded-2xl shadow-lg flex items-center justify-center"
            style={{
              background: c.bg,
              transform: `translateX(${c.tx}) rotate(${c.rotate}deg)`,
              zIndex: i === 1 ? 3 : 1,
            }}
          >
            <span className="text-5xl">{c.emoji}</span>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.28, duration: 0.5 }}
        className="space-y-3"
      >
        <h2 className="text-[28px] font-bold text-[#1C1F1A] leading-tight">
          Erstelle Instagram Stories 📸
        </h2>
        <p className="text-[#6D7A6D] text-base leading-relaxed px-2">
          Mache ein Foto deines Essens, teile es direkt mit einem Klick als Story und erhalte{' '}
          <strong className="text-[#577A3D]">500 Punkte</strong>.
        </p>
      </motion.div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Slide 3 – Deals einlösen
───────────────────────────────────────────── */
function Slide2() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 text-center relative">
      <span className="absolute top-[8%] left-[6%] text-2xl opacity-20 select-none pointer-events-none">🍽️</span>
      <span className="absolute bottom-[20%] right-[6%] text-2xl opacity-20 select-none pointer-events-none">🎯</span>

      {/* Mock Deal Card */}
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full bg-white rounded-3xl p-5 mb-8 text-left"
        style={{ boxShadow: '0 8px 40px rgba(139,176,106,0.2)' }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-14 h-14 rounded-xl bg-[#EEF5E6] flex items-center justify-center text-3xl flex-shrink-0">
            🍣
          </div>
          <div>
            <p className="text-[#6D9450] text-xs font-semibold">Restaurant pistazz</p>
            <p className="text-[#1C1F1A] font-bold text-base leading-tight">2:1 Hauptgericht Deal</p>
          </div>
        </div>
        <div className="bg-[#F5F9F0] rounded-xl px-4 py-3 mb-4">
          <p className="text-[#6D7A6D] text-sm leading-snug">
            Beim Kauf von 2 Hauptgerichten geht eines aufs Haus
          </p>
        </div>
        <button
          className="w-full py-3 rounded-2xl font-bold text-white text-sm"
          style={{ background: 'linear-gradient(135deg,#8BB06A,#577A3D)' }}
        >
          Deal einlösen
        </button>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className="space-y-3"
      >
        <h2 className="text-[28px] font-bold text-[#1C1F1A] leading-tight">
          Löse deine Deals ein 💰
        </h2>
        <p className="text-[#6D7A6D] text-base leading-relaxed">
          Tausche deine Punkte gegen Gratis-Desserts, Rabatte oder sogar komplette Menüs in deinen Lieblingsrestaurants! 🤝
        </p>
      </motion.div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Main Onboarding Page
───────────────────────────────────────────── */
const slides = [Slide0, Slide1, Slide2]

export default function OnboardingPage() {
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const goNext = async () => {
    if (current < slides.length - 1) {
      setCurrent(current + 1)
    } else {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id)
        }
        router.push('/home')
      } catch {
        router.push('/home')
      } finally {
        setLoading(false)
      }
    }
  }

  const CurrentSlide = slides[current]

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: '#F5F8F2' }}>

      {/* Decorative circle — top right (pistazz green) */}
      <div
        className="absolute -top-28 -right-28 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: '#8BB06A', opacity: 0.15 }}
      />

      {/* Decorative circle — bottom left (warm beige) */}
      <div
        className="absolute -bottom-28 -left-28 w-72 h-72 rounded-full pointer-events-none"
        style={{ background: '#E8D9B5', opacity: 0.6 }}
      />

      {/* Dot navigation */}
      <div className="flex justify-center pt-14 gap-2 relative z-10">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="h-2.5 rounded-full transition-all duration-300"
            style={{
              width: current === i ? 32 : 10,
              background: current === i ? '#577A3D' : '#C8DDB0',
            }}
          />
        ))}
      </div>

      {/* Slide */}
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={current}
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -60, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col flex-1 relative z-10 min-h-0"
        >
          <CurrentSlide />
        </motion.div>
      </AnimatePresence>

      {/* Buttons — pb accounts for iPhone home bar safe area */}
      <div className="flex gap-3 px-6 pt-4 relative z-10" style={{ paddingBottom: 'max(48px, env(safe-area-inset-bottom, 48px) + 16px)' }}>
        {current === 0 ? (
          <button
            onClick={goNext}
            className="w-full py-4 rounded-2xl text-white font-bold text-base shadow-lg"
            style={{ background: 'linear-gradient(135deg,#8BB06A,#577A3D)' }}
          >
            Jetzt loslegen ✨
          </button>
        ) : (
          <>
            <button
              onClick={() => setCurrent(current - 1)}
              className="flex-none w-28 py-4 rounded-2xl border-2 font-semibold text-sm"
              style={{ borderColor: '#8BB06A', color: '#6D9450' }}
            >
              Zurück
            </button>
            <button
              onClick={goNext}
              disabled={loading}
              className="flex-1 py-4 rounded-2xl text-white font-bold shadow-lg disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#8BB06A,#577A3D)' }}
            >
              {current < slides.length - 1
                ? 'Weiter'
                : loading ? 'Lädt…' : "Los geht's 🫶🏽"}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
