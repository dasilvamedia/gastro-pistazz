'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

// Anlage eines neuen Leads. Schreibt in die leads-Tabelle mit deren
// deutschen Spaltennamen (typ, stadt, telefon, naechste_aktion_text).
export default function NeuerLeadPage() {
  const supabase = createClient()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', typ: '', stadt: '', adresse: '', plz: '',
    telefon: '', email: '', website: '', naechste_aktion_text: '',
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name ist ein Pflichtfeld'); return }
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('leads')
        .insert({
          name: form.name.trim(),
          typ: form.typ.trim() || null,
          stadt: form.stadt.trim() || null,
          adresse: form.adresse.trim() || null,
          plz: form.plz.trim() || null,
          telefon: form.telefon.trim() || null,
          email: form.email.trim() || null,
          website: form.website.trim() || null,
          naechste_aktion_text: form.naechste_aktion_text.trim() || null,
          status: 'neu',
        })
        .select('id')
        .single()
      if (error) throw error
      toast.success('Lead angelegt')
      router.push(`/admin/leads/${data.id}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Anlegen fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  const field = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#8BB06A]'

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/leads" className="text-gray-400 hover:text-[#577A3D] transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-[#1C1F1A]">Neuer Lead</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Name des Betriebs *</label>
          <input value={form.name} onChange={set('name')} placeholder="z.B. Trattoria Bella" className={`${field} mt-1`} autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Art</label>
            <input value={form.typ} onChange={set('typ')} placeholder="Restaurant, Bar, Café" className={`${field} mt-1`} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stadt</label>
            <input value={form.stadt} onChange={set('stadt')} placeholder="München" className={`${field} mt-1`} />
          </div>
        </div>
        <div className="grid grid-cols-[2fr_1fr] gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Adresse</label>
            <input value={form.adresse} onChange={set('adresse')} placeholder="Musterstraße 1" className={`${field} mt-1`} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">PLZ</label>
            <input value={form.plz} onChange={set('plz')} placeholder="80331" className={`${field} mt-1`} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Telefon</label>
            <input value={form.telefon} onChange={set('telefon')} placeholder="+49 …" className={`${field} mt-1`} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">E-Mail</label>
            <input value={form.email} onChange={set('email')} type="email" placeholder="info@…" className={`${field} mt-1`} />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Website</label>
          <input value={form.website} onChange={set('website')} placeholder="https://…" className={`${field} mt-1`} />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nächste Aktion</label>
          <input value={form.naechste_aktion_text} onChange={set('naechste_aktion_text')} placeholder="z.B. anrufen und Demo anbieten" className={`${field} mt-1`} />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/admin/leads" className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            Abbrechen
          </Link>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-[#577A3D] text-white text-sm font-semibold hover:bg-[#456130] disabled:opacity-60 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Speichern …' : 'Lead anlegen'}
          </button>
        </div>
      </div>
    </div>
  )
}
