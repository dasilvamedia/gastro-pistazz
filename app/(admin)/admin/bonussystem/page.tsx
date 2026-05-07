'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, ImagePlus, X, Gift, Trophy, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Deal } from '@/types'
import { TRIGGER_CONFIG } from '@/types'
import { IS_MOCK_MODE, MOCK_DEALS, MOCK_RESTAURANTS } from '@/lib/mock-data'

type TriggerKey = keyof typeof TRIGGER_CONFIG

const TRIGGER_OPTIONS: { value: TriggerKey; label: string; emoji: string; description: string }[] = [
  { value: 'instagram_story', label: 'Instagram Story', emoji: '📸', description: 'Wenn Gast eine Story postet' },
  { value: 'instagram_reel', label: 'Instagram Reel', emoji: '🎬', description: 'Wenn Gast ein Reel erstellt' },
  { value: 'instagram_post', label: 'Instagram Post', emoji: '📱', description: 'Wenn Gast einen Post teilt' },
  { value: 'google_review', label: 'Google Bewertung', emoji: '⭐', description: 'Wenn Gast eine Bewertung schreibt' },
  { value: 'receipt_upload', label: 'Kassenbon Upload', emoji: '🧾', description: 'Wenn Gast Bon hochlädt' },
  { value: 'stamp_card', label: 'Stempelkarte', emoji: '🃏', description: 'Für Stempel sammeln' },
]

interface BonusFormData {
  title: string
  description: string
  trigger: TriggerKey
  points_reward: number
  badge_text: string
  image_url: string
}

const defaultForm: BonusFormData = {
  title: '',
  description: '',
  trigger: 'instagram_story',
  points_reward: 500,
  badge_text: '',
  image_url: '',
}

function BonusCard({ deal, onEdit, onDelete, onToggle }: {
  deal: Deal
  onEdit: (d: Deal) => void
  onDelete: (id: string) => void
  onToggle: (d: Deal) => void
}) {
  const trigger = TRIGGER_CONFIG[deal.trigger]
  const isActive = deal.status === 'active'
  return (
    <div className={`bg-white rounded-2xl border overflow-hidden transition-all ${isActive ? 'border-[#D4E8C2]' : 'border-gray-200 opacity-70'}`}>
      {deal.image_url && (
        <img src={deal.image_url} alt={deal.title} className="w-full h-32 object-cover" />
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{trigger.emoji}</span>
            <div>
              <h3 className="font-bold text-[#1C1F1A] text-sm">{deal.title}</h3>
              {deal.badge_text && (
                <span className="text-xs bg-[#E5B84C]/20 text-[#E5B84C] font-bold px-2 py-0.5 rounded-full">{deal.badge_text}</span>
              )}
            </div>
          </div>
          <button
            onClick={() => onToggle(deal)}
            className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
          >
            {isActive ? 'Aktiv' : 'Pausiert'}
          </button>
        </div>

        {deal.description && (
          <p className="text-[#6D9450] text-xs mb-3 leading-relaxed">{deal.description}</p>
        )}

        <div className="flex items-center gap-4 text-xs text-[#6D9450] mb-3">
          <span>🏆 {deal.points_required > 0 ? `${deal.points_required} P benötigt` : 'Keine Punkte nötig'}</span>
          <span>📊 {deal.total_redemptions ?? 0}× eingelöst</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onEdit(deal)}
            className="flex-1 flex items-center justify-center gap-1 border border-[#D4E8C2] text-[#6D9450] text-xs font-medium py-2 rounded-xl hover:bg-[#EEF5E6] transition-colors"
          >
            <Pencil size={12} /> Bearbeiten
          </button>
          <button
            onClick={() => onDelete(deal.id)}
            className="w-9 h-9 flex items-center justify-center border border-red-200 text-red-500 rounded-xl hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BonussystemPage() {
  const supabase = createClient()
  const [deals, setDeals] = useState<Deal[]>([])
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
  const [form, setForm] = useState<BonusFormData>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const imageRef = useRef<HTMLInputElement>(null)

  const fetchDeals = async (rid: string) => {
    const { data } = await supabase
      .from('deals')
      .select('*')
      .eq('restaurant_id', rid)
      .order('created_at', { ascending: false })
    setDeals((data ?? []) as Deal[])
    setLoading(false)
  }

  useEffect(() => {
    if (IS_MOCK_MODE) {
      setDeals(MOCK_DEALS)
      setRestaurantId(MOCK_RESTAURANTS[0].id)
      setLoading(false)
      return
    }
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: rest } = await supabase.from('restaurants').select('id').eq('owner_id', user.id).single()
      if (rest) { setRestaurantId(rest.id); fetchDeals(rest.id) }
    })
  }, [])

  // Realtime subscription
  useEffect(() => {
    if (!restaurantId || IS_MOCK_MODE) return
    const channel = supabase
      .channel('bonussystem-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals', filter: `restaurant_id=eq.${restaurantId}` },
        () => fetchDeals(restaurantId))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [restaurantId])

  const openCreate = () => {
    setEditingDeal(null)
    setForm(defaultForm)
    setShowForm(true)
  }

  const openEdit = (deal: Deal) => {
    setEditingDeal(deal)
    setForm({
      title: deal.title,
      description: deal.description ?? '',
      trigger: deal.trigger as TriggerKey,
      points_reward: Number(deal.reward_value ?? 500),
      badge_text: deal.badge_text ?? '',
      image_url: deal.image_url ?? '',
    })
    setShowForm(true)
  }

  const handleImageUpload = async (file: File) => {
    if (!restaurantId || IS_MOCK_MODE) return
    setUploading(true)
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `deals/${restaurantId}/${Date.now()}.${ext}`
    const buf = await file.arrayBuffer()
    const { data, error } = await supabase.storage.from('deal-images').upload(path, buf, { contentType: file.type, upsert: false })
    if (error) { toast.error('Bild-Upload fehlgeschlagen'); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('deal-images').getPublicUrl(data.path)
    setForm(f => ({ ...f, image_url: urlData.publicUrl }))
    setUploading(false)
    toast.success('Bild hochgeladen')
  }

  const handleSave = async () => {
    if (!form.title || !restaurantId) { toast.error('Titel ist Pflichtfeld'); return }
    setSaving(true)

    if (IS_MOCK_MODE) {
      toast.success(editingDeal ? 'Aktualisiert!' : 'Bonus erstellt!')
      setShowForm(false)
      setSaving(false)
      return
    }

    const payload = {
      restaurant_id: restaurantId,
      title: form.title,
      description: form.description || null,
      trigger: form.trigger,
      status: 'active' as const,
      reward_type: 'custom' as const,
      reward_value: form.points_reward,
      points_required: 0,
      badge_text: form.badge_text || null,
      image_url: form.image_url || null,
    }

    const { error } = editingDeal
      ? await supabase.from('deals').update(payload).eq('id', editingDeal.id)
      : await supabase.from('deals').insert(payload)

    if (error) { toast.error('Fehler beim Speichern'); setSaving(false); return }
    toast.success(editingDeal ? 'Bonus aktualisiert!' : 'Bonus erstellt!')
    setShowForm(false)
    setSaving(false)
    fetchDeals(restaurantId)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bonus wirklich löschen?')) return
    if (IS_MOCK_MODE) { setDeals(prev => prev.filter(d => d.id !== id)); return }
    await supabase.from('deals').delete().eq('id', id)
    setDeals(prev => prev.filter(d => d.id !== id))
    toast.success('Gelöscht')
  }

  const handleToggle = async (deal: Deal) => {
    const newStatus = deal.status === 'active' ? 'paused' : 'active'
    if (IS_MOCK_MODE) { setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, status: newStatus as any } : d)); return }
    await supabase.from('deals').update({ status: newStatus }).eq('id', deal.id)
    setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, status: newStatus as any } : d))
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1F1A]">Bonussystem 🎁</h1>
          <p className="text-[#6D9450] text-sm mt-1">Erstelle Belohnungen für deine Gäste</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 gradient-primary text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm"
        >
          <Plus size={18} /> Neuer Bonus
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: <Gift size={20} />, label: 'Aktive Boni', value: deals.filter(d => d.status === 'active').length },
          { icon: <Zap size={20} />, label: 'Einlösungen gesamt', value: deals.reduce((s, d) => s + (d.total_redemptions ?? 0), 0) },
          { icon: <Trophy size={20} />, label: 'Bonus-Typen', value: new Set(deals.map(d => d.trigger)).size },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-[#EEF5E6] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EEF5E6] flex items-center justify-center text-[#6D9450]">{s.icon}</div>
            <div>
              <p className="text-xl font-bold text-[#1C1F1A]">{s.value}</p>
              <p className="text-xs text-[#6D9450]">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Deals grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
        </div>
      ) : deals.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#EEF5E6]">
          <p className="text-5xl mb-3">🎁</p>
          <p className="text-[#1C1F1A] font-bold text-lg mb-1">Noch keine Boni</p>
          <p className="text-[#6D9450] text-sm mb-4">Erstelle deinen ersten Bonus für deine Gäste</p>
          <button onClick={openCreate} className="gradient-primary text-white font-semibold px-6 py-2.5 rounded-xl">
            Jetzt erstellen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {deals.map(d => (
            <BonusCard key={d.id} deal={d} onEdit={openEdit} onDelete={handleDelete} onToggle={handleToggle} />
          ))}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[#EEF5E6]">
              <h2 className="text-lg font-bold text-[#1C1F1A]">
                {editingDeal ? 'Bonus bearbeiten' : 'Neuen Bonus erstellen'}
              </h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full bg-[#EEF5E6] flex items-center justify-center">
                <X size={16} className="text-[#6D9450]" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Image upload */}
              <div>
                <label className="block text-sm font-semibold text-[#1C1F1A] mb-2">Bild (optional)</label>
                <input ref={imageRef} type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                {form.image_url ? (
                  <div className="relative">
                    <img src={form.image_url} alt="Preview" className="w-full h-32 object-cover rounded-xl" />
                    <button
                      onClick={() => setForm(f => ({ ...f, image_url: '' }))}
                      className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => imageRef.current?.click()}
                    disabled={uploading}
                    className="w-full h-28 border-2 border-dashed border-[#D4E8C2] rounded-xl flex flex-col items-center justify-center gap-2 text-[#6D9450] hover:bg-[#EEF5E6] transition-colors"
                  >
                    <ImagePlus size={24} />
                    <span className="text-sm">{uploading ? 'Lädt hoch...' : 'Bild hochladen'}</span>
                  </button>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-[#1C1F1A] mb-2">Titel *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="z.B. 20% Rabatt für deine Story"
                  className="w-full px-4 py-3 border border-[#D4E8C2] rounded-xl text-sm focus:outline-none focus:border-[#8BB06A] focus:ring-2 focus:ring-[#8BB06A]/20"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-[#1C1F1A] mb-2">Beschreibung</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Was bekommt der Gast genau? Für wen gilt der Bonus?"
                  rows={3}
                  className="w-full px-4 py-3 border border-[#D4E8C2] rounded-xl text-sm focus:outline-none focus:border-[#8BB06A] focus:ring-2 focus:ring-[#8BB06A]/20 resize-none"
                />
              </div>

              {/* Trigger selection */}
              <div>
                <label className="block text-sm font-semibold text-[#1C1F1A] mb-2">Gast muss folgendes tun</label>
                <div className="grid grid-cols-2 gap-2">
                  {TRIGGER_OPTIONS.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setForm(f => ({ ...f, trigger: t.value }))}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                        form.trigger === t.value
                          ? 'border-[#8BB06A] bg-[#EEF5E6]'
                          : 'border-[#D4E8C2] hover:border-[#8BB06A]/50'
                      }`}
                    >
                      <span className="text-lg">{t.emoji}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#1C1F1A] truncate">{t.label}</p>
                        <p className="text-[10px] text-[#6D9450] truncate">{t.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Points reward */}
              <div>
                <label className="block text-sm font-semibold text-[#1C1F1A] mb-2">
                  Punkte-Belohnung: <span className="text-[#8BB06A]">{form.points_reward} Punkte</span>
                </label>
                <input
                  type="range" min={50} max={2000} step={50}
                  value={form.points_reward}
                  onChange={e => setForm(f => ({ ...f, points_reward: Number(e.target.value) }))}
                  className="w-full accent-[#8BB06A]"
                />
                <div className="flex justify-between text-xs text-[#6D9450] mt-1">
                  <span>50 P</span><span>500 P</span><span>1000 P</span><span>2000 P</span>
                </div>
              </div>

              {/* Badge text */}
              <div>
                <label className="block text-sm font-semibold text-[#1C1F1A] mb-2">Etiketten-Text (optional)</label>
                <input
                  value={form.badge_text}
                  onChange={e => setForm(f => ({ ...f, badge_text: e.target.value }))}
                  placeholder="z.B. NEU • BELIEBT • SONDERAKTION"
                  className="w-full px-4 py-3 border border-[#D4E8C2] rounded-xl text-sm focus:outline-none focus:border-[#8BB06A] focus:ring-2 focus:ring-[#8BB06A]/20"
                />
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-3 border border-[#D4E8C2] text-[#6D9450] font-semibold rounded-xl"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title}
                className="flex-1 py-3 gradient-primary text-white font-bold rounded-xl disabled:opacity-60"
              >
                {saving ? 'Speichert...' : editingDeal ? 'Aktualisieren' : 'Bonus erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
