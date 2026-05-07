'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Check, Upload, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import type { Restaurant, SubmissionType } from '@/types'

const TYPES: { value: SubmissionType; emoji: string; label: string; points: number }[] = [
  { value: 'instagram_story', emoji: '📸', label: 'Instagram Story', points: 500 },
  { value: 'instagram_reel', emoji: '🎬', label: 'Instagram Reel', points: 750 },
  { value: 'instagram_post', emoji: '📱', label: 'Instagram Post', points: 400 },
  { value: 'google_review', emoji: '⭐', label: 'Google Bewertung', points: 300 },
  { value: 'receipt', emoji: '🧾', label: 'Kassenbon', points: 100 },
]

const INSTAGRAM_TYPES: SubmissionType[] = ['instagram_story', 'instagram_reel', 'instagram_post']

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex gap-1.5 px-5 pt-12 pb-4">
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
            i <= step ? 'bg-[#8BB06A]' : 'bg-[#D4E8C2]'
          }`}
        />
      ))}
    </div>
  )
}

export default function StorySubmitPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(0)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [search, setSearch] = useState('')
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  const [selectedType, setSelectedType] = useState<SubmissionType | null>(null)
  const [link, setLink] = useState('')
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('restaurants').select('*').eq('is_active', true)
      setRestaurants(data ?? [])
    }
    load()
  }, [])

  const filteredRestaurants = restaurants.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.city ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const handleSubmit = async () => {
    if (!selectedRestaurant || !selectedType) return
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('restaurant_id', selectedRestaurant.id)
      formData.append('type', selectedType)
      if (link) formData.append('instagram_permalink', link)
      if (caption) formData.append('caption', caption)
      if (file) formData.append('file', file)

      const res = await fetch('/api/stories/submit', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Fehler beim Einreichen')
      }
      setStep(3)
    } catch (e: any) {
      toast.error(e.message ?? 'Fehler beim Einreichen')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#EEF5E6] flex flex-col">
      <ProgressBar step={step} />

      <div className="flex-1 overflow-y-auto px-5 pb-24">
        <AnimatePresence initial={false} mode="wait">
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ x: 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -60, opacity: 0 }}
            >
              <h1 className="text-2xl font-bold text-[#1C1F1A] mb-1" style={{ fontFamily: 'DM Serif Display, serif' }}>
                Restaurant auswählen
              </h1>
              <p className="text-[#6D9450] text-sm mb-4">Wo warst du?</p>

              <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2.5 border border-[#D4E8C2] mb-4">
                <Search size={16} className="text-[#8BB06A]" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Restaurant suchen..."
                  className="flex-1 bg-transparent text-sm text-[#1C1F1A] outline-none"
                />
              </div>

              <div className="space-y-2">
                {filteredRestaurants.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRestaurant(r)}
                    className={`w-full flex items-center gap-3 bg-white rounded-2xl p-3 border-2 transition-all ${
                      selectedRestaurant?.id === r.id ? 'border-[#8BB06A]' : 'border-[#EEF5E6]'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex-shrink-0"
                      style={{ background: r.primary_color ? `linear-gradient(135deg, ${r.primary_color}88, ${r.primary_color})` : 'linear-gradient(135deg, #8BB06A, #577A3D)' }}
                    />
                    <div className="flex-1 text-left">
                      <p className="text-[#1C1F1A] font-semibold text-sm">{r.name}</p>
                      <p className="text-[#6D9450] text-xs">{r.city}</p>
                    </div>
                    {selectedRestaurant?.id === r.id && (
                      <Check size={18} className="text-[#8BB06A]" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ x: 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -60, opacity: 0 }}
            >
              <h1 className="text-2xl font-bold text-[#1C1F1A] mb-1" style={{ fontFamily: 'DM Serif Display, serif' }}>
                Typ wählen
              </h1>
              <p className="text-[#6D9450] text-sm mb-4">Was hast du gemacht?</p>

              <div className="grid grid-cols-2 gap-3">
                {TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setSelectedType(t.value)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                      selectedType === t.value
                        ? 'border-[#8BB06A] bg-[#EEF5E6]'
                        : 'border-[#E8F0E0] bg-white'
                    }`}
                  >
                    <span className="text-3xl">{t.emoji}</span>
                    <p className="text-[#1C1F1A] font-semibold text-sm text-center">{t.label}</p>
                    <span className="text-[#8BB06A] font-bold text-sm">{t.points} Punkte</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ x: 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -60, opacity: 0 }}
              className="space-y-4"
            >
              <h1 className="text-2xl font-bold text-[#1C1F1A] mb-1" style={{ fontFamily: 'DM Serif Display, serif' }}>
                Content einreichen
              </h1>
              <p className="text-[#6D9450] text-sm mb-4">
                {selectedType && INSTAGRAM_TYPES.includes(selectedType)
                  ? 'Teile den Link zu deinem Post'
                  : 'Lade deinen Beleg hoch'}
              </p>

              {selectedType && INSTAGRAM_TYPES.includes(selectedType) ? (
                <div>
                  <label className="text-[#1C1F1A] font-semibold text-sm block mb-2">Instagram Link / Permalink</label>
                  <input
                    value={link}
                    onChange={e => setLink(e.target.value)}
                    placeholder="https://www.instagram.com/p/..."
                    className="w-full bg-white border border-[#D4E8C2] rounded-2xl px-4 py-3 text-sm text-[#1C1F1A] outline-none focus:border-[#8BB06A]"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-[#1C1F1A] font-semibold text-sm block mb-2">Kassenbon</label>
                  <input type="file" ref={fileRef} accept="image/*,application/pdf" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
                  <button
                    onClick={() => fileRef.current?.click()}
                    className={`w-full border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-2 transition-all ${
                      file ? 'border-[#8BB06A] bg-[#EEF5E6]' : 'border-[#D4E8C2] bg-white'
                    }`}
                  >
                    <Upload size={24} className="text-[#8BB06A]" />
                    <p className="text-[#6D9450] font-medium text-sm">
                      {file ? file.name : 'Foto oder PDF auswählen'}
                    </p>
                    <p className="text-[#8BB06A] text-xs">Tippen zum Hochladen</p>
                  </button>
                </div>
              )}

              <div>
                <label className="text-[#1C1F1A] font-semibold text-sm block mb-2">Beschreibung (optional)</label>
                <textarea
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  placeholder="Was war besonders toll? ✨"
                  rows={3}
                  className="w-full bg-white border border-[#D4E8C2] rounded-2xl px-4 py-3 text-sm text-[#1C1F1A] outline-none focus:border-[#8BB06A] resize-none"
                />
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center text-center pt-16"
            >
              <motion.div
                initial={{ scale: 1 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.1 }}
              >
                <CheckCircle size={80} className="text-[#8BB06A] mb-6" />
              </motion.div>
              <h2 className="text-2xl font-bold text-[#1C1F1A] mb-2" style={{ fontFamily: 'DM Serif Display, serif' }}>
                Story wurde eingereicht ✨
              </h2>
              <p className="text-[#6D9450] text-sm leading-relaxed mb-8">
                Du erhältst eine Benachrichtigung wenn deine Story geprüft wurde.
              </p>
              <button
                onClick={() => router.push('/home')}
                className="gradient-primary text-white font-bold px-8 py-3.5 rounded-2xl text-base"
              >
                Zurück zur Übersicht
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {step < 3 && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#EEF5E6] px-5 pb-10 pt-3 flex gap-3 border-t border-[#D4E8C2]">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 py-3.5 rounded-2xl border border-[#8BB06A] text-[#6D9450] font-semibold"
            >
              Zurück
            </button>
          )}
          <button
            disabled={
              (step === 0 && !selectedRestaurant) ||
              (step === 1 && !selectedType) ||
              submitting
            }
            onClick={() => {
              if (step < 2) setStep(step + 1)
              else handleSubmit()
            }}
            className="flex-1 py-3.5 rounded-2xl gradient-primary text-white font-bold shadow-lg disabled:opacity-50"
          >
            {step === 2 ? (submitting ? 'Wird eingereicht...' : 'Einreichen ✨') : 'Weiter'}
          </button>
        </div>
      )}
    </div>
  )
}
