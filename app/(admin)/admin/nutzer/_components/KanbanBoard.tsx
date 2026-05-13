'use client'

import { useState, useRef } from 'react'
import { Sparkles } from 'lucide-react'
import type { KanbanCol } from './AiComposer'

interface UserRow {
  id: string
  email: string
  name: string | null
  provider: string
  created_at: string
  restaurant_name: string | null
  total_points: number
  total_stories: number
}

interface Props {
  users: UserRow[]
  overrides: Record<string, KanbanCol>   // userId → forced column
  onMove: (userId: string, col: KanbanCol) => void
  onCompose: (col: KanbanCol, count: number) => void
}

const COLUMNS: { key: KanbanCol; label: string; emoji: string; color: string; desc: string }[] = [
  { key: 'neu',     label: 'Neu',     emoji: '🆕', color: '#3B82F6', desc: 'Kürzlich registriert, noch keine Aktivität' },
  { key: 'aktiv',   label: 'Aktiv',   emoji: '⚡', color: '#8BB06A', desc: 'Hat Stories oder Punkte gesammelt' },
  { key: 'vip',     label: 'VIP',     emoji: '👑', color: '#F59E0B', desc: '3+ Stories oder 500+ Punkte' },
  { key: 'inaktiv', label: 'Inaktiv', emoji: '💤', color: '#9CA3AF', desc: 'Lange keine Aktivität mehr' },
]

const PROV_ICON: Record<string, string> = { google: '🟦', apple: '🍎', email: '📧' }

function autoColumn(u: UserRow): KanbanCol {
  const daysSince = (Date.now() - new Date(u.created_at).getTime()) / 86400000
  if (u.total_stories >= 3 || u.total_points >= 500) return 'vip'
  if (u.total_stories > 0 || u.total_points > 0) return 'aktiv'
  if (daysSince > 14) return 'inaktiv'
  return 'neu'
}

export function KanbanBoard({ users, overrides, onMove, onCompose }: Props) {
  const [dragId, setDragId]       = useState<string | null>(null)
  const [dragOver, setDragOver]   = useState<KanbanCol | null>(null)
  const dragTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const grouped = COLUMNS.reduce<Record<KanbanCol, UserRow[]>>((acc, col) => {
    acc[col.key] = users.filter(u => (overrides[u.id] ?? autoColumn(u)) === col.key)
    return acc
  }, { neu: [], aktiv: [], vip: [], inaktiv: [] })

  const handleDragStart = (e: React.DragEvent, userId: string) => {
    e.dataTransfer.setData('userId', userId)
    e.dataTransfer.effectAllowed = 'move'
    setDragId(userId)
  }

  const handleDragOver = (e: React.DragEvent, col: KanbanCol) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragTimer.current) clearTimeout(dragTimer.current)
    setDragOver(col)
  }

  const handleDrop = (e: React.DragEvent, col: KanbanCol) => {
    e.preventDefault()
    const uid = e.dataTransfer.getData('userId')
    if (uid) onMove(uid, col)
    setDragId(null)
    setDragOver(null)
  }

  const handleDragEnd = () => {
    setDragId(null)
    dragTimer.current = setTimeout(() => setDragOver(null), 100)
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {COLUMNS.map(col => {
        const colUsers  = grouped[col.key]
        const isOver    = dragOver === col.key
        return (
          <div key={col.key}
            onDragOver={e => handleDragOver(e, col.key)}
            onDrop={e => handleDrop(e, col.key)}
            onDragLeave={() => { if (dragTimer.current) clearTimeout(dragTimer.current); dragTimer.current = setTimeout(() => setDragOver(null), 80) }}
            className={`flex flex-col rounded-2xl border-2 transition-all duration-200 min-h-64 ${isOver ? 'border-dashed scale-[1.01] shadow-lg' : 'border-gray-100'}`}
            style={{ borderColor: isOver ? col.color : undefined, background: isOver ? col.color + '0A' : '#F9FAFB' }}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 rounded-t-2xl bg-white">
              <div className="flex items-center gap-2">
                <span className="text-lg">{col.emoji}</span>
                <div>
                  <p className="font-semibold text-[#1C1F1A] text-sm">{col.label}</p>
                  <p className="text-[10px] text-gray-400">{colUsers.length} Nutzer</p>
                </div>
              </div>
              <button
                onClick={() => onCompose(col.key, colUsers.length)}
                title="KI-Nachricht erstellen"
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors"
                style={{ background: col.color + '18', color: col.color }}>
                <Sparkles className="w-3 h-3" />
                KI
              </button>
            </div>

            {/* Cards */}
            <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[60vh]">
              {colUsers.length === 0 && (
                <div className="text-center py-8 text-gray-300 text-xs select-none">
                  {isOver ? '↓ Hier ablegen' : 'Keine Nutzer'}
                </div>
              )}
              {colUsers.map(u => (
                <div key={u.id}
                  draggable
                  onDragStart={e => handleDragStart(e, u.id)}
                  onDragEnd={handleDragEnd}
                  className={`bg-white rounded-xl border border-gray-100 p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all select-none ${dragId === u.id ? 'opacity-50 rotate-1 scale-95' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ background: `linear-gradient(135deg, ${col.color}, ${col.color}88)` }}>
                      {(u.name ?? u.email)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#1C1F1A] text-xs truncate">
                        {u.name ?? <span className="italic text-gray-400">Kein Name</span>}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                    </div>
                    <span className="text-sm shrink-0">{PROV_ICON[u.provider] ?? '📧'}</span>
                  </div>

                  {/* Activity chips */}
                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                    {u.restaurant_name && (
                      <span className="text-[9px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full font-medium truncate max-w-20">
                        {u.restaurant_name}
                      </span>
                    )}
                    {u.total_stories > 0 && (
                      <span className="text-[9px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full font-semibold">
                        {u.total_stories} 📸
                      </span>
                    )}
                    {u.total_points > 0 && (
                      <span className="text-[9px] bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded-full font-semibold">
                        {u.total_points}p
                      </span>
                    )}
                  </div>

                  {/* Date */}
                  <p className="text-[9px] text-gray-300 mt-1.5">
                    {new Date(u.created_at).toLocaleDateString('de')}
                  </p>
                </div>
              ))}
            </div>

            {/* Drop hint */}
            {isOver && (
              <div className="mx-2 mb-2 border-2 border-dashed rounded-xl py-3 text-center text-xs font-medium"
                style={{ borderColor: col.color, color: col.color }}>
                In „{col.label}" verschieben
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
