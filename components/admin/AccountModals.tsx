'use client'

import { useState } from 'react'
import { X, ChevronDown, Eye, EyeOff, UserX } from 'lucide-react'

interface RestaurantOption {
  id: string
  name: string
  slug: string
  city: string
}

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#8BB06A] focus:ring-1 focus:ring-[#8BB06A]/20'

export interface CreateForm {
  full_name: string
  password: string
  restaurant_slug: string
  restaurant_name: string
  city: string
  isNew: boolean
}

export interface EditForm {
  user_id: string
  full_name: string
  password: string
  restaurant_slug: string
}

interface CreateModalProps {
  restaurants: RestaurantOption[]
  onClose: () => void
  onSubmit: (form: CreateForm) => Promise<void>
  submitting: boolean
}

export function CreateOwnerModal({ restaurants, onClose, onSubmit, submitting }: CreateModalProps) {
  const [form, setForm] = useState<CreateForm>({
    full_name: '', password: '', restaurant_slug: '', restaurant_name: '', city: '', isNew: false,
  })
  const [showPw, setShowPw] = useState(false)

  const derivedSlug = form.restaurant_slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-[#1C1F1A]">Neuen Owner erstellen</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1C1F1A] mb-1">
              Vollständiger Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              placeholder="Max Mustermann"
              className={inputCls}
              autoComplete="off"
              data-form-type="other"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1C1F1A] mb-1">
              Passwort <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Sicheres Passwort"
                className={`${inputCls} pr-10`}
                autoComplete="new-password"
                data-form-type="other"
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1C1F1A] mb-1">Restaurant</label>
            <div className="flex gap-2 mb-2">
              <button type="button"
                onClick={() => setForm(f => ({ ...f, isNew: false, restaurant_slug: '' }))}
                className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${!form.isNew ? 'border-[#8BB06A] bg-[#8BB06A]/10 text-[#8BB06A]' : 'border-gray-200 text-gray-500'}`}
              >Bestehendes</button>
              <button type="button"
                onClick={() => setForm(f => ({ ...f, isNew: true, restaurant_slug: '' }))}
                className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${form.isNew ? 'border-[#8BB06A] bg-[#8BB06A]/10 text-[#8BB06A]' : 'border-gray-200 text-gray-500'}`}
              >Neues erstellen</button>
            </div>

            {!form.isNew ? (
              <div className="relative">
                <select
                  value={form.restaurant_slug}
                  onChange={e => setForm(f => ({ ...f, restaurant_slug: e.target.value }))}
                  className={`${inputCls} appearance-none pr-8`}
                >
                  <option value="">Restaurant auswählen</option>
                  {restaurants.map(r => (
                    <option key={r.slug} value={r.slug}>{r.name} ({r.city})</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            ) : (
              <div className="space-y-2">
                <input type="text" value={form.restaurant_name}
                  onChange={e => setForm(f => ({ ...f, restaurant_name: e.target.value }))}
                  placeholder="Restaurant Name" className={inputCls} />
                <input type="text" value={form.restaurant_slug}
                  onChange={e => setForm(f => ({ ...f, restaurant_slug: e.target.value }))}
                  placeholder="slug (z.B. mein-restaurant-aalen)" className={inputCls} />
                <input type="text" value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  placeholder="Stadt" className={inputCls} />
              </div>
            )}
            {form.isNew && derivedSlug && (
              <p className="text-xs text-gray-400 mt-1">E-Mail: {derivedSlug}@gastro.pistazz.io</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">
              Abbrechen
            </button>
            <button onClick={() => onSubmit(form)} disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#8BB06A] text-white text-sm font-medium hover:bg-[#7a9e5e] disabled:opacity-50">
              {submitting ? 'Erstelle...' : 'Owner erstellen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface EditModalProps {
  restaurants: RestaurantOption[]
  initial: EditForm
  onClose: () => void
  onSubmit: (form: EditForm) => Promise<void>
  submitting: boolean
}

export function EditOwnerModal({ restaurants, initial, onClose, onSubmit, submitting }: EditModalProps) {
  const [form, setForm] = useState<EditForm>(initial)
  const [showPw, setShowPw] = useState(false)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-[#1C1F1A]">Account bearbeiten</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1C1F1A] mb-1">Name</label>
            <input type="text" value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              className={inputCls} autoComplete="off" data-form-type="other" />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1C1F1A] mb-1">Neues Passwort (optional)</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Leer lassen = keine Änderung"
                className={`${inputCls} pr-10`}
                autoComplete="new-password" data-form-type="other" />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1C1F1A] mb-1">Restaurant zuweisen</label>
            <div className="relative">
              <select value={form.restaurant_slug}
                onChange={e => setForm(f => ({ ...f, restaurant_slug: e.target.value }))}
                className={`${inputCls} appearance-none pr-8`}>
                <option value="">Kein Restaurant</option>
                {restaurants.map(r => (
                  <option key={r.slug} value={r.slug}>{r.name} ({r.city})</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">
              Abbrechen
            </button>
            <button onClick={() => onSubmit(form)} disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#8BB06A] text-white text-sm font-medium hover:bg-[#7a9e5e] disabled:opacity-50">
              {submitting ? 'Speichere...' : 'Speichern'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface BanModalProps {
  name: string | null
  onClose: () => void
  onConfirm: () => void
}

export function BanConfirmModal({ name, onClose, onConfirm }: BanModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex items-center gap-3 mb-3">
          <UserX className="w-5 h-5 text-red-500" />
          <h3 className="text-lg font-semibold text-[#1C1F1A]">Account sperren?</h3>
        </div>
        <p className="text-sm text-gray-500 mb-1">
          <span className="font-medium">{name}</span> wird dauerhaft gesperrt.
        </p>
        <p className="text-xs text-gray-400 mb-5">Der Account kann über Supabase wieder reaktiviert werden.</p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">
            Abbrechen
          </button>
          <button onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600">
            Sperren
          </button>
        </div>
      </div>
    </div>
  )
}
