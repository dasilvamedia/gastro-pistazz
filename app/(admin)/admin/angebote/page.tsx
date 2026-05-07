'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FileText, Plus, Filter } from 'lucide-react'

type ProposalStatus = 'draft' | 'sent' | 'accepted' | 'rejected'

interface ProposalRow {
  id: string
  title: string
  monthly_fee: number | null
  setup_fee: number | null
  status: ProposalStatus
  valid_until: string | null
  created_at: string
  lead_id: string | null
  restaurant_id: string | null
  recipient_name: string | null
}

const STATUS_BADGE: Record<ProposalStatus, { label: string; cls: string }> = {
  draft:    { label: 'Entwurf',   cls: 'bg-gray-100 text-gray-600' },
  sent:     { label: 'Gesendet',  cls: 'bg-blue-100 text-blue-700' },
  accepted: { label: 'Akzeptiert', cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Abgelehnt', cls: 'bg-red-100 text-red-600' },
}

const FILTER_TABS: { key: 'all' | ProposalStatus; label: string }[] = [
  { key: 'all',      label: 'Alle' },
  { key: 'draft',    label: 'Entwurf' },
  { key: 'sent',     label: 'Gesendet' },
  { key: 'accepted', label: 'Akzeptiert' },
  { key: 'rejected', label: 'Abgelehnt' },
]

function StatusBadge({ status }: { status: ProposalStatus }) {
  const cfg = STATUS_BADGE[status] ?? STATUS_BADGE.draft
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

export default function AngebotePage() {
  const supabase = createClient()
  const router = useRouter()
  const [proposals, setProposals] = useState<ProposalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<'all' | ProposalStatus>('all')

  useEffect(() => {
    loadProposals()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadProposals() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select('id, title, monthly_fee, setup_fee, status, valid_until, created_at, lead_id, restaurant_id')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Enrich with recipient names
      const leadIds = (data ?? []).filter(p => p.lead_id).map(p => p.lead_id as string)
      const restIds = (data ?? []).filter(p => p.restaurant_id && !p.lead_id).map(p => p.restaurant_id as string)

      const [{ data: leads }, { data: rests }] = await Promise.all([
        leadIds.length
          ? supabase.from('leads').select('id, name').in('id', leadIds)
          : Promise.resolve({ data: [] }),
        restIds.length
          ? supabase.from('restaurants').select('id, name').in('id', restIds)
          : Promise.resolve({ data: [] }),
      ])

      const leadMap: Record<string, string> = {}
      for (const l of leads ?? []) leadMap[l.id] = l.name

      const restMap: Record<string, string> = {}
      for (const r of rests ?? []) restMap[r.id] = r.name

      setProposals(
        (data ?? []).map(p => ({
          ...p,
          recipient_name: p.lead_id
            ? (leadMap[p.lead_id] ?? null)
            : p.restaurant_id
            ? (restMap[p.restaurant_id] ?? null)
            : null,
        }))
      )
    } catch {
      toast.error('Fehler beim Laden der Angebote')
    } finally {
      setLoading(false)
    }
  }

  const filtered = activeFilter === 'all'
    ? proposals
    : proposals.filter(p => p.status === activeFilter)

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-serif text-[#1C1F1A]">Angebote</h1>
          <p className="text-sm text-gray-500 mt-1">Proposals an Leads und Restaurants verwalten</p>
        </div>
        <Link
          href="/admin/angebote/neu"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8BB06A] text-white text-sm font-medium hover:bg-[#7a9e5e] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Neues Angebot
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
        <Filter className="w-4 h-4 text-gray-400 mr-2 mb-px" />
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeFilter === tab.key
                ? 'border-[#8BB06A] text-[#8BB06A]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#8BB06A]" />
          <h2 className="font-semibold text-[#1C1F1A]">
            {filtered.length} {activeFilter === 'all' ? 'Angebote gesamt' : STATUS_BADGE[activeFilter as ProposalStatus]?.label}
          </h2>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Keine Angebote in dieser Kategorie</p>
            <Link href="/admin/angebote/neu" className="mt-4 inline-block text-sm text-[#8BB06A] hover:underline">
              Erstes Angebot erstellen
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Empfänger</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Titel</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Monatspreis</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Gültig bis</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Erstellt</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/admin/angebote/${p.id}`)}
                    className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-3.5 font-medium text-[#1C1F1A]">
                      {p.recipient_name ?? <span className="text-gray-400 italic">Kein Empfänger</span>}
                    </td>
                    <td className="px-6 py-3.5 text-gray-700 max-w-[200px] truncate">{p.title}</td>
                    <td className="px-6 py-3.5">
                      {p.monthly_fee != null ? (
                        <span className="font-semibold text-[#8BB06A]">
                          €{p.monthly_fee.toFixed(2).replace('.', ',')}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-6 py-3.5 text-gray-500 text-xs">
                      {p.valid_until
                        ? new Date(p.valid_until).toLocaleDateString('de-DE')
                        : '—'}
                    </td>
                    <td className="px-6 py-3.5 text-gray-400 text-xs">
                      {new Date(p.created_at).toLocaleDateString('de-DE')}
                    </td>
                    <td className="px-6 py-3.5" onClick={e => e.stopPropagation()}>
                      <Link
                        href={`/admin/angebote/${p.id}`}
                        className="text-xs px-2.5 py-1 rounded-lg border border-[#8BB06A] text-[#8BB06A] hover:bg-[#EEF5E6] transition-colors"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
