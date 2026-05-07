'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { ArrowLeft, Save, ChevronDown } from 'lucide-react'

const ALL_FEATURES = [
  'Social-Media Loyalty System',
  'Story-Management & Verification',
  'Digitale Stempelkarten',
  'QR-Code System',
  'Analytics Dashboard',
  'In-App Messaging',
  'Deals & Rabatte',
  'Kundendatenbank',
  'Monatlicher Performance Report',
] as const

const schema = z.object({
  recipient_type: z.enum(['lead', 'restaurant']),
  lead_id: z.string().optional(),
  restaurant_id: z.string().optional(),
  title: z.string().min(1, 'Titel ist erforderlich'),
  description: z.string().optional(),
  monthly_fee: z.number().min(0, 'Ungültiger Preis'),
  setup_fee: z.number().min(0, 'Ungültiger Preis'),
  features: z.array(z.string()),
  valid_until: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface SelectOption { id: string; name: string }

const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#8BB06A] focus:ring-1 focus:ring-[#8BB06A]/20'
const labelCls = 'block text-sm font-medium text-[#1C1F1A] mb-1.5'
const errorCls = 'text-xs text-red-500 mt-1'

export default function NeuesAngebotPage() {
  const supabase = createClient()
  const router = useRouter()
  const [leads, setLeads] = useState<SelectOption[]>([])
  const [restaurants, setRestaurants] = useState<SelectOption[]>([])
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      recipient_type: 'lead',
      monthly_fee: 149,
      setup_fee: 0,
      features: [],
    },
  })

  const recipientType = watch('recipient_type')

  useEffect(() => {
    async function loadOptions() {
      const [{ data: leadsData }, { data: restsData }] = await Promise.all([
        supabase.from('leads').select('id, name').order('name'),
        supabase.from('restaurants').select('id, name').order('name'),
      ])
      setLeads(leadsData ?? [])
      setRestaurants(restsData ?? [])
    }
    loadOptions()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      const payload = {
        title: values.title,
        description: values.description || null,
        monthly_fee: values.monthly_fee,
        setup_fee: values.setup_fee,
        features: values.features,
        valid_until: values.valid_until || null,
        notes: values.notes || null,
        status: 'draft',
        lead_id: values.recipient_type === 'lead' ? (values.lead_id || null) : null,
        restaurant_id: values.recipient_type === 'restaurant' ? (values.restaurant_id || null) : null,
      }

      const { error } = await supabase.from('proposals').insert(payload)
      if (error) throw error

      toast.success('Angebot erstellt')
      router.push('/admin/angebote')
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Fehler beim Erstellen')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/admin/angebote"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </Link>
        <div>
          <h1 className="text-3xl font-serif text-[#1C1F1A]">Neues Angebot</h1>
          <p className="text-sm text-gray-500 mt-0.5">Proposal erstellen und an Lead oder Restaurant senden</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Recipient */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-[#1C1F1A]">Empfänger</h2>

          <div className="flex gap-4">
            {(['lead', 'restaurant'] as const).map(type => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value={type}
                  {...register('recipient_type')}
                  onChange={() => {
                    setValue('recipient_type', type)
                    setValue('lead_id', '')
                    setValue('restaurant_id', '')
                  }}
                  className="accent-[#8BB06A]"
                />
                <span className="text-sm font-medium text-[#1C1F1A]">
                  {type === 'lead' ? 'Lead' : 'Bestehendes Restaurant'}
                </span>
              </label>
            ))}
          </div>

          {recipientType === 'lead' ? (
            <div>
              <label className={labelCls}>Lead auswählen</label>
              <div className="relative">
                <select {...register('lead_id')} className={`${inputCls} appearance-none pr-8`}>
                  <option value="">Lead auswählen…</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          ) : (
            <div>
              <label className={labelCls}>Restaurant auswählen</label>
              <div className="relative">
                <select {...register('restaurant_id')} className={`${inputCls} appearance-none pr-8`}>
                  <option value="">Restaurant auswählen…</option>
                  {restaurants.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-[#1C1F1A]">Details</h2>

          <div>
            <label className={labelCls}>Titel <span className="text-red-400">*</span></label>
            <input
              type="text"
              {...register('title')}
              placeholder="z.B. Starter-Paket für Aposto Aalen"
              className={inputCls}
            />
            {errors.title && <p className={errorCls}>{errors.title.message}</p>}
          </div>

          <div>
            <label className={labelCls}>Beschreibung</label>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="Kurze Beschreibung des Angebots…"
              className={`${inputCls} resize-none`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Monatspreis (€) <span className="text-red-400">*</span></label>
              <input
                type="number"
                step="0.01"
                {...register('monthly_fee')}
                className={inputCls}
              />
              {errors.monthly_fee && <p className={errorCls}>{errors.monthly_fee.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Setup-Gebühr (€)</label>
              <input
                type="number"
                step="0.01"
                {...register('setup_fee')}
                className={inputCls}
              />
              {errors.setup_fee && <p className={errorCls}>{errors.setup_fee.message}</p>}
            </div>
          </div>

          <div>
            <label className={labelCls}>Gültig bis</label>
            <input type="date" {...register('valid_until')} className={inputCls} />
          </div>
        </div>

        {/* Features */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-[#1C1F1A]">Enthaltene Features</h2>

          <Controller
            name="features"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ALL_FEATURES.map(feature => {
                  const checked = field.value.includes(feature)
                  return (
                    <label key={feature} className="flex items-center gap-3 cursor-pointer group">
                      <div
                        onClick={() => {
                          if (checked) {
                            field.onChange(field.value.filter(f => f !== feature))
                          } else {
                            field.onChange([...field.value, feature])
                          }
                        }}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                          checked
                            ? 'bg-[#8BB06A] border-[#8BB06A]'
                            : 'border-gray-300 group-hover:border-[#8BB06A]'
                        }`}
                      >
                        {checked && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm text-[#1C1F1A]">{feature}</span>
                    </label>
                  )
                })}
              </div>
            )}
          />
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <label className={labelCls}>Interne Notizen</label>
          <textarea
            {...register('notes')}
            rows={3}
            placeholder="Interne Notizen (nicht im Angebot sichtbar)…"
            className={`${inputCls} resize-none`}
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3 pb-8">
          <Link
            href="/admin/angebote"
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
          >
            Abbrechen
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#8BB06A] text-white text-sm font-medium hover:bg-[#7a9e5e] transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {submitting ? 'Speichern…' : 'Angebot erstellen'}
          </button>
        </div>
      </form>
    </div>
  )
}
