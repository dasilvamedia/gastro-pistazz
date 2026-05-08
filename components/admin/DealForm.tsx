'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Deal, DealTrigger, DealStatus, RewardType } from '@/types'
import { createClient } from '@/lib/supabase/client'
import ImageUploader from '@/components/admin/ImageUploader'

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

const schema = z.object({
  title: z.string().min(1, 'Pflichtfeld'),
  description: z.string().optional(),
  trigger: z.enum(['instagram_story', 'instagram_reel', 'instagram_post', 'google_review', 'receipt_upload', 'stamp_card', 'custom']),
  reward_type: z.enum(['discount_percent', 'discount_fixed', 'free_item', 'bogo', 'custom']),
  reward_value: z.string().optional(),
  points_required: z.number().min(0),
  min_order_value: z.number().optional(),
  valid_from: z.string().optional(),
  valid_until: z.string().optional(),
  valid_days: z.array(z.number()),
  valid_hours_start: z.string().optional(),
  valid_hours_end: z.string().optional(),
  max_redemptions: z.number().optional(),
  max_per_user: z.number().min(1),
  badge_text: z.string().optional(),
  badge_color: z.string(),
  status: z.enum(['draft', 'active', 'paused']),
})

type FormValues = z.infer<typeof schema>

interface Props {
  deal?: Deal
  restaurantId: string
  /** Where to navigate after save. Defaults to /dashboard/deals */
  backPath?: string
}

export default function DealForm({ deal, restaurantId, backPath = '/dashboard/deals' }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const isEdit = !!deal
  const [imageUrl, setImageUrl] = useState<string | null>(deal?.image_url ?? null)

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: deal?.title ?? '',
      description: deal?.description ?? '',
      trigger: deal?.trigger ?? 'instagram_story',
      reward_type: deal?.reward_type ?? 'discount_percent',
      reward_value: deal?.reward_value ?? '',
      points_required: deal?.points_required ?? 0,
      min_order_value: deal?.min_order_value ?? undefined,
      valid_from: deal?.valid_from?.split('T')[0] ?? '',
      valid_until: deal?.valid_until?.split('T')[0] ?? '',
      valid_days: deal?.valid_days ?? [0, 1, 2, 3, 4, 5, 6],
      valid_hours_start: deal?.valid_hours_start ?? '',
      valid_hours_end: deal?.valid_hours_end ?? '',
      max_redemptions: deal?.max_redemptions ?? undefined,
      max_per_user: deal?.max_per_user ?? 1,
      badge_text: deal?.badge_text ?? '',
      badge_color: deal?.badge_color ?? '#8BB06A',
      status: (deal?.status as 'draft' | 'active' | 'paused') ?? 'draft',
    },
  })

  const validDays = watch('valid_days')

  const toggleDay = (idx: number) => {
    const current = validDays ?? []
    if (current.includes(idx)) setValue('valid_days', current.filter(d => d !== idx))
    else setValue('valid_days', [...current, idx])
  }

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      restaurant_id: restaurantId,
      image_url: imageUrl,
      valid_from: values.valid_from || null,
      valid_until: values.valid_until || null,
      min_order_value: values.min_order_value || null,
      max_redemptions: values.max_redemptions || null,
      valid_hours_start: values.valid_hours_start || null,
      valid_hours_end: values.valid_hours_end || null,
    }

    if (isEdit) {
      const { error } = await supabase.from('deals').update(payload).eq('id', deal!.id)
      if (error) { toast.error('Fehler beim Speichern'); return }
      toast.success('Deal aktualisiert')
    } else {
      const { error } = await supabase.from('deals').insert(payload)
      if (error) { toast.error('Fehler beim Erstellen'); return }
      toast.success('Deal erstellt')
    }
    router.push(backPath)
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#8BB06A] bg-white'
  const labelCls = 'block text-sm font-medium text-[#1C1F1A] mb-1'
  const errCls = 'text-xs text-[#E86B5A] mt-1'
  const sectionCls = 'glass rounded-xl p-5 space-y-4'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className={sectionCls}>
        <h2 className="font-semibold text-[#1C1F1A]">Grundinfo</h2>
        <div>
          <label className={labelCls}>Titel *</label>
          <input {...register('title')} className={inputCls} />
          {errors.title && <p className={errCls}>{errors.title.message}</p>}
        </div>
        <div>
          <label className={labelCls}>Beschreibung</label>
          <textarea {...register('description')} rows={3} className={inputCls} />
        </div>
      </div>

      <div className={sectionCls}>
        <h2 className="font-semibold text-[#1C1F1A]">Trigger & Belohnung</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Trigger</label>
            <select {...register('trigger')} className={inputCls}>
              <option value="instagram_story">Instagram Story</option>
              <option value="instagram_reel">Instagram Reel</option>
              <option value="instagram_post">Instagram Post</option>
              <option value="google_review">Google Bewertung</option>
              <option value="receipt_upload">Beleg hochladen</option>
              <option value="stamp_card">Stempelkarte</option>
              <option value="custom">Individuell</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Belohnungstyp</label>
            <select {...register('reward_type')} className={inputCls}>
              <option value="discount_percent">Rabatt %</option>
              <option value="discount_fixed">Rabatt Festbetrag</option>
              <option value="free_item">Gratis-Artikel</option>
              <option value="bogo">BOGO</option>
              <option value="custom">Individuell</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Belohnungswert</label>
            <input {...register('reward_value')} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Punkte erforderlich</label>
            <input type="number" {...register('points_required', { valueAsNumber: true })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Min. Bestellwert (€)</label>
            <input type="number" step="0.01" {...register('min_order_value', { valueAsNumber: true })} className={inputCls} />
          </div>
        </div>
      </div>

      <div className={sectionCls}>
        <h2 className="font-semibold text-[#1C1F1A]">Gültigkeit</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Gültig von</label>
            <input type="date" {...register('valid_from')} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Gültig bis</label>
            <input type="date" {...register('valid_until')} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Von Uhrzeit</label>
            <input type="time" {...register('valid_hours_start')} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Bis Uhrzeit</label>
            <input type="time" {...register('valid_hours_end')} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Wochentage</label>
          <div className="flex gap-2 flex-wrap">
            {DAYS.map((day, idx) => (
              <button key={day} type="button" onClick={() => toggleDay(idx)}
                className={`px-3 py-1 rounded-full text-sm border transition-colors ${validDays?.includes(idx) ? 'bg-[#8BB06A] text-white border-[#8BB06A]' : 'border-gray-300 text-gray-500 hover:border-[#8BB06A]'}`}>
                {day}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={sectionCls}>
        <h2 className="font-semibold text-[#1C1F1A]">Limits</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Max. Einlösungen gesamt</label>
            <input type="number" {...register('max_redemptions', { valueAsNumber: true })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Max. pro Kunde</label>
            <input type="number" {...register('max_per_user', { valueAsNumber: true })} className={inputCls} />
          </div>
        </div>
      </div>

      <div className={sectionCls}>
        <h2 className="font-semibold text-[#1C1F1A]">Darstellung</h2>

        {/* Deal image – object-contain so it's never cropped */}
        <ImageUploader
          storagePath={`${restaurantId}/deals/${deal?.id ?? 'new'}-${Date.now()}`}
          label="Deal-Bild (optional)"
          hint="Empfohlen: 800 × 600 px · JPG oder PNG · max. 20 MB"
          value={imageUrl}
          onChange={setImageUrl}
          onSaved={url => setImageUrl(url)}
          fit="contain"
          aspectClass="aspect-video"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Badge-Text</label>
            <input {...register('badge_text')} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Badge-Farbe</label>
            <input type="color" {...register('badge_color')} className="h-10 w-full rounded-lg border border-gray-200 cursor-pointer" />
          </div>
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select {...register('status')} className={inputCls}>
            <option value="draft">Entwurf</option>
            <option value="active">Aktiv</option>
            <option value="paused">Pausiert</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={() => router.push(backPath)}
          className="flex-1 px-4 py-3 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium">
          Abbrechen
        </button>
        <button type="submit" disabled={isSubmitting}
          className="flex-1 gradient-primary px-4 py-3 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
          {isSubmitting ? 'Speichern...' : isEdit ? 'Aktualisieren' : 'Deal erstellen'}
        </button>
      </div>
    </form>
  )
}
