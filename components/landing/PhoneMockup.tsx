'use client'

import { motion } from 'framer-motion'
import { useLang } from '@/lib/lang-context'

const floatingEmojis = [
  { emoji: '🍹', style: { left: '-22%', top: '8%'  }, delay: 0   },
  { emoji: '🍔', style: { left: '108%', top: '18%' }, delay: 0.4 },
  { emoji: '🎰', style: { left: '-26%', top: '52%' }, delay: 0.7 },
  { emoji: '💰', style: { left: '112%', top: '58%' }, delay: 0.2 },
  { emoji: '🥂', style: { left: '22%',  top: '-9%' }, delay: 0.5 },
  { emoji: '🍿', style: { left: '68%',  top: '-6%' }, delay: 0.9 },
]

export function PhoneMockup() {
  const { t } = useLang()
  const p = t.phone

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
        style={{ boxShadow: '0 0 60px rgba(139,176,106,0.3), 0 20px 60px rgba(0,0,0,0.4)' }}
      >
        {/* Notch */}
        <div className="flex justify-center pt-4 pb-1">
          <div className="w-16 h-1 bg-white/20 rounded-full" />
        </div>

        <div className="px-5 pb-5 pt-2 space-y-3">
          {/* Logo */}
          <div className="flex items-baseline gap-0 justify-center py-1">
            <span className="text-base font-bold text-[#8BB06A]" style={{ fontFamily: 'DM Serif Display, serif' }}>
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
              <div className="w-9 h-9 rounded-xl bg-[#8BB06A]/20 flex items-center justify-center text-lg shrink-0">
                🍸
              </div>
              <div className="min-w-0">
                <div className="text-white text-xs font-semibold">Beach Bar Aalen</div>
                <div className="text-[#8BB06A] text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8BB06A] inline-block" />
                  {p.verified} ✓
                </div>
              </div>
            </div>
            <div className="h-px bg-white/8" />
            <div className="flex justify-between items-center">
              <span className="text-white/50 text-xs">{p.pointsEarned}</span>
              <motion.span
                className="text-[#E5B84C] font-bold text-sm"
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}
              >
                +750 🪙
              </motion.span>
            </div>
          </motion.div>

          {/* Available reward */}
          <motion.div
            className="bg-gradient-to-r from-[#8BB06A]/20 to-[#6D9450]/10 border border-[#8BB06A]/25 rounded-xl p-3 flex items-center gap-2"
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
              <div className="text-[#8BB06A] text-xs font-semibold">8/10</div>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <motion.div
                  key={i}
                  className={`w-full aspect-square rounded-lg flex items-center justify-center text-xs ${
                    i < 8 ? 'bg-[#8BB06A] text-white' : 'bg-white/8 text-white/20'
                  }`}
                  initial={i === 7 ? { scale: 0 } : {}}
                  animate={i === 7 ? { scale: 1 } : {}}
                  transition={{ duration: 0.3, delay: 1.2, type: 'spring' }}
                >
                  {i < 8 ? '✓' : '○'}
                </motion.div>
              ))}
            </div>
            <div className="text-white/30 text-xs mt-1.5 text-center">{p.stampHint} 🍹</div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
