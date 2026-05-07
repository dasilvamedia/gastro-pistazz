'use client'

import { motion } from 'framer-motion'

const floatingEmojis = [
  { emoji: '🍕', style: { left: '-20%', top: '10%' }, delay: 0 },
  { emoji: '🍔', style: { left: '110%', top: '20%' }, delay: 0.3 },
  { emoji: '🍹', style: { left: '-25%', top: '55%' }, delay: 0.6 },
  { emoji: '💰', style: { left: '115%', top: '60%' }, delay: 0.2 },
  { emoji: '🤩', style: { left: '20%', top: '-8%' }, delay: 0.5 },
  { emoji: '🥩', style: { left: '70%', top: '-5%' }, delay: 0.8 },
]

const statBadges = [
  { text: '🤩 +2.4k Reichweite', style: { left: '-30%', top: '25%' } },
  { text: '💰 +350 Punkte', style: { left: '60%', top: '72%' } },
  { text: '📸 Story gepostet', style: { left: '-15%', top: '70%' } },
]

export function PhoneMockup() {
  return (
    <div className="relative w-full max-w-[320px] mx-auto select-none">
      {/* Floating emojis */}
      {floatingEmojis.map(({ emoji, style, delay }) => (
        <motion.div
          key={emoji}
          className="absolute text-3xl pointer-events-none z-20"
          style={style}
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, delay, repeat: Infinity, ease: 'easeInOut' as const }}
        >
          {emoji}
        </motion.div>
      ))}

      {/* Stat badges */}
      {statBadges.map(({ text, style }) => (
        <div
          key={text}
          className="absolute z-20 glass rounded-xl px-3 py-1.5 text-xs font-semibold text-[#1C1F1A] shadow-lg whitespace-nowrap"
          style={style}
        >
          {text}
        </div>
      ))}

      {/* Phone card */}
      <div className="relative z-10 bg-[#1C1F1A] rounded-3xl shadow-2xl glow-primary overflow-hidden">
        {/* Notch */}
        <div className="flex justify-center pt-4 pb-2">
          <div className="w-20 h-1 bg-white/20 rounded-full" />
        </div>

        <div className="px-6 pb-6 pt-2 space-y-4">
          {/* Logo */}
          <div className="flex items-baseline gap-0 justify-center py-2">
            <span
              className="text-lg font-bold text-[#8BB06A]"
              style={{ fontFamily: 'DM Serif Display, serif' }}
            >
              pistazz
            </span>
            <span
              className="text-lg font-bold text-white/40"
              style={{ fontFamily: 'DM Serif Display, serif' }}
            >
              .io
            </span>
          </div>

          {/* Mock content */}
          <div className="bg-white/5 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#8BB06A]/20 flex items-center justify-center text-xl">
                🍽️
              </div>
              <div>
                <div className="text-white text-sm font-semibold">Bella Italia</div>
                <div className="text-white/50 text-xs">Story verifiziert ✓</div>
              </div>
            </div>
            <div className="h-px bg-white/10" />
            <div className="flex justify-between items-center">
              <span className="text-white/60 text-xs">Punkte verdient</span>
              <span className="text-[#E5B84C] font-bold">+500 🪙</span>
            </div>
          </div>

          {/* Stamp card preview */}
          <div className="bg-white/5 rounded-2xl p-4">
            <div className="text-white/60 text-xs mb-2">Stempelkarte</div>
            <div className="grid grid-cols-5 gap-1.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-full aspect-square rounded-lg flex items-center justify-center text-sm ${
                    i < 7 ? 'bg-[#8BB06A] text-white' : 'bg-white/10 text-white/20'
                  }`}
                >
                  {i < 7 ? '✓' : '○'}
                </div>
              ))}
            </div>
            <div className="text-white/40 text-xs mt-2 text-center">7/10 – 3 bis zum Gratis-Kaffee</div>
          </div>
        </div>
      </div>
    </div>
  )
}
