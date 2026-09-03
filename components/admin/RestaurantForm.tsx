'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { Restaurant, RestaurantType, RESTAURANT_TYPE_LABELS } from '@/types'
import ImageUploader from '@/components/admin/ImageUploader'
import { TagPicker } from '@/components/admin/TagPicker'

// Das Restaurant-Formular (Grunddaten, Medien, Kontakt, Google, Kueche,
// Oeffnungszeiten, Punkte). Genutzt vom Owner-Profil (/dashboard/profil) und
// vom Super-Admin-Editor (/admin/restaurants/[id]); wer speichert, entscheidet
// der Aufrufer ueber onSave / onPatch.

const DAYS     = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const schema = z.object({
  name:                    z.string().min(1, 'Pflichtfeld'),
  type:                    z.string(),
  description:             z.string().optional(),
  address:                 z.string().optional(),
  zip:                     z.string().optional(),
  city:                    z.string().optional(),
  phone:                   z.string().optional(),
  email:                   z.string().email().optional().or(z.literal('')),
  website:                 z.string().optional(),
  instagram_handle:        z.string().optional(),
  google_place_id:         z.string().optional(),
  points_per_story:        z.number().min(0),
  points_per_reel:         z.number().min(0),
  points_per_post:         z.number().min(0),
  points_per_google_review:z.number().min(0),
  points_per_receipt:      z.number().min(0),
  opening_hours_note:      z.string().optional(),
})

export type RestaurantFormValues = z.infer<typeof schema>
export type OpeningHours = Record<string, { open: string; close: string; closed: boolean }>

export interface RestaurantFormProps {
  restaurant: Restaurant
  /** Speichert das komplette Formular, liefert das aktualisierte Restaurant */
  onSave: (payload: Record<string, unknown>) => Promise<Restaurant | null>
  /** Speichert einzelne Felder sofort (Bilder) */
  onPatch: (payload: Record<string, unknown>) => Promise<unknown>
  /** Zusatz-Panels (Admin) zwischen Punkten und Speichern-Button */
  extraSections?: React.ReactNode
  title?: string
  /** Hinweis oberhalb des Formulars (z.B. Instagram fehlt) ausblenden */
  hideWarnings?: boolean
}

export const inputCls   = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#8BB06A]'
export const labelCls   = 'block text-sm font-medium text-[#1C1F1A] mb-1'
export const sectionCls = 'glass rounded-xl p-5 space-y-4'

export function RestaurantForm({ restaurant, onSave, onPatch, extraSections, title = 'Restaurant-Profil', hideWarnings }: RestaurantFormProps) {
  const [saving, setSaving] = useState(false)
  const [logoPreview, setLogoPreview]   = useState<string | null>(restaurant.logo_url)
  const [coverPreview, setCoverPreview] = useState<string | null>(restaurant.cover_url)
  const [googleRating, setGoogleRating] = useState('')
  const [googleReviewCount, setGoogleReviewCount] = useState('')
  const [openingHours, setOpeningHours] = useState<OpeningHours>({})
  const [tags, setTags] = useState<{ cuisine: string[]; dietary: string[] }>({ cuisine: [], dietary: [] })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<RestaurantFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      points_per_story: 500, points_per_reel: 750, points_per_post: 400,
      points_per_google_review: 300, points_per_receipt: 100,
    },
  })

  useEffect(() => {
    const rest = restaurant as Restaurant & Record<string, unknown>
    reset({
      name:                     rest.name,
      type:                     rest.type,
      description:              rest.description              ?? '',
      address:                  rest.address                  ?? '',
      zip:                      rest.zip                      ?? '',
      city:                     rest.city                     ?? '',
      phone:                    rest.phone                    ?? '',
      email:                    rest.email                    ?? '',
      website:                  rest.website                  ?? '',
      instagram_handle:         rest.instagram_handle         ?? '',
      google_place_id:          rest.google_place_id          ?? '',
      points_per_story:         rest.points_per_story         ?? 500,
      points_per_reel:          rest.points_per_reel          ?? 750,
      points_per_post:          rest.points_per_post          ?? 400,
      points_per_google_review: rest.points_per_google_review ?? 300,
      points_per_receipt:       rest.points_per_receipt       ?? 100,
      opening_hours_note:       (rest.opening_hours_note as string | undefined) ?? '',
    })
    setGoogleRating(rest.google_rating != null ? String(rest.google_rating) : '')
    setGoogleReviewCount(rest.google_review_count != null ? String(rest.google_review_count) : '')
    setLogoPreview(rest.logo_url)
    setCoverPreview(rest.cover_url)
    setTags({ cuisine: rest.cuisine ?? [], dietary: rest.dietary ?? [] })

    const hours: OpeningHours = {}
    DAY_KEYS.forEach(key => {
      const h = rest.opening_hours?.[key]
      hours[key] = { open: h?.open ?? '09:00', close: h?.close ?? '22:00', closed: h?.closed ?? false }
    })
    setOpeningHours(hours)
  }, [restaurant, reset])

  const handleLogoSaved = async (url: string) => {
    setLogoPreview(url)
    try { await onPatch({ logo_url: url }); toast.success('Logo gespeichert') }
    catch { toast.error('Fehler beim Speichern des Logos') }
  }
  const handleCoverSaved = async (url: string) => {
    setCoverPreview(url)
    try { await onPatch({ cover_url: url }); toast.success('Titelbild gespeichert') }
    catch { toast.error('Fehler beim Speichern des Titelbilds') }
  }
  const handleLogoRemove  = async () => { setLogoPreview(null);  try { await onPatch({ logo_url: null })  } catch { /* still */ } }
  const handleCoverRemove = async () => { setCoverPreview(null); try { await onPatch({ cover_url: null }) } catch { /* still */ } }

  const onSubmit = async (values: RestaurantFormValues) => {
    setSaving(true)
    try {
      const parsedRating = parseFloat(googleRating.replace(',', '.'))
      const parsedCount  = parseInt(googleReviewCount, 10)
      const saved = await onSave({
        ...values,
        opening_hours: openingHours,
        cuisine: tags.cuisine,
        dietary: tags.dietary,
        google_rating:       isNaN(parsedRating) || parsedRating <= 0 ? null : Math.min(5, parsedRating),
        google_review_count: isNaN(parsedCount)  ? null : parsedCount,
      })
      if (saved !== null) toast.success('Gespeichert, Änderungen sind sofort live')
    } catch (err) {
      console.error('Save exception:', err)
      toast.error(err instanceof Error && err.message ? err.message : 'Fehler beim Speichern')
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[#1C1F1A]">{title}</h1>

      {!hideWarnings && !restaurant.instagram_handle && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <span className="text-amber-500 text-lg mt-0.5">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">Instagram-Handle fehlt</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Gäste-Stories können deinen Account nicht taggen. Bitte unten im Abschnitt <strong>Kontakt</strong> eintragen.
            </p>
          </div>
        </div>
      )}

      {/* ── Grunddaten ── */}
      <div className={sectionCls}>
        <h2 className="font-semibold text-[#1C1F1A]">Grunddaten</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Name *</label>
            <input {...register('name')} className={inputCls} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
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
      </div>

      {/* ── Kueche und Ernaehrung ── */}
      <div className={sectionCls}>
        <h2 className="font-semibold text-[#1C1F1A]">Küche und Ernährung</h2>
        <TagPicker cuisine={tags.cuisine} dietary={tags.dietary} onChange={setTags} />
      </div>

      {/* ── Medien ── */}
      <div className={sectionCls}>
        <h2 className="font-semibold text-[#1C1F1A]">Medien</h2>
        <ImageUploader
          storagePath={`${restaurant.id}/cover`}
          label="Titelbild"
          hint="Empfohlen: 1200 × 400 px · JPG oder PNG · max. 20 MB"
          value={coverPreview}
          onChange={url => { if (!url) handleCoverRemove(); else setCoverPreview(url) }}
          onSaved={handleCoverSaved}
          fit="cover"
          aspectClass="aspect-[3/1]"
        />
        <ImageUploader
          storagePath={`${restaurant.id}/logo`}
          label="Logo"
          hint="Empfohlen: 400 × 400 px · PNG mit Transparenz · max. 20 MB"
          value={logoPreview}
          onChange={url => { if (!url) handleLogoRemove(); else setLogoPreview(url) }}
          onSaved={handleLogoSaved}
          fit="contain"
          aspectClass="aspect-square max-w-[180px]"
        />
      </div>

      {/* ── Kontakt ── */}
      <div className={sectionCls}>
        <h2 className="font-semibold text-[#1C1F1A]">Kontakt</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><label className={labelCls}>Adresse</label><input {...register('address')} className={inputCls} /></div>
          <div><label className={labelCls}>PLZ</label><input {...register('zip')} className={inputCls} /></div>
          <div><label className={labelCls}>Stadt</label><input {...register('city')} className={inputCls} /></div>
          <div><label className={labelCls}>Telefon</label><input {...register('phone')} className={inputCls} /></div>
          <div><label className={labelCls}>E-Mail</label><input {...register('email')} className={inputCls} /></div>
          <div><label className={labelCls}>Website</label><input {...register('website')} className={inputCls} /></div>
          <div>
            <label className={labelCls}>
              Instagram-Handle{' '}
              <span className="ml-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-pink-100 text-pink-600">
                📸 Story-Tag
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium select-none">@</span>
              <input {...register('instagram_handle')} placeholder="deinrestaurant" className={`${inputCls} pl-7`} />
            </div>
            <p className="text-xs text-gray-400 mt-1">Wird automatisch in der Story deiner Gäste als @mention eingebaut.</p>
          </div>
          <div className="sm:col-span-2"><label className={labelCls}>Google Place ID</label><input {...register('google_place_id')} className={inputCls} /></div>
        </div>
      </div>

      {/* ── Google Bewertung ── */}
      <div className={sectionCls}>
        <h2 className="font-semibold text-[#1C1F1A]">Google Bewertung</h2>
        <p className="text-xs text-gray-400">Aktuelle Google-Sterne und Anzahl Bewertungen, wird Gästen auf den Karten angezeigt.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Google Sterne (1.0 bis 5.0)</label>
            <input type="number" step="0.1" min="1" max="5" placeholder="z. B. 4.7" value={googleRating} onChange={e => setGoogleRating(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Anzahl Bewertungen</label>
            <input type="number" min="0" placeholder="z. B. 234" value={googleReviewCount} onChange={e => setGoogleReviewCount(e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      {/* ── Öffnungszeiten ── */}
      <div className={sectionCls}>
        <h2 className="font-semibold text-[#1C1F1A]">Öffnungszeiten</h2>
        <div className="space-y-2">
          {DAY_KEYS.map((key, idx) => (
            <div key={key} className="flex items-center gap-3 flex-wrap">
              <span className="w-24 text-sm text-gray-600 shrink-0">{DAYS[idx]}</span>
              <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={openingHours[key]?.closed ?? false}
                  onChange={e => setOpeningHours(h => ({ ...h, [key]: { ...h[key], closed: e.target.checked } }))}
                />
                Geschlossen
              </label>
              {!openingHours[key]?.closed && (
                <>
                  <input type="time" value={openingHours[key]?.open ?? '09:00'}
                    onChange={e => setOpeningHours(h => ({ ...h, [key]: { ...h[key], open: e.target.value } }))}
                    className="px-2 py-1 rounded border border-gray-200 text-sm" />
                  <span className="text-gray-400 text-sm">bis</span>
                  <input type="time" value={openingHours[key]?.close ?? '22:00'}
                    onChange={e => setOpeningHours(h => ({ ...h, [key]: { ...h[key], close: e.target.value } }))}
                    className="px-2 py-1 rounded border border-gray-200 text-sm" />
                </>
              )}
            </div>
          ))}
        </div>
        <div>
          <label className={labelCls}>Hinweistext <span className="text-gray-400 font-normal">(optional)</span></label>
          <textarea {...register('opening_hours_note')} rows={2}
            placeholder="z. B. An Feiertagen geschlossen · Bei schlechtem Wetter früher Feierabend" className={inputCls} />
          <p className="text-xs text-gray-400 mt-1">Wird unterhalb der Öffnungszeiten auf der Gästekarte angezeigt.</p>
        </div>
      </div>

      {/* ── Punkte-Konfiguration ── */}
      <div className={sectionCls}>
        <h2 className="font-semibold text-[#1C1F1A]">Punkte-Konfiguration</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {([
            { label: 'Instagram Story', field: 'points_per_story'         },
            { label: 'Instagram Reel',  field: 'points_per_reel'          },
            { label: 'Instagram Post',  field: 'points_per_post'          },
            { label: 'Google Bewertung',field: 'points_per_google_review' },
            { label: 'Kassenbon',       field: 'points_per_receipt'       },
          ] as const).map(({ label, field }) => (
            <div key={field}>
              <label className={labelCls}>{label} (P)</label>
              <input type="number" {...register(field, { valueAsNumber: true })} className={inputCls} />
            </div>
          ))}
        </div>
      </div>

      {extraSections}

      <button
        type="submit"
        disabled={saving}
        className="w-full gradient-primary py-3 rounded-lg text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {saving ? 'Speichern...' : 'Speichern'}
      </button>
    </form>
  )
}
