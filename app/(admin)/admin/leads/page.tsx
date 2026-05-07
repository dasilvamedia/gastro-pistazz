'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Plus, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

type LeadStatus = 'neu' | 'kontaktiert' | 'demo_gebucht' | 'angebot_gesendet' | 'abgeschlossen' | 'verloren'

interface Lead {
  id: string
  name: string
  type: string | null
  city: string | null
  status: LeadStatus
  match_rating: number | null
  next_action: string | null
  created_at: string
}

const STATUS_CONFIG: Record<LeadStatus, { label: string; bg: string; text: string }> = {
  neu: { label: 'Neu', bg: 'bg-blue-100', text: 'text-blue-700' },
  kontaktiert: { label: 'Kontaktiert', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  demo_gebucht: { label: 'Demo gebucht', bg: 'bg-purple-100', text: 'text-purple-700' },
  angebot_gesendet: { label: 'Angebot gesendet', bg: 'bg-orange-100', text: 'text-orange-700' },
  abgeschlossen: { label: 'Abgeschlossen', bg: 'bg-green-100', text: 'text-green-700' },
  verloren: { label: 'Verloren', bg: 'bg-red-100', text: 'text-red-700' },
}

const ALL_STATUSES = Object.keys(STATUS_CONFIG) as LeadStatus[]

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />
}

function StatusBadge({ status }: { status: LeadStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bg: 'bg-gray-100', text: 'text-gray-600' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  )
}

function StarRating({ value }: { value: number | null }) {
  const n = value ?? 0
  return (
    <span className="flex items-center gap-0.5" aria-label={`${n} von 5 Sternen`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${i < n ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
        />
      ))}
    </span>
  )
}

export default function AdminLeadsPage() {
  const supabase = createClient()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [tableExists, setTableExists] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<LeadStatus | 'all'>('all')

  const loadLeads = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('leads')
        .select('id, name, type, city, status, match_rating, next_action, created_at')
        .order('created_at', { ascending: false })

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      }

      const { data, error } = await query
      if (error) {
        if (error.code === '42P01') {
          setTableExists(false)
          setLeads([])
          return
        }
        throw error
      }
      setLeads((data ?? []) as Lead[])
    } catch {
      toast.error('Fehler beim Laden der Leads')
    } finally {
      setLoading(false)
    }
  }, [filterStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadLeads()
  }, [loadLeads])

  const statusCounts = ALL_STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = leads.filter((l) => l.status === s).length
    return acc
  }, {})

  const filtered = leads.filter((l) => {
    if (!search) return true
    const q = search.toLowerCase()
    return l.name.toLowerCase().includes(q) || (l.city ?? '').toLowerCase().includes(q)
  })

  if (!tableExists) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-serif text-charcoal">CRM Leads</h1>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <p className="text-4xl mb-4">🗃️</p>
          <p className="font-semibold text-charcoal mb-2">Leads-Tabelle noch nicht eingerichtet</p>
          <p className="text-sm text-gray-500 mb-4">
            Die Tabelle <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">leads</code> existiert noch nicht in der Datenbank.
          </p>
          <p className="text-xs text-gray-400">Füge die Tabelle via Supabase SQL-Editor hinzu, um CRM-Leads zu verwalten.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-charcoal">CRM Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">{leads.length} Leads gesamt</p>
        </div>
        <Link
          href="/admin/leads/neu"
          className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Neuer Lead
        </Link>
      </div>

      {/* Status counters */}
      {!loading && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
          {ALL_STATUSES.map((s) => {
            const cfg = STATUS_CONFIG[s]
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
                className={`rounded-xl p-3 border text-center transition-all ${
                  filterStatus === s ? 'border-primary ring-2 ring-primary/20' : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
              >
                <p className={`text-xl font-bold ${cfg.text}`}>{statusCounts[s]}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-tight">{cfg.label}</p>
              </button>
            )
          })}
        </div>
      )}

      {/* Search */}
      <div className="mb-5 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Nach Name oder Stadt suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as LeadStatus | 'all')}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all">Alle Status</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-3xl mb-3">🔍</p>
            <p className="text-gray-400 text-sm font-medium">Keine Leads gefunden</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Typ</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stadt</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Match</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nächste Aktion</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-charcoal">{lead.name}</td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">{lead.type ?? '—'}</td>
                    <td className="px-5 py-3.5 text-gray-500">{lead.city ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <StarRating value={lead.match_rating} />
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs max-w-48 truncate">
                      {lead.next_action ?? '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/admin/leads/${lead.id}`}
                        className="text-xs font-medium text-primary hover:text-primary-dark transition-colors"
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
