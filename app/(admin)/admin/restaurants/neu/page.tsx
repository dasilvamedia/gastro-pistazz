'use client'

import { useEffect, useState, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Loader2, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

const restaurantSchema = z.object({
  name: z.string().min(2, 'Name mindestens 2 Zeichen'),
  slug: z.string().min(2, 'Slug mindestens 2 Zeichen').regex(/^[a-z0-9-]+$/, 'Nur Kleinbuchstaben, Zahlen und Bindestriche'),
  type: z.enum(['restaurant', 'bar', 'cafe', 'fine_dining', 'biergarten', 'eisdiele']),
  city: z.string().min(2, 'Stadt angeben'),
  address: z.string().optional(),
  zip: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Ungültige E-Mail').optional().or(z.literal('')),
  website: z.string().url('Ungültige URL').optional().or(z.literal('')),
  instagram_handle: z.string().optional(),
  description: z.string().optional(),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Ungültiger Farbcode'),
  points_per_story: z.number().int().min(0),
  // Owner login credentials
  owner_name: z.string().min(1, 'Inhabername angeben'),
  owner_password: z.string().min(6, 'Passwort mindestens 6 Zeichen'),
})

type FormValues = z.infer<typeof restaurantSchema>

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[äöüß]/g, (c) =>
      ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' } as Record<string, string>)[c] ?? c
    )
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function NeuesRestaurantForm() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(restaurantSchema),
    defaultValues: {
      type: 'restaurant',
      primary_color: '#8BB06A',
      points_per_story: 500,
    },
  })

  const nameValue = watch('name')

  useEffect(() => {
    if (nameValue) {
      setValue('slug', slugify(nameValue), { shouldValidate: false })
    }
  }, [nameValue, setValue])

  const onSubmit = async (values: FormValues) => {
    try {
      const res = await fetch('/api/restaurant/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler beim Erstellen')

      toast.success(`Restaurant erstellt! Login: ${values.slug} / ${values.owner_password}`)
      router.push('/admin/restaurants')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Fehler beim Erstellen'
      toast.error(message)
    }
  }

  const leadId = searchParams.get('lead_id')

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href="/admin/restaurants"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-charcoal transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Zurück zur Liste
        </Link>
        <h1 className="text-2xl font-serif text-charcoal">Neues Restaurant anlegen</h1>
        {leadId && (
          <p className="text-sm text-primary mt-1">Wird aus Lead #{leadId.slice(0, 8)} erstellt</p>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basis */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-charcoal text-sm uppercase tracking-wide">Basisdaten</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input {...register('name')} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL) *</label>
              <input {...register('slug')} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30" />
              {errors.slug && <p className="text-xs text-red-500 mt-1">{errors.slug.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Typ *</label>
              <select {...register('type')} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="restaurant">Restaurant</option>
                <option value="bar">Bar</option>
                <option value="cafe">Café</option>
                <option value="fine_dining">Fine Dining</option>
                <option value="biergarten">Biergarten</option>
                <option value="eisdiele">Eisdiele</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stadt *</label>
              <input {...register('city')} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
        </div>

        {/* Adresse */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-charcoal text-sm uppercase tracking-wide">Adresse & Kontakt</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <input {...register('address')} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Musterstraße 1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PLZ</label>
              <input {...register('zip')} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="12345" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <input {...register('phone')} type="tel" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
              <input {...register('email')} type="email" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input {...register('website')} type="url" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="https://" />
              {errors.website && <p className="text-xs text-red-500 mt-1">{errors.website.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instagram Handle</label>
              <div className="flex items-center">
                <span className="px-3 py-2 border border-r-0 border-gray-200 rounded-l-xl text-sm text-gray-400 bg-gray-50">@</span>
                <input {...register('instagram_handle')} className="flex-1 px-3 py-2 border border-gray-200 rounded-r-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
          </div>
        </div>

        {/* Einstellungen */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-charcoal text-sm uppercase tracking-wide">Punkte & Darstellung</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Punkte pro Story</label>
              <input
                {...register('points_per_story')}
                type="number"
                min="0"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primärfarbe</label>
              <div className="flex items-center gap-2">
                <input {...register('primary_color')} type="color" className="h-10 w-14 rounded-lg border border-gray-200 p-1 cursor-pointer" />
                <input {...register('primary_color')} className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              {errors.primary_color && <p className="text-xs text-red-500 mt-1">{errors.primary_color.message}</p>}
            </div>
          </div>
        </div>

        {/* Zugangsdaten für den Inhaber */}
        <div className="bg-white rounded-2xl border border-primary/20 p-6 shadow-sm space-y-4" style={{ borderColor: '#8BB06A40' }}>
          <div>
            <h2 className="font-semibold text-charcoal text-sm uppercase tracking-wide">Inhaber-Zugangsdaten</h2>
            <p className="text-xs text-gray-400 mt-0.5">Login für das Restaurant-Dashboard (keine E-Mail nötig)</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Inhabername *</label>
              <input
                {...register('owner_name')}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="z.B. Marco Rossi"
              />
              {errors.owner_name && <p className="text-xs text-red-500 mt-1">{errors.owner_name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Passwort *</label>
              <div className="relative">
                <input
                  {...register('owner_password')}
                  type={showPassword ? 'text' : 'password'}
                  className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Mindestens 6 Zeichen"
                  autoComplete="new-password"
                  data-form-type="other"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.owner_password && <p className="text-xs text-red-500 mt-1">{errors.owner_password.message}</p>}
            </div>
          </div>
          <div className="bg-primary/5 rounded-xl p-3 text-xs text-gray-500 space-y-1">
            <p>🔑 <strong>Login-Name:</strong> der Slug-Wert oben (z.B. <code className="bg-gray-100 px-1 rounded">pizza-mario</code>)</p>
            <p>🌐 <strong>Login-URL:</strong> gastro.pistazz.io/restaurant-login</p>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <Link
            href="/admin/restaurants"
            className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Abbrechen
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Restaurant erstellen
          </button>
        </div>
      </form>
    </div>
  )
}

export default function NeuesRestaurantPage() {
  return (
    <Suspense fallback={<div className="p-6"><div className="skeleton h-96 rounded-xl" /></div>}>
      <NeuesRestaurantForm />
    </Suspense>
  )
}
