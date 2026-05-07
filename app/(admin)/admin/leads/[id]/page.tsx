'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ChevronLeft, Plus, Star, Phone, Mail, MessageSquare, Users, Monitor, FileText, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

type LeadStatus = 'neu' | 'kontaktiert' | 'demo_gebucht' | 'angebot_gesendet' | 'abgeschlossen' | 'verloren'
type ActivityType = 'anruf' | 'email' | 'whatsapp' | 'meeting' | 'demo' | 'notiz'

interface Lead {
  id: string
  name: string
  type: string | null
  city: string | null
  status: LeadStatus
  match_rating: number | null
  next_action: string | null
  phone: string | null
  email: string | null
  notes: string | null
  created_at: string
}

interface Activity {
  id: string
  type: ActivityType
  title: string
  description: string | null
  created_at: string
}

const STATUS_OPTIONS: LeadStatus[] = ['neu', 'kontaktiert', 'demo_gebucht', 'angebot_gesendet', 'abgeschlossen', 'verloren']
const STATUS_LABELS: Record<LeadStatus, string> = {
  neu: 'Neu',
  kontaktiert: 'Kontaktiert',
  demo_gebucht: 'Demo gebucht',
  angebot_gesendet: 'Angebot gesendet',
  abgeschlossen: 'Abgeschlossen',
  verloren: 'Verloren',
}
const STATUS_COLORS: Record<LeadStatus, string> = {
  neu: 'bg-blue-100 text-blue-700',
  kontaktiert: 'bg-yellow-100 text-yellow-700',
  demo_gebucht: 'bg-purple-100 text-purple-700',
  angebot_gesendet: 'bg-orange-100 text-orange-700',
  abgeschlossen: 'bg-green-100 text-green-700',
  verloren: 'bg-red-100 text-red-700',
}

const ACTIVITY_ICON: Record<ActivityType, React.ElementType> = {
  anruf: Phone,
  email: Mail,
  whatsapp: MessageSquare,
  meeting: Users,
  demo: Monitor,
  notiz: FileText,
}
const ACTIVITY_EMOJI: Record<ActivityType, string> = {
  anruf: '📞',
  email: '📧',
  whatsapp: '💬',
  meeting: '🤝',
  demo: '🖥',
  notiz: '📝',
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />
}

interface ActivityModalProps {
  onClose: () => void
  onSave: (data: { type: ActivityType; title: string; description: string }) => Promise<void>
}

function ActivityModal({ onClose, onSave }: ActivityModalProps) {
  const [type, setType] = useState<ActivityType>('notiz')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { toast.error('Titel ist erforderlich'); return }
    setSaving(true)
    await onSave({ type, title, description })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-charcoal">Aktivität hinzufügen</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ActivityType)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="anruf">📞 Anruf</option>
              <option value="email">📧 E-Mail</option>
              <option value="whatsapp">💬 WhatsApp</option>
              <option value="meeting">🤝 Meeting</option>
              <option value="demo">🖥 Demo</option>
              <option value="notiz">📝 Notiz</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="z.B. Erstgespräch geführt"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              placeholder="Details zur Aktivität..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-60"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Speichern
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [lead, setLead] = useState<Lead | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: leadData, error: leadErr }, { data: actData }] = await Promise.all([
        supabase.from('leads').select('*').eq('id', id).single(),
        supabase.from('lead_activities').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
      ])

      if (leadErr) throw leadErr
      setLead(leadData as Lead)
      setActivities((actData ?? []) as Activity[])
    } catch {
      toast.error('Lead nicht gefunden')
      router.push('/admin/leads')
    } finally {
      setLoading(false)
    }
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (!lead) return
    setSavingStatus(true)
    const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', id)
    if (error) {
      toast.error('Fehler beim Speichern')
    } else {
      setLead({ ...lead, status: newStatus })
      toast.success('Status aktualisiert')
    }
    setSavingStatus(false)
  }

  const handleAddActivity = async (data: { type: ActivityType; title: string; description: string }) => {
    const { error } = await supabase.from('lead_activities').insert({
      lead_id: id,
      type: data.type,
      title: data.title,
      description: data.description || null,
    })
    if (error) {
      toast.error('Fehler beim Speichern der Aktivität')
    } else {
      toast.success('Aktivität gespeichert')
      setShowModal(false)
      loadData()
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!lead) return null

  const StatusIcon = ACTIVITY_ICON['notiz']

  return (
    <>
      {showModal && (
        <ActivityModal onClose={() => setShowModal(false)} onSave={handleAddActivity} />
      )}

      <div className="p-8 max-w-4xl mx-auto">
        {/* Back */}
        <Link
          href="/admin/leads"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-charcoal transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Zurück zu Leads
        </Link>

        {/* Lead Header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-serif text-charcoal">{lead.name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {[lead.type, lead.city].filter(Boolean).join(' · ')}
              </p>
              {lead.phone && <p className="text-sm text-gray-500 mt-1">📞 {lead.phone}</p>}
              {lead.email && <p className="text-sm text-gray-500">📧 {lead.email}</p>}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Match rating */}
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < (lead.match_rating ?? 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
                  />
                ))}
              </div>

              {/* Status select */}
              <div className="relative">
                <select
                  value={lead.status}
                  onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
                  disabled={savingStatus}
                  className={`pl-3 pr-8 py-1.5 rounded-xl text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 ${STATUS_COLORS[lead.status]}`}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {lead.next_action && (
            <div className="mt-4 p-3 bg-primary/10 rounded-xl">
              <p className="text-xs font-semibold text-primary-deep uppercase tracking-wide mb-0.5">Nächste Aktion</p>
              <p className="text-sm text-charcoal">{lead.next_action}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 bg-charcoal text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-charcoal/80 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Aktivität hinzufügen
            </button>
            <Link
              href={`/admin/restaurants/neu?lead_id=${lead.id}`}
              className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Als Restaurant anlegen
            </Link>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-charcoal">Aktivitäten</h2>
            <span className="text-xs text-gray-400">{activities.length} Einträge</span>
          </div>

          {activities.length === 0 ? (
            <div className="p-10 text-center">
              <StatusIcon className="w-8 h-8 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Noch keine Aktivitäten</p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-3 text-sm text-primary hover:underline"
              >
                Erste Aktivität hinzufügen
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {activities.map((act) => {
                const emoji = ACTIVITY_EMOJI[act.type] ?? '📝'
                const date = new Date(act.created_at).toLocaleDateString('de-DE', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
                return (
                  <div key={act.id} className="px-6 py-4 flex items-start gap-4">
                    <span className="text-xl shrink-0 mt-0.5" aria-hidden>{emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-charcoal">{act.title}</p>
                      {act.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{act.description}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{date}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
