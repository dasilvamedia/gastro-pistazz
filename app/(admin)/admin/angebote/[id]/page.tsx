'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Link from 'next/link'
import {
  ArrowLeft,
  Check,
  X,
  Send,
  Pencil,
  Save,
  FileText,
  Calendar,
  Euro,
} from 'lucide-react'

type ProposalStatus = 'draft' | 'sent' | 'accepted' | 'rejected'

interface Proposal {
  id: string
  title: string
  description: string | null
  monthly_fee: number | null
  setup_fee: number | null
  features: string[]
  status: ProposalStatus
  valid_until: string | null
  sent_at: string | null
  accepted_at: string | null
  notes: string | null
  created_at: string
  lead_id: string | null
  restaurant_id: string | null
  recipient_name?: string | null
}

const STATUS_BADGE: Record<ProposalStatus, { label: string; cls: string }> = {
  draft:    { label: 'Entwurf',    cls: 'bg-gray-100 text-gray-600' },
  sent:     { label: 'Gesendet',   cls: 'bg-blue-100 text-blue-700' },
  accepted: { label: 'Akzeptiert', cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Abgelehnt',  cls: 'bg-red-100 text-red-600' },
}

const inputCls = 'w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#8BB06A] focus:ring-1 focus:ring-[#8BB06A]/20'

export default function AngebotDetailPage() {
  const supabase = createClient()
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editData, setEditData] = useState<Partial<Proposal>>({})

  useEffect(() => {
    loadProposal()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadProposal() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      let recipientName: string | null = null
      if (data.lead_id) {
        const { data: lead } = await supabase
          .from('leads')
          .select('name')
          .eq('id', data.lead_id)
          .single()
        recipientName = lead?.name ?? null
      } else if (data.restaurant_id) {
        const { data: rest } = await supabase
          .from('restaurants')
          .select('name')
          .eq('id', data.restaurant_id)
          .single()
        recipientName = rest?.name ?? null
      }

      setProposal({ ...data, recipient_name: recipientName })
      setEditData({ ...data })
    } catch {
      toast.error('Angebot nicht gefunden')
      router.push('/admin/angebote')
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(newStatus: ProposalStatus) {
    if (!proposal) return
    const updates: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'sent') updates.sent_at = new Date().toISOString()
    if (newStatus === 'accepted') updates.accepted_at = new Date().toISOString()

    const { error } = await supabase
      .from('proposals')
      .update(updates)
      .eq('id', proposal.id)

    if (error) { toast.error('Fehler beim Aktualisieren'); return }
    setProposal(prev => prev ? { ...prev, ...updates, status: newStatus } : prev)
    toast.success(`Status: ${STATUS_BADGE[newStatus].label}`)
  }

  async function saveEdit() {
    if (!proposal) return
    setSaving(true)
    const { error } = await supabase
      .from('proposals')
      .update({
        title: editData.title,
        description: editData.description,
        monthly_fee: editData.monthly_fee,
        setup_fee: editData.setup_fee,
        valid_until: editData.valid_until,
        notes: editData.notes,
      })
      .eq('id', proposal.id)

    if (error) { toast.error('Fehler'); setSaving(false); return }
    setProposal(prev => prev ? { ...prev, ...editData } : prev)
    setEditing(false)
    setSaving(false)
    toast.success('Angebot gespeichert')
  }

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (!proposal) return null

  const statusCfg = STATUS_BADGE[proposal.status]

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/angebote"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </Link>
          <div>
            <h1 className="text-2xl font-serif text-[#1C1F1A]">{proposal.title}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCfg.cls}`}>
                {statusCfg.label}
              </span>
              {proposal.recipient_name && (
                <span className="text-sm text-gray-500">für {proposal.recipient_name}</span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setEditing(!editing)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Pencil className="w-4 h-4" />
          {editing ? 'Abbrechen' : 'Bearbeiten'}
        </button>
      </div>

      {/* Status Actions */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {proposal.status === 'draft' && (
          <button
            onClick={() => updateStatus('sent')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            <Send className="w-4 h-4" />
            Als gesendet markieren
          </button>
        )}
        {(proposal.status === 'draft' || proposal.status === 'sent') && (
          <>
            <button
              onClick={() => updateStatus('accepted')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors"
            >
              <Check className="w-4 h-4" />
              Akzeptiert
            </button>
            <button
              onClick={() => updateStatus('rejected')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
              Abgelehnt
            </button>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Card */}
        <div className="lg:col-span-2 space-y-6">
          {/* Proposal Preview — pistazz.io PDF style */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header Band */}
            <div className="bg-[#1C1F1A] px-6 py-5 flex items-center justify-between">
              <div>
                <span className="font-serif text-2xl">
                  <span className="text-[#8BB06A]">pistazz</span>
                  <span className="text-white">.io</span>
                </span>
                <p className="text-white/60 text-xs mt-0.5">Gastro Marketing Plattform</p>
              </div>
              <div className="text-right">
                <p className="text-white/60 text-xs">Angebot Nr.</p>
                <p className="text-white font-mono text-sm">{proposal.id.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Title & Recipient */}
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Titel</label>
                    <input
                      value={editData.title ?? ''}
                      onChange={e => setEditData(d => ({ ...d, title: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Beschreibung</label>
                    <textarea
                      value={editData.description ?? ''}
                      onChange={e => setEditData(d => ({ ...d, description: e.target.value }))}
                      rows={3}
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-xl font-bold text-[#1C1F1A]">{proposal.title}</h2>
                  {proposal.description && (
                    <p className="text-gray-600 text-sm mt-1">{proposal.description}</p>
                  )}
                </div>
              )}

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-[#8BB06A]/5 border border-[#8BB06A]/20">
                {editing ? (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Monatspreis (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editData.monthly_fee ?? ''}
                        onChange={e => setEditData(d => ({ ...d, monthly_fee: parseFloat(e.target.value) }))}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Setup-Gebühr (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editData.setup_fee ?? ''}
                        onChange={e => setEditData(d => ({ ...d, setup_fee: parseFloat(e.target.value) }))}
                        className={inputCls}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 font-medium">Monatspreis</p>
                      <p className="text-3xl font-bold text-[#8BB06A] mt-0.5">
                        €{(proposal.monthly_fee ?? 0).toFixed(2).replace('.', ',')}
                      </p>
                      <p className="text-xs text-gray-400">pro Monat</p>
                    </div>
                    <div className="text-center border-l border-[#8BB06A]/20">
                      <p className="text-xs text-gray-500 font-medium">Einmalige Setup-Gebühr</p>
                      <p className="text-3xl font-bold text-[#1C1F1A] mt-0.5">
                        €{(proposal.setup_fee ?? 0).toFixed(2).replace('.', ',')}
                      </p>
                      <p className="text-xs text-gray-400">einmalig</p>
                    </div>
                  </>
                )}
              </div>

              {/* Features Checklist */}
              <div>
                <h3 className="text-sm font-semibold text-[#1C1F1A] mb-3">Enthaltene Leistungen</h3>
                {proposal.features && proposal.features.length > 0 ? (
                  <div className="space-y-2">
                    {proposal.features.map(feature => (
                      <div key={feature} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-[#8BB06A] flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-white" strokeWidth={3} />
                        </div>
                        <span className="text-sm text-[#1C1F1A]">{feature}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Keine Features definiert</p>
                )}
              </div>

              {/* Valid Until */}
              {(proposal.valid_until || editing) && (
                <div className="flex items-center gap-2 text-sm text-gray-500 pt-2 border-t border-gray-100">
                  <Calendar className="w-4 h-4" />
                  {editing ? (
                    <input
                      type="date"
                      value={editData.valid_until ?? ''}
                      onChange={e => setEditData(d => ({ ...d, valid_until: e.target.value }))}
                      className={inputCls}
                    />
                  ) : (
                    <span>
                      Gültig bis{' '}
                      <strong className="text-[#1C1F1A]">
                        {new Date(proposal.valid_until!).toLocaleDateString('de-DE')}
                      </strong>
                    </span>
                  )}
                </div>
              )}

              {editing && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setEditing(false)}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8BB06A] text-white text-sm font-medium hover:bg-[#7a9e5e] disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Speichern…' : 'Speichern'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-[#1C1F1A] text-sm">Angebot-Info</h3>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.cls}`}>
                    {statusCfg.label}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Euro className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Jahreswert</p>
                  <p className="font-semibold text-[#1C1F1A]">
                    €{((proposal.monthly_fee ?? 0) * 12).toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {proposal.sent_at && (
                <div className="flex items-start gap-2">
                  <Send className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Gesendet am</p>
                    <p className="text-[#1C1F1A]">
                      {new Date(proposal.sent_at).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                </div>
              )}

              {proposal.accepted_at && (
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Akzeptiert am</p>
                    <p className="text-[#1C1F1A]">
                      {new Date(proposal.accepted_at).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Erstellt am</p>
                  <p className="text-[#1C1F1A]">
                    {new Date(proposal.created_at).toLocaleDateString('de-DE')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {(proposal.notes || editing) && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-[#1C1F1A] text-sm mb-3">Interne Notizen</h3>
              {editing ? (
                <textarea
                  value={editData.notes ?? ''}
                  onChange={e => setEditData(d => ({ ...d, notes: e.target.value }))}
                  rows={4}
                  className={`${inputCls} resize-none`}
                />
              ) : (
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{proposal.notes}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
