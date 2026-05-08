'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Check, Upload, CheckCircle, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import type { Restaurant, SubmissionType } from '@/types'

const INSTAGRAM_TYPES: SubmissionType[] = ['instagram_story', 'instagram_reel', 'instagram_post']

function buildGoogleMapsUrl(restaurant: Restaurant): string {
  if (restaurant.google_place_id) {
    return `https://search.google.com/local/writereview?placeid=${restaurant.google_place_id}`
  }
  const query = encodeURIComponent(`${restaurant.name} ${restaurant.city ?? ''}`.trim())
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}

function buildInstagramSearchUrl(type: SubmissionType): string {
  return 'https://www.instagram.com/'
}

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex gap-1.5 px-5 pt-12 pb-4">
      {Array.from({ length: total }).map((_, i) => (
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

function StorySubmitInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const restaurantSlug = searchParams.get('restaurant') ?? ''
  const supabase = createClient()

  const [step, setStep] = useState(restaurantSlug ? 1 : 0)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [search, setSearch] = useState('')
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  const [selectedType, setSelectedType] = useState<SubmissionType | null>(null)
  const [link, setLink] = useState('')
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Dynamic types with points from restaurant config (Instagram Story always first)
  const getTypes = (r: Restaurant | null): { value: SubmissionType; emoji: string; label: string; points: number; primary?: boolean }[] => [
    { value: 'instagram_story', emoji: '📸', label: 'Instagram Story', points: r?.points_per_story ?? 500, primary: true },
    { value: 'instagram_reel', emoji: '🎬', label: 'Instagram Reel', points: r?.points_per_reel ?? 750 },
    { value: 'instagram_post', emoji: '📱', label: 'Instagram Post', points: r?.points_per_post ?? 400 },
    { value: 'google_review', emoji: '⭐', label: 'Google Bewertung', points: r?.points_per_google_review ?? 300 },
    { value: 'receipt', emoji: '🧾', label: 'Kassenbon', points: r?.points_per_receipt ?? 100 },
  ]

  const totalSteps = restaurantSlug ? 3 : 4
  const progressStep = restaurantSlug ? step - 1 : step

  useEffect(() => {
    const load = async () => {
      if (restaurantSlug) {
        const { data } = await supabase
          .from('restaurants')
          .select('*')
          .eq('slug', restaurantSlug)
          .single()
        if (data) {
          setSelectedRestaurant(data as Restaurant)
        } else {
          const { data: all } = await supabase.from('restaurants').select('*').neq('is_active', false)
          setRestaurants(all ?? [])
          setStep(0)
        }
      } else {
        const { data } = await supabase.from('restaurants').select('*').neq('is_active', false)
        setRestaurants(data ?? [])
      }
    }
    load()
  }, [restaurantSlug, supabase])

  const filteredRestaurants = restaurants.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.city ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const step2Valid = () => {
    if (!selectedType) return false
    if (INSTAGRAM_TYPES.includes(selectedType) || selectedType === 'google_review') {
      return link.trim().length > 0
    }
    if (selectedType === 'receipt') return file !== null
    return true
  }

  const isNextDisabled = () => {
    if (step === 0 && !selectedRestaurant) return true
    if (step === 1 && !selectedType) return true
    if (step === 2 && !step2Valid()) return true
    if (submitting) return true
    return false
  }

  const handleSubmit = async () => {
    if (!selectedRestaurant || !selectedType) return
    if (!step2Valid()) {
      toast.error(selectedType === 'receipt' ? 'Bitte lade einen Beleg hoch' : 'Bitte füge einen Link ein')
      return
    }
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
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Fehler beim Einreichen')
    } finally {
      setSubmitting(false)
    }
  }

  const handleNext = () => {
    if (step < 2) setStep(step + 1)
    else handleSubmit()
  }

  const handleBack = () => {
    if (restaurantSlug && step === 1) { router.back(); return }
    setStep(step - 1)
  }

  const types = getTypes(selectedRestaurant)
  const selectedTypeInfo = types.find(t => t.value === selectedType)

  return (
    <div className="min-h-screen bg-[#EEF5E6] flex flex-col">
      <ProgressBar step={progressStep} total={totalSteps} />

      {selectedRestaurant && step > 0 && step < 3 && (
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-[#D4E8C2] w-fit">
            {selectedRestaurant.logo_url ? (
              <img src={selectedRestaurant.logo_url} alt="" style={{ width: 20, height: 20, objectFit: 'contain', borderRadius: 4 }} />
            ) : (
              <div style={{ width: 20, height: 20, borderRadius: 4, background: selectedRestaurant.primary_color ?? '#8BB06A' }} />
            )}
            <span className="text-[#1C1F1A] font-semibold text-xs">{selectedRestaurant.name}</span>
            <Check size={12} className="text-[#8BB06A]" />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 pb-32">
        <AnimatePresence initial={false} mode="wait">

          {/* Step 0: Restaurant picker */}
          {step === 0 && (
            <motion.div key="step0" initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -60, opacity: 0 }}>
              <h1 className="text-2xl font-bold text-[#1C1F1A] mb-1" style={{ fontFamily: 'DM Serif Display, serif' }}>Restaurant auswählen</h1>
              <p className="text-[#6D9450] text-sm mb-4">Wo warst du?</p>
              <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2.5 border border-[#D4E8C2] mb-4">
                <Search size={16} className="text-[#8BB06A]" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Restaurant suchen..." className="flex-1 bg-transparent text-sm text-[#1C1F1A] outline-none" />
              </div>
              <div className="space-y-2">
                {filteredRestaurants.map(r => (
                  <button key={r.id} onClick={() => setSelectedRestaurant(r)}
                    className={`w-full flex items-center gap-3 bg-white rounded-2xl p-3 border-2 transition-all ${selectedRestaurant?.id === r.id ? 'border-[#8BB06A]' : 'border-[#EEF5E6]'}`}>
                    <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden">
                      {r.cover_url ? (
                        <img src={r.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: r.primary_color ? `linear-gradient(135deg,${r.primary_color}88,${r.primary_color})` : 'linear-gradient(135deg,#8BB06A,#577A3D)' }} />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-[#1C1F1A] font-semibold text-sm">{r.name}</p>
                      <p className="text-[#6D9450] text-xs">{r.city}</p>
                    </div>
                    {selectedRestaurant?.id === r.id && <Check size={18} className="text-[#8BB06A]" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 1: Type — Instagram Story always primary/highlighted */}
          {step === 1 && (
            <motion.div key="step1" initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -60, opacity: 0 }}>
              <h1 className="text-2xl font-bold text-[#1C1F1A] mb-1" style={{ fontFamily: 'DM Serif Display, serif' }}>Was hast du gemacht?</h1>
              <p className="text-[#6D9450] text-sm mb-4">Wähle deine Aktion und sammle Punkte</p>

              <div className="space-y-2">
                {types.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setSelectedType(t.value)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all relative ${
                      selectedType === t.value
                        ? 'border-[#8BB06A] bg-[#EEF5E6]'
                        : t.primary
                        ? 'border-[#8BB06A]/40 bg-white'
                        : 'border-[#E8F0E0] bg-white'
                    }`}
                  >
                    <span className="text-2xl flex-shrink-0">{t.emoji}</span>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <p className="text-[#1C1F1A] font-semibold text-sm">{t.label}</p>
                        {t.primary && (
                          <span className="text-[10px] bg-[#8BB06A] text-white px-2 py-0.5 rounded-full font-bold">EMPFOHLEN</span>
                        )}
                      </div>
                      <p className="text-[#6D9450] text-xs mt-0.5">
                        {t.value === 'instagram_story' && 'Teile deinen Besuch als Story'}
                        {t.value === 'instagram_reel' && 'Erstelle ein kurzes Video-Reel'}
                        {t.value === 'instagram_post' && 'Poste ein Bild in deinem Feed'}
                        {t.value === 'google_review' && 'Hinterlasse eine Google-Bewertung'}
                        {t.value === 'receipt' && 'Lade deinen Kassenbon hoch'}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-[#8BB06A] font-bold text-sm">{t.points} P</p>
                    </div>
                    {selectedType === t.value && (
                      <div className="absolute right-3 top-3">
                        <Check size={16} className="text-[#8BB06A]" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2: Content */}
          {step === 2 && (
            <motion.div key="step2" initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -60, opacity: 0 }} className="space-y-4">
              <h1 className="text-2xl font-bold text-[#1C1F1A] mb-1" style={{ fontFamily: 'DM Serif Display, serif' }}>
                {selectedType === 'receipt' ? 'Beleg hochladen' : selectedType === 'google_review' ? 'Google Bewertung' : 'Link einreichen'}
              </h1>

              {/* Google Review: show direct link to restaurant's Google page */}
              {selectedType === 'google_review' && selectedRestaurant && (
                <div className="bg-white rounded-2xl p-4 border border-[#D4E8C2] space-y-3">
                  <div className="flex items-center gap-2">
                    <svg width="20" height="20" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
                    </svg>
                    <p className="text-[#1C1F1A] font-semibold text-sm">Schritt 1: Bewertung abgeben</p>
                  </div>
                  <p className="text-[#6D7A6D] text-xs leading-relaxed">
                    Klicke auf den Button, hinterlasse eine ehrliche Bewertung für <strong>{selectedRestaurant.name}</strong> auf Google Maps und kopiere dann den Link zu deiner Bewertung.
                  </p>
                  <a
                    href={buildGoogleMapsUrl(selectedRestaurant)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-[#4285F4] text-white font-semibold py-3 rounded-xl text-sm"
                  >
                    <ExternalLink size={16} />
                    {selectedRestaurant.name} auf Google bewerten
                  </a>
                  <div className="border-t border-[#EEF5E6] pt-3">
                    <p className="text-[#1C1F1A] font-semibold text-sm mb-2">Schritt 2: Link zur Bewertung einfügen *</p>
                    <input
                      value={link}
                      onChange={e => setLink(e.target.value)}
                      placeholder="https://maps.google.com/..."
                      className={`w-full bg-[#F5F9F0] border rounded-xl px-4 py-3 text-sm text-[#1C1F1A] outline-none transition-colors ${link.trim() ? 'border-[#8BB06A]' : 'border-[#D4E8C2] focus:border-[#8BB06A]'}`}
                    />
                    {!link.trim() && <p className="text-[#E86B5A] text-xs mt-1">Link wird zur Verifizierung benötigt</p>}
                  </div>
                </div>
              )}

              {/* Instagram types */}
              {selectedType && INSTAGRAM_TYPES.includes(selectedType) && (
                <div className="space-y-3">
                  <div className="bg-white rounded-2xl p-4 border border-[#D4E8C2]">
                    <div className="flex items-center gap-2 mb-2">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="url(#ig)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <defs>
                          <linearGradient id="ig" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#f9a825"/>
                            <stop offset="50%" stopColor="#e91e8c"/>
                            <stop offset="100%" stopColor="#9c27b0"/>
                          </linearGradient>
                        </defs>
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                      </svg>
                      <p className="text-[#1C1F1A] font-semibold text-sm">Schritt 1: {selectedType === 'instagram_story' ? 'Story posten' : selectedType === 'instagram_reel' ? 'Reel posten' : 'Post erstellen'}</p>
                    </div>
                    <p className="text-[#6D7A6D] text-xs leading-relaxed mb-3">
                      Öffne Instagram, erstelle deine{' '}
                      {selectedType === 'instagram_story' ? 'Story' : selectedType === 'instagram_reel' ? 'Reel' : 'Post'}{' '}
                      mit Bezug auf <strong>{selectedRestaurant?.name}</strong> und kopiere dann den Link.
                    </p>
                    <a
                      href="https://www.instagram.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm"
                      style={{ background: 'linear-gradient(135deg, #f9a825, #e91e8c, #9c27b0)' }}
                    >
                      <ExternalLink size={16} />
                      Instagram öffnen
                    </a>
                  </div>

                  <div>
                    <label className="text-[#1C1F1A] font-semibold text-sm block mb-2">Schritt 2: Instagram Permalink einfügen *</label>
                    <input
                      value={link}
                      onChange={e => setLink(e.target.value)}
                      placeholder={
                        selectedType === 'instagram_story'
                          ? 'https://www.instagram.com/stories/...'
                          : selectedType === 'instagram_reel'
                          ? 'https://www.instagram.com/reel/...'
                          : 'https://www.instagram.com/p/...'
                      }
                      className={`w-full bg-white border rounded-2xl px-4 py-3 text-sm text-[#1C1F1A] outline-none transition-colors ${link.trim() ? 'border-[#8BB06A]' : 'border-[#D4E8C2] focus:border-[#8BB06A]'}`}
                    />
                    {!link.trim() && <p className="text-[#E86B5A] text-xs mt-1">Link wird zur Verifizierung benötigt</p>}
                  </div>
                </div>
              )}

              {/* Receipt upload */}
              {selectedType === 'receipt' && (
                <div className="space-y-3">
                  <div className="bg-white rounded-2xl p-4 border border-[#D4E8C2]">
                    <p className="text-[#6D7A6D] text-xs leading-relaxed mb-3">
                      Lade ein Foto oder einen Scan deines Kassenbons von <strong>{selectedRestaurant?.name}</strong> hoch. Der Beleg wird zur Prüfung benötigt.
                    </p>
                    <input type="file" ref={fileRef} accept="image/*,application/pdf" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
                    <button
                      onClick={() => fileRef.current?.click()}
                      className={`w-full border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 transition-all ${file ? 'border-[#8BB06A] bg-[#EEF5E6]' : 'border-[#D4E8C2] bg-white'}`}
                    >
                      {file ? (
                        <>
                          <CheckCircle size={32} className="text-[#8BB06A]" />
                          <p className="text-[#6D9450] font-semibold text-sm">{file.name}</p>
                          <p className="text-[#8BB06A] text-xs">Tippen zum Ändern</p>
                        </>
                      ) : (
                        <>
                          <Upload size={32} className="text-[#8BB06A]" />
                          <p className="text-[#6D9450] font-semibold text-sm">Kassenbon hochladen</p>
                          <p className="text-[#8BB06A] text-xs">Foto oder PDF · max. 10 MB</p>
                        </>
                      )}
                    </button>
                    {!file && <p className="text-[#E86B5A] text-xs mt-2">Beleg wird zur Prüfung benötigt</p>}
                  </div>

                  {/* Verification notice */}
                  <div className="flex items-start gap-2 bg-[#EEF5E6] rounded-xl p-3 border border-[#D4E8C2]">
                    <span className="text-base flex-shrink-0">✅</span>
                    <p className="text-[#577A3D] text-xs leading-relaxed">
                      Dein Beleg wird zur Verifizierung benötigt. Bitte lade nur echte Belege hoch – nur verifizierte Einreichungen erhalten Punkte.
                    </p>
                  </div>
                </div>
              )}

              {/* Verification notice for links */}
              {selectedType && selectedType !== 'receipt' && (
                <div className="flex items-start gap-2 bg-[#EEF5E6] rounded-xl p-3 border border-[#D4E8C2]">
                  <span className="text-base flex-shrink-0">✅</span>
                  <p className="text-[#577A3D] text-xs leading-relaxed">
                    Der eingereichte Link wird zur Verifizierung benötigt. Nur echte{' '}
                    {selectedType === 'google_review' ? 'Google-Bewertungen' : 'Instagram-Beiträge'} werden akzeptiert.
                  </p>
                </div>
              )}

              {/* Optional caption */}
              <div>
                <label className="text-[#1C1F1A] font-semibold text-sm block mb-2">Beschreibung <span className="text-[#8BB06A]/70 font-normal">(optional)</span></label>
                <textarea
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  placeholder="Was war besonders toll? ✨"
                  rows={2}
                  className="w-full bg-white border border-[#D4E8C2] rounded-2xl px-4 py-3 text-sm text-[#1C1F1A] outline-none focus:border-[#8BB06A] resize-none"
                />
              </div>
            </motion.div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <motion.div key="step3" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center text-center pt-12">
              <div className="w-24 h-24 rounded-full bg-[#EEF5E6] flex items-center justify-center mb-6" style={{ boxShadow: '0 0 0 12px #d4e8c2' }}>
                <CheckCircle size={56} className="text-[#8BB06A]" />
              </div>
              <h2 className="text-2xl font-bold text-[#1C1F1A] mb-3" style={{ fontFamily: 'DM Serif Display, serif' }}>
                Eingereicht! ✨
              </h2>
              <p className="text-[#6D9450] text-sm leading-relaxed mb-3 max-w-xs">
                Deine Einreichung wird geprüft und anschließend vom Restaurant bestätigt.
              </p>
              <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 border border-[#D4E8C2] mb-8">
                <span className="text-base">✅</span>
                <span className="text-[#577A3D] text-xs font-medium">Wird zur Prüfung weitergeleitet…</span>
                <span className="w-4 h-4 border-2 border-[#8BB06A] border-t-transparent rounded-full animate-spin" />
              </div>
              {selectedTypeInfo && (
                <div className="bg-[#EEF5E6] rounded-2xl px-6 py-4 mb-8 border border-[#D4E8C2]">
                  <p className="text-[#577A3D] text-xs mb-1">Erwartete Punkte bei Genehmigung</p>
                  <p className="text-3xl font-bold text-[#1C1F1A]">+{selectedTypeInfo.points} <span className="text-[#8BB06A]">P</span></p>
                </div>
              )}
              <button
                onClick={() => restaurantSlug ? router.push(`/r/${restaurantSlug}`) : router.push('/home')}
                className="gradient-primary text-white font-bold px-8 py-3.5 rounded-2xl text-base"
              >
                {restaurantSlug ? 'Zurück zum Restaurant' : 'Zur Übersicht'}
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Fixed bottom bar */}
      {step < 3 && (
        <div
          className="fixed bottom-0 left-0 right-0 bg-[#EEF5E6] px-5 pt-3 flex gap-3 border-t border-[#D4E8C2]"
          style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))' }}
        >
          {step > 0 && (
            <button onClick={handleBack} className="flex-1 py-3.5 rounded-2xl border border-[#8BB06A] text-[#6D9450] font-semibold">
              Zurück
            </button>
          )}
          <button
            disabled={isNextDisabled()}
            onClick={handleNext}
            className="flex-1 py-3.5 rounded-2xl gradient-primary text-white font-bold shadow-lg disabled:opacity-50"
          >
            {step === 2
              ? submitting ? 'Wird eingereicht...' : 'Einreichen ✨'
              : 'Weiter'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function StorySubmitPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#EEF5E6] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#8BB06A] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <StorySubmitInner />
    </Suspense>
  )
}
