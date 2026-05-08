'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { Restaurant, Deal } from '@/types'
import { TRIGGER_CONFIG } from '@/types'

/* ─────────────────────────────────────────────
   Slide 1 – Welcome
───────────────────────────────────────────── */
function Slide0() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '0 32px', textAlign: 'center', position: 'relative' }}>
      <span style={{ position: 'absolute', top: '8%', left: '10%', fontSize: '1.5rem', opacity: 0.25, userSelect: 'none', pointerEvents: 'none' }}>🍽️</span>
      <span style={{ position: 'absolute', top: '18%', right: '8%', fontSize: '1.25rem', opacity: 0.20, userSelect: 'none', pointerEvents: 'none' }}>✨</span>
      <span style={{ position: 'absolute', bottom: '15%', left: '6%', fontSize: '1.5rem', opacity: 0.20, userSelect: 'none', pointerEvents: 'none' }}>💰</span>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{ marginBottom: '2rem' }}
      >
        <div style={{ width: 112, height: 112, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem', boxShadow: '0 8px 32px rgba(139,176,106,0.3)' }}>
          <span style={{ fontSize: '3rem' }}>🫙</span>
        </div>
        <p style={{ color: '#577A3D', fontWeight: 700, fontSize: '1.125rem', letterSpacing: '0.05em' }}>pistazz.io</p>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#1C1F1A', lineHeight: 1.2 }}>
          Entdecke dein<br />Lieblingsrestaurant!
        </h2>
        <p style={{ color: '#6D7A6D', fontSize: '1rem', lineHeight: 1.6 }}>
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
function Slide1({ points }: { points: number }) {
  const cards = [
    { emoji: '🥗', bg: 'linear-gradient(135deg,#d4e8c2,#a8c88e)', rotate: -12, tx: '-34%' },
    { emoji: '🍔', bg: 'linear-gradient(135deg,#8bb06a,#577a3d)', rotate: 0,   tx: '0%' },
    { emoji: '🍕', bg: 'linear-gradient(135deg,#c8ddb0,#8bb06a)', rotate: 13,  tx: '34%' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '0 32px', textAlign: 'center', position: 'relative' }}>
      <span style={{ position: 'absolute', top: '8%', left: '8%', fontSize: '1.5rem', opacity: 0.25, userSelect: 'none', pointerEvents: 'none' }}>📌</span>
      <span style={{ position: 'absolute', top: '20%', right: '6%', fontSize: '1.25rem', opacity: 0.20, userSelect: 'none', pointerEvents: 'none' }}>💰</span>
      <span style={{ position: 'absolute', bottom: '18%', right: '10%', fontSize: '1.5rem', opacity: 0.20, userSelect: 'none', pointerEvents: 'none' }}>✨</span>

      <div style={{ position: 'relative', height: 208, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
        {cards.map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            style={{
              position: 'absolute',
              width: 144,
              height: 176,
              borderRadius: '1rem',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: c.bg,
              transform: `translateX(${c.tx}) rotate(${c.rotate}deg)`,
              zIndex: i === 1 ? 3 : 1,
            }}
          >
            <span style={{ fontSize: '3rem' }}>{c.emoji}</span>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.28, duration: 0.5 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
      >
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1C1F1A', lineHeight: 1.2 }}>
          Erstelle Instagram Stories 📸
        </h2>
        <p style={{ color: '#6D7A6D', fontSize: '1rem', lineHeight: 1.6 }}>
          Mache ein Foto deines Essens, teile es als Story und erhalte{' '}
          <strong style={{ color: '#577A3D' }}>{points} Punkte</strong>.
        </p>
      </motion.div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Slide 3 – Echte Deals des Restaurants
───────────────────────────────────────────── */
function Slide2({ restaurant, deal }: { restaurant: Restaurant | null; deal: Deal | null }) {
  const trigger = deal ? (TRIGGER_CONFIG[deal.trigger] ?? { emoji: '🎁' }) : { emoji: '🍣' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '0 24px', textAlign: 'center', position: 'relative' }}>
      <span style={{ position: 'absolute', top: '8%', left: '6%', fontSize: '1.5rem', opacity: 0.20, userSelect: 'none', pointerEvents: 'none' }}>🍽️</span>
      <span style={{ position: 'absolute', bottom: '20%', right: '6%', fontSize: '1.5rem', opacity: 0.20, userSelect: 'none', pointerEvents: 'none' }}>🎯</span>

      {/* Deal-Karte — echte Daten wenn vorhanden */}
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        style={{
          width: '100%',
          background: '#fff',
          borderRadius: '1.5rem',
          padding: '1.25rem',
          marginBottom: '2rem',
          textAlign: 'left',
          boxShadow: '0 8px 40px rgba(139,176,106,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div style={{ width: 56, height: 56, borderRadius: '0.75rem', background: '#EEF5E6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.875rem', flexShrink: 0 }}>
            {deal?.image_url
              ? <img src={deal.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '0.75rem' }} />
              : trigger.emoji}
          </div>
          <div>
            <p style={{ color: '#6D9450', fontSize: '0.75rem', fontWeight: 600 }}>
              {restaurant?.name ?? 'Dein Restaurant'}
            </p>
            <p style={{ color: '#1C1F1A', fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>
              {deal?.title ?? 'Exklusive Deals & Angebote'}
            </p>
            {deal?.badge_text && (
              <span style={{ display: 'inline-block', background: 'rgba(229,184,76,0.2)', color: '#E5B84C', fontWeight: 700, fontSize: '0.7rem', padding: '2px 8px', borderRadius: 99, marginTop: 4 }}>
                {deal.badge_text}
              </span>
            )}
          </div>
        </div>
        <div style={{ background: '#F5F9F0', borderRadius: '0.75rem', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
          <p style={{ color: '#6D7A6D', fontSize: '0.875rem', lineHeight: 1.4 }}>
            {deal?.description ?? 'Sammle Punkte und löse sie gegen exklusive Prämien ein 🎁'}
          </p>
        </div>
        <div style={{ width: '100%', padding: '0.75rem', borderRadius: '1rem', fontWeight: 700, color: '#fff', fontSize: '0.875rem', background: 'linear-gradient(135deg,#8BB06A,#577A3D)', textAlign: 'center' }}>
          Deal einlösen ✨
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
      >
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1C1F1A', lineHeight: 1.2 }}>
          Löse deine Deals ein 💰
        </h2>
        <p style={{ color: '#6D7A6D', fontSize: '1rem', lineHeight: 1.6 }}>
          Tausche deine Punkte gegen Gratis-Desserts, Rabatte oder komplette Menüs! 🤝
        </p>
      </motion.div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Inner component (needs Suspense for useSearchParams)
───────────────────────────────────────────── */
function OnboardingInner() {
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(false)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [deal, setDeal] = useState<Deal | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const restaurantSlug = searchParams.get('restaurant')
  const supabase = createClient()

  // Load real restaurant + first deal when slug is available
  useEffect(() => {
    if (!restaurantSlug) return
    const load = async () => {
      const { data: rest } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', restaurantSlug)
        .single()
      if (!rest) return
      setRestaurant(rest as Restaurant)

      const { data: deals } = await supabase
        .from('deals')
        .select('*')
        .eq('restaurant_id', rest.id)
        .eq('status', 'active')
        .limit(1)
      if (deals && deals.length > 0) setDeal(deals[0] as Deal)
    }
    load()
  }, [restaurantSlug, supabase])

  const slides = [
    () => <Slide0 />,
    () => <Slide1 points={restaurant?.points_per_story ?? 500} />,
    () => <Slide2 restaurant={restaurant} deal={deal} />,
  ]

  const goNext = async () => {
    if (current < slides.length - 1) {
      setCurrent(current + 1)
      return
    }

    setLoading(true)

    try {
      // Use getSession (reads from cookie, no network call) to avoid hanging
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        // Wait up to 3s for the update — then navigate regardless
        await Promise.race([
          supabase
            .from('profiles')
            .update({ onboarding_completed: true })
            .eq('id', session.user.id),
          new Promise<void>(resolve => setTimeout(resolve, 3000)),
        ])
      }
    } catch {
      // Ignore errors — navigate anyway so the user isn't stuck
    } finally {
      setLoading(false)
      // Navigate back to restaurant page (or home) after onboarding
      const destination = restaurantSlug ? `/r/${restaurantSlug}` : '/home'
      router.push(destination)
    }
  }

  const CurrentSlide = slides[current]

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: '#F5F8F2',
        zIndex: 50,
      }}
    >
      {/* Decorative circle – top right */}
      <div
        style={{
          position: 'absolute',
          top: -112,
          right: -112,
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: '#8BB06A',
          opacity: 0.15,
          pointerEvents: 'none',
        }}
      />
      {/* Decorative circle – bottom left */}
      <div
        style={{
          position: 'absolute',
          bottom: -112,
          left: -112,
          width: 288,
          height: 288,
          borderRadius: '50%',
          background: '#E8D9B5',
          opacity: 0.6,
          pointerEvents: 'none',
        }}
      />

      {/* Restaurant hint at top */}
      {restaurant && (
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'center', paddingTop: 56, paddingBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(139,176,106,0.12)', borderRadius: 99, padding: '6px 16px' }}>
            {restaurant.logo_url
              ? <img src={restaurant.logo_url} alt="" style={{ width: 20, height: 20, borderRadius: 4, objectFit: 'contain' }} />
              : <span style={{ fontSize: '1rem' }}>🍽️</span>}
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#577A3D' }}>{restaurant.name}</span>
          </div>
        </div>
      )}

      {/* Dot navigation */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          paddingTop: restaurant ? 16 : 56,
          gap: 8,
          position: 'relative',
          zIndex: 10,
        }}
      >
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            style={{
              height: 10,
              width: current === i ? 32 : 10,
              borderRadius: 99,
              background: current === i ? '#577A3D' : '#C8DDB0',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s',
              padding: 0,
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
          style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative', zIndex: 10, minHeight: 0 }}
        >
          <CurrentSlide />
        </motion.div>
      </AnimatePresence>

      {/* Buttons */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          padding: '16px 24px',
          paddingBottom: 'max(48px, calc(env(safe-area-inset-bottom, 48px) + 16px))',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {current === 0 ? (
          <button
            onClick={goNext}
            style={{
              width: '100%',
              padding: '1rem',
              borderRadius: '1rem',
              color: '#fff',
              fontWeight: 700,
              fontSize: '1rem',
              background: 'linear-gradient(135deg,#8BB06A,#577A3D)',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(139,176,106,0.4)',
            }}
          >
            Jetzt loslegen ✨
          </button>
        ) : (
          <>
            <button
              onClick={() => setCurrent(current - 1)}
              style={{
                flexShrink: 0,
                width: 112,
                padding: '1rem',
                borderRadius: '1rem',
                border: '2px solid #8BB06A',
                color: '#6D9450',
                fontWeight: 600,
                fontSize: '0.875rem',
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              Zurück
            </button>
            <button
              onClick={goNext}
              disabled={loading}
              style={{
                flex: 1,
                padding: '1rem',
                borderRadius: '1rem',
                color: '#fff',
                fontWeight: 700,
                fontSize: '1rem',
                background: 'linear-gradient(135deg,#8BB06A,#577A3D)',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 4px 16px rgba(139,176,106,0.4)',
              }}
            >
              {current < slides.length - 1
                ? 'Weiter →'
                : loading
                ? 'Wird geladen…'
                : "Los geht's 🫶🏽"}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Main export — Suspense boundary for useSearchParams
───────────────────────────────────────────── */
export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F8F2' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #8BB06A', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        </div>
      }
    >
      <OnboardingInner />
    </Suspense>
  )
}
