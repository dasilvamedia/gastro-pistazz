'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Restaurant, RestaurantType, RESTAURANT_TYPE_LABELS } from '@/types'
import ImageUploader from '@/components/admin/ImageUploader'

const DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const schema = z.object({
  name: z.string().min(1, 'Pflichtfeld'),
  type: z.string(),
  description: z.string().optional(),
  address: z.string().optional(),
  zip: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().optional(),
  instagram_handle: z.string().optional(),
  google_place_id: z.string().optional(),
  points_per_story: z.number().min(0),
  points_per_reel: z.number().min(0),
  points_per_post: z.number().min(0),
  points_per_google_review: z.number().min(0),
  points_per_receipt: z.number().min(0),
  opening_hours_note: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export default function ProfilPage() {
  const supabase = createClient()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [openingHours, setOpeningHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>({})
  const [googleRating, setGoogleRating] = useState('')
  const [googleReviewCount, setGoogleReviewCount] = useState('')

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { points_per_story: 500, points_per_reel: 750, points_per_post: 400, points_per_google_review: 300, points_per_receipt: 100 },
  })

  useEffect(() => {
    fetch('/api/dashboard/restaurant').then(r => r.json()).then(async ({ restaurant: basicRest }) => {
      if (!basicRest) { setLoading(false); return }
      // Fetch full restaurant data via admin client
      const { data: rest } = await supabase.from('restaurants').select('*').eq('id', basicRest.id).single()
      if (rest) {
        setRestaurant(rest)
        reset({
          name: rest.name,
          type: rest.type,
          description: rest.description ?? '',
          address: rest.address ?? '',
          zip: rest.zip ?? '',
          city: rest.city ?? '',
          phone: rest.phone ?? '',
          email: rest.email ?? '',
          website: rest.website ?? '',
          instagram_handle: rest.instagram_handle ?? '',
          google_place_id: rest.google_place_id ?? '',
          points_per_story: rest.points_per_story,
          points_per_reel: rest.points_per_reel,
          points_per_post: rest.points_per_post,
          points_per_google_review: rest.points_per_google_review,
          points_per_receipt: rest.points_per_receipt,
          opening_hours_note: rest.opening_hours_note ?? '',
        })
        setLogoPreview(rest.logo_url)
        setCoverPreview(rest.cover_url)
        if (rest.google_rating != null) setGoogleRating(String(rest.google_rating))
        if (rest.google_review_count != null) setGoogleReviewCount(String(rest.google_review_count))

        const hours: Record<string, { open: string; close: string; closed: boolean }> = {}
        DAY_KEYS.forEach(key => {
          const h = rest.opening_hours?.[key]
          hours[key] = { open: h?.open ?? '09:00', close: h?.close ?? '22:00', closed: h?.closed ?? false }
        })
        setOpeningHours(hours)
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [supabase, reset])

  const handleLogoSaved = async (url: string) => {
    if (!restaurant) return
    setLogoPreview(url)
    await supabase.from('restaurants').update({ logo_url: url }).eq('id', restaurant.id)
    toast.success('Logo gespeichert')
  }

  const handleCoverSaved = async (url: string) => {
    if (!restaurant) return
    setCoverPreview(url)
    await supabase.from('restaurants').update({ cover_url: url }).eq('id', restaurant.id)
    toast.success('Titelbild gespeichert')
  }

  const handleLogoRemove = async () => {
    if (!restaurant) return
    setLogoPreview(null)
    await supabase.from('restaurants').update({ logo_url: null }).eq('id', restaurant.id)
  }

  const handleCoverRemove = async () => {
    if (!restaurant) return
    setCoverPreview(null)
    await supabase.from('restaurants').update({ cover_url: null }).eq('id', restaurant.id)
  }

  const onSubmit = async (values: FormValues) => {
    if (!restaurant) return
    setSaving(true)
    const parsedRating = parseFloat(googleRating)
    const parsedCount = parseInt(googleReviewCount, 10)
    const payload = {
      ...values,
      opening_hours: openingHours,
      opening_hours_note: values.opening_hours_note || null,
      google_rating: isNaN(parsedRating) ? null : Math.min(5, Math.max(1, parsedRating)),
      google_review_count: isNaN(parsedCount) ? null : parsedCount,
    }
    const { error, data } = await supabase
      .from('restaurants')
      .update(payload)
      .eq('id', restaurant.id)
      .select()
      .single()
    if (error) {
      toast.error('Fehler beim Speichern')
    } else {
      // Update local state immediately so UI reflects new values
      if (data) setRestaurant(data)
      toast.success('Profil gespeichert, Änderungen sind sofort live')
    }
    setSaving(false)
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#8BB06A]'
  const labelCls = 'block text-sm font-medium text-[#1C1F1A] mb-1'
  const sectionCls = 'glass rounded-xl p-5 space-y-4'

  if (loading) return <div className="p-6 space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-32 rounded-xl" />)}</div>

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[#1C1F1A]">Restaurant-Profil</h1>

      <div className={sectionCls}>
        <h2 className="font-semibold text-[#1C1F1A]">Grunddaten</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Name *</label>
            <input {...register('name')} className={inputCls} />
            {errors.name && <p className="text-xs text-[#E86B5A] mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className={labelCls}>Typ</label>
            <select {...register('type')} className={inputCls}>
              {(Object.keys(RESTAURANT_TYPE_LABELS) as RestaurantType[]).map(t => (
                <option key={t} value={t}>{RESTAURANT_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Beschreibung</label>
          <textarea {...register('description')} rows={3} className={inputCls} />
        </div>
        {restaurant && (
          <div>
            <label className={labelCls}>Slug</label>
            <input value={restaurant.slug} readOnly className={`${inputCls} bg-gray-50 text-gray-400`} />
          </div>
        )}
      </div>

      <div className={sectionCls}>
        <h2 className="font-semibold text-[#1C1F1A]">Medien</h2>

        {/* Cover – wide banner, object-cover intentional */}
        <ImageUploader
          storagePath={restaurant ? `${restaurant.id}/cover` : 'temp/cover'}
          label="Titelbild"
          hint="Empfohlen: 1200 × 400 px · JPG oder PNG · max. 20 MB"
          value={coverPreview}
          onChange={url => { if (!url) handleCoverRemove(); else setCoverPreview(url) }}
          onSaved={handleCoverSaved}
          fit="cover"
          aspectClass="aspect-[3/1]"
        />

        {/* Logo – full image visible, no crop */}
        <ImageUploader
          storagePath={restaurant ? `${restaurant.id}/logo` : 'temp/logo'}
          label="Logo"
          hint="Empfohlen: 400 × 400 px · PNG mit Transparenz · max. 20 MB"
          value={logoPreview}
          onChange={url => { if (!url) handleLogoRemove(); else setLogoPreview(url) }}
          onSaved={handleLogoSaved}
          fit="contain"
          aspectClass="aspect-square max-w-[180px]"
        />
      </div>

      <div className={sectionCls}>
        <h2 className="font-semibold text-[#1C1F1A]">Kontakt</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><label className={labelCls}>Adresse</label><input {...register('address')} className={inputCls} /></div>
          <div><label className={labelCls}>PLZ</label><input {...register('zip')} className={inputCls} /></div>
          <div><label className={labelCls}>Stadt</label><input {...register('city')} className={inputCls} /></div>
          <div><label className={labelCls}>Telefon</label><input {...register('phone')} className={inputCls} /></div>
          <div><label className={labelCls}>E-Mail</label><input {...register('email')} className={inputCls} /></div>
          <div><label className={labelCls}>Website</label><input {...register('website')} className={inputCls} /></div>
          <div><label className={labelCls}>Instagram-Handle</label><input {...register('instagram_handle')} className={inputCls} /></div>
          <div className="sm:col-span-2"><label className={labelCls}>Google Place ID</label><input {...register('google_place_id')} className={inputCls} /></div>
        </div>
      </div>

      <div className={sectionCls}>
        <h2 className="font-semibold text-[#1C1F1A]">Google Bewertung</h2>
        <p className="text-xs text-gray-400">Trage hier deine aktuelle Google-Bewertung ein. Diese wird für Gäste auf den Karten angezeigt.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Google Sterne (1.0 – 5.0)</label>
            <input
              type="number"
              step="0.1"
              min="1"
              max="5"
              placeholder="z. B. 4.7"
              value={googleRating}
              onChange={e => setGoogleRating(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Anzahl Bewertungen</label>
            <input
              type="number"
              min="0"
              placeholder="z. B. 234"
              value={googleReviewCount}
              onChange={e => setGoogleReviewCount(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Findest du auf Google Maps unter deinem Restaurant-Eintrag. Bitte aktuell halten.
        </p>
      </div>

      <div className={sectionCls}>
        <h2 className="font-semibold text-[#1C1F1A]">Öffnungszeiten</h2>
        <div className="space-y-2">
          {DAY_KEYS.map((key, idx) => (
            <div key={key} className="flex items-center gap-3">
              <span className="w-24 text-sm text-gray-600">{DAYS[idx]}</span>
              <label className="flex items-center gap-1 text-xs text-gray-500">
                <input type="checkbox" checked={openingHours[key]?.closed ?? false}
                  onChange={e => setOpeningHours(h => ({ ...h, [key]: { ...h[key], closed: e.target.checked } }))} />
                Geschlossen
              </label>
              {!openingHours[key]?.closed && (
                <>
                  <input type="time" value={openingHours[key]?.open ?? '09:00'}
                    onChange={e => setOpeningHours(h => ({ ...h, [key]: { ...h[key], open: e.target.value } }))}
                    className="px-2 py-1 rounded border border-gray-200 text-sm" />
                  <span className="text-gray-400">-</span>
                  <input type="time" value={openingHours[key]?.close ?? '22:00'}
                    onChange={e => setOpeningHours(h => ({ ...h, [key]: { ...h[key], close: e.target.value } }))}
                    className="px-2 py-1 rounded border border-gray-200 text-sm" />
                </>
              )}
            </div>
          ))}
        </div>

        {/* Optional notice shown below opening hours on customer page */}
        <div>
          <label className={labelCls}>
            Hinweistext <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            {...register('opening_hours_note')}
            rows={2}
            placeholder="z. B. An Feiertagen geschlossen · Bei schlechtem Wetter früher Feierabend"
            className={inputCls}
          />
          <p className="text-xs text-gray-400 mt-1">
            Wird unterhalb der Öffnungszeiten auf der Gästekarte angezeigt und bei Änderungen sofort aktualisiert.
          </p>
        </div>
      </div>

      <div className={sectionCls}>
        <h2 className="font-semibold text-[#1C1F1A]">Punkte-Konfiguration</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: 'Instagram Story', field: 'points_per_story' as const },
            { label: 'Instagram Reel', field: 'points_per_reel' as const },
            { label: 'Instagram Post', field: 'points_per_post' as const },
            { label: 'Google Bewertung', field: 'points_per_google_review' as const },
            { label: 'Kassenbon', field: 'points_per_receipt' as const },
          ].map(({ label, field }) => (
            <div key={field}>
              <label className={labelCls}>{label} (P)</label>
              <input type="number" {...register(field, { valueAsNumber: true })} className={inputCls} />
            </div>
          ))}
        </div>
      </div>

      <button type="submit" disabled={saving} className="w-full gradient-primary py-3 rounded-lg text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
        {saving ? 'Speichern...' : 'Profil speichern'}
      </button>
    </form>
  )
}
