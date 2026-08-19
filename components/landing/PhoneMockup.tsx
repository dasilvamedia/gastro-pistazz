'use client'

import { motion } from 'framer-motion'
import { useLang } from '@/lib/lang-context'
import { useIndustry } from './IndustryContext'

// Jede Branche bekommt ihr eigenes Telefon-Erlebnis: Name, Emojis, Deal, Stempelziel
const INDUSTRY_MOCK: Record<string, { business: string; emojis: [string, string, string, string, string, string]; dealSub: string; badgeReward: string; stampGoal: string; stampEmoji: string }> = {
  gastro:     { business: 'Beach Bar Aalen',    emojis: ['🍹', '🍔', '🎰', '💰', '🥂', '🍿'], dealSub: 'Gratis Snack deiner Wahl',      badgeReward: '🎁 Gratis-Cocktail',      stampGoal: '2 bis zum Gratis-Cocktail',   stampEmoji: '🍹' },
  barbershop: { business: 'Kings Barber Aalen', emojis: ['💈', '✂️', '🪒', '💰', '🧴', '🔥'], dealSub: 'Gratis Bartpflege deiner Wahl', badgeReward: '🎁 Gratis-Haarschnitt',   stampGoal: '2 bis zum Gratis-Haarschnitt', stampEmoji: '💈' },
  spa:        { business: 'Aura Spa Aalen',     emojis: ['💆', '🧖', '🕯️', '💰', '🌿', '✨'], dealSub: 'Gratis Aufguss deiner Wahl',    badgeReward: '🎁 Gratis-Massage',       stampGoal: '2 bis zur Gratis-Massage',    stampEmoji: '💆' },
  fitness:    { business: 'Flex Gym Aalen',     emojis: ['💪', '🏋️', '🥤', '💰', '👟', '🔥'], dealSub: 'Gratis Shake deiner Wahl',      badgeReward: '🎁 Gratis-Personal-Training', stampGoal: '2 bis zum Gratis-Training', stampEmoji: '💪' },
  beauty:     { business: 'Glow Studio Aalen',  emojis: ['💅', '💄', '✨', '💰', '🌸', '💖'], dealSub: 'Gratis Nail-Art deiner Wahl',   badgeReward: '🎁 Gratis-Maniküre',      stampGoal: '2 bis zur Gratis-Maniküre',   stampEmoji: '💅' },
  tattoo:     { business: 'Black Ink Aalen',    emojis: ['🖤', '🪡', '⚡', '💰', '🐉', '🔥'], dealSub: 'Gratis Nachstechen inklusive',  badgeReward: '🎁 Gratis-Flash-Tattoo',  stampGoal: '2 bis zum Gratis-Flash',      stampEmoji: '🖤' },
}

const EMOJI_POSITIONS = [
  { style: { left: '-22%', top: '8%'  }, delay: 0   },
  { style: { left: '108%', top: '18%' }, delay: 0.4 },
  { style: { left: '-26%', top: '52%' }, delay: 0.7 },
  { style: { left: '112%', top: '58%' }, delay: 0.2 },
  { style: { left: '22%',  top: '-9%' }, delay: 0.5 },
  { style: { left: '68%',  top: '-6%' }, delay: 0.9 },
]

export function PhoneMockup() {
  const { t } = useLang()
  const { industry } = useIndustry()
  const m = INDUSTRY_MOCK[industry.slug] ?? INDUSTRY_MOCK.gastro
  const p = { ...t.phone, dealSub: m.dealSub, badge2: m.badgeReward, stampHint: m.stampGoal }
  const floatingEmojis = m.emojis.map((emoji, i) => ({ emoji, ...EMOJI_POSITIONS[i] }))

  const badges = [
    { text: p.badge1, pos: { left: '-28%', top: '22%' } },
    { text: p.badge2, pos: { left: '58%',  top: '74%' } },
    { text: p.badge3, pos: { left: '-14%', top: '68%' } },
  ]

  return (
    <div className="relative w-full max-w-[300px] mx-auto select-none">
      {/* Floating emojis */}
      {floatingEmojis.map(({ emoji, style, delay }) => (
        <motion.div
          key={emoji}
          className="absolute text-2xl pointer-events-none z-20"
          style={style}
          animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 3.5, delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          {emoji}
        </motion.div>
      ))}

      {/* Stat badges */}
      {badges.map(({ text, pos }, i) => (
        <motion.div
          key={i}
          className="absolute z-20 glass rounded-xl px-3 py-1.5 text-xs font-semibold text-[#1C1F1A] shadow-lg whitespace-nowrap"
          style={pos}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.8 + i * 0.25 }}
        >
          {text}
        </motion.div>
      ))}

      {/* Phone card */}
      <motion.div
        className="relative z-10 bg-[#1C1F1A] rounded-3xl shadow-2xl overflow-hidden"
        style={{ boxShadow: '0 0 60px color-mix(in srgb, var(--ind-primary) 30%, transparent), 0 20px 60px rgba(0,0,0,0.4)' }}
      >
        {/* Notch */}
        <div className="flex justify-center pt-4 pb-1">
          <div className="w-16 h-1 bg-white/20 rounded-full" />
        </div>

        <div className="px-5 pb-5 pt-2 space-y-3">
          {/* Logo */}
          <div className="flex items-baseline gap-0 justify-center py-1">
            <span className="text-base font-bold text-[var(--ind-primary)]" style={{ fontFamily: 'DM Serif Display, serif' }}>
              pistazz
            </span>
            <span className="text-base font-bold text-white/30" style={{ fontFamily: 'DM Serif Display, serif' }}>
              .io
            </span>
          </div>

          {/* Verification card */}
          <motion.div
            className="bg-white/5 rounded-xl p-3.5 space-y-2.5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[var(--ind-primary)]/20 flex items-center justify-center text-lg shrink-0">
                🍸
              </div>
              <div className="min-w-0">
                <div className="text-white text-xs font-semibold">{m.business}</div>
                <div className="text-[var(--ind-primary)] text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--ind-primary)] inline-block" />
                  {p.verified} ✓
                </div>
              </div>
            </div>
            <div className="h-px bg-white/8" />
            <div className="flex justify-between items-center">
              <span className="text-white/50 text-xs">{p.pointsEarned}</span>
              <motion.span
                className="text-[var(--ind-accent)] font-bold text-sm"
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}
              >
                +750 🪙
              </motion.span>
            </div>
          </motion.div>

          {/* Available reward */}
          <motion.div
            className="bg-gradient-to-r from-[var(--ind-primary)]/20 to-[var(--ind-primary-dark)]/10 border border-[var(--ind-primary)]/25 rounded-xl p-3 flex items-center gap-2"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.8 }}
          >
            <span className="text-xl">🎁</span>
            <div>
              <div className="text-white text-xs font-semibold">{p.dealUnlocked}</div>
              <div className="text-white/50 text-xs">{p.dealSub}</div>
            </div>
          </motion.div>

          {/* Stamp card */}
          <motion.div
            className="bg-white/5 rounded-xl p-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.65 }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-white/50 text-xs">{p.stampCard}</div>
              <div className="text-[var(--ind-primary)] text-xs font-semibold">8/10</div>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <motion.div
                  key={i}
                  className={`w-full aspect-square rounded-lg flex items-center justify-center text-xs ${
                    i < 8 ? 'bg-[var(--ind-primary)] text-white' : 'bg-white/8 text-white/20'
                  }`}
                  initial={i === 7 ? { scale: 0 } : {}}
                  animate={i === 7 ? { scale: 1 } : {}}
                  transition={{ duration: 0.3, delay: 1.2, type: 'spring' }}
                >
                  {i < 8 ? '✓' : '○'}
                </motion.div>
              ))}
            </div>
            <div className="text-white/30 text-xs mt-1.5 text-center">{p.stampHint} {m.stampEmoji}</div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
