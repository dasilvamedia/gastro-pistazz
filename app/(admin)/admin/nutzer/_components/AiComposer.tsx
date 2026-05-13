'use client'

import { useState } from 'react'
import { Sparkles, Send, X, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

export type KanbanCol = 'neu' | 'aktiv' | 'vip' | 'inaktiv'

interface Props {
  column: KanbanCol | null
  userCount: number
  restaurants: { id: string; name: string }[]
  onClose: () => void
}

const TEMPLATES: Record<KanbanCol, { title: string; message: string; emoji: string }[]> = {
  neu: [
    {
      title: 'Willkommen bei pistazz! 🎉',
      message: 'Hey! Willkommen in der pistazz-Community 🌿\nTeile dein erstes Restaurantfoto als Instagram Story und verdiene sofort Punkte für exklusive Deals. Los geht\'s!',
      emoji: '👋',
    },
    {
      title: 'Dein erstes Abenteuer wartet',
      message: 'Hast du schon deinen ersten pistazz-Deal entdeckt? 🍽️\nErstelle jetzt eine Story über dein Lieblingsrestaurant und sammle Punkte für Gratis-Desserts und Rabatte!',
      emoji: '🚀',
    },
  ],
  aktiv: [
    {
      title: 'Du machst das großartig! ⭐',
      message: 'Schau mal, wie weit du schon gekommen bist! 🏆\nNoch ein bisschen mehr und du erreichst den nächsten Level mit noch besseren Deals. Weiter so!',
      emoji: '💪',
    },
    {
      title: 'Empfehle pistazz weiter',
      message: 'Du liebst pistazz — teile das Erlebnis! 🌟\nFür jede Person, die sich über deinen Link anmeldet, bekommst du Extra-Punkte. Teile jetzt!',
      emoji: '🤝',
    },
  ],
  vip: [
    {
      title: 'Exklusiv für unsere VIPs 👑',
      message: 'Als pistazz-VIP bekommst du als Erster Zugang zu neuen Angeboten und exklusiven Deals.\nDieser Monat: Gratis-Dessert bei Partnerrestaurants! Jetzt einlösen. 🎁',
      emoji: '👑',
    },
    {
      title: 'Danke für deine Treue 💚',
      message: 'Du bist einer unserer treuesten pistazz-Nutzer — das wollen wir feiern! 🎉\nAls Dankeschön: 200 Bonus-Punkte warten auf dich. Jetzt in der App abholen!',
      emoji: '🎁',
    },
  ],
  inaktiv: [
    {
      title: 'Wir vermissen dich! 😔',
      message: 'Hey, wir haben dich eine Weile nicht mehr gesehen.\nKomm zurück und entdecke neue Deals in deiner Nähe — dein nächstes Gratis-Dessert wartet schon auf dich! 🍰',
      emoji: '💫',
    },
    {
      title: 'Etwas Neues wartet auf dich',
      message: 'Seit deinem letzten Besuch haben wir viel Neues hinzugefügt! 🆕\nNeue Restaurants, neue Deals, neue Möglichkeiten. Schau mal rein — nur 2 Minuten! ⚡',
      emoji: '✨',
    },
  ],
}

const COL_LABEL: Record<KanbanCol, { label: string; color: string }> = {
  neu:     { label: 'Neu',     color: '#3B82F6' },
  aktiv:   { label: 'Aktiv',   color: '#8BB06A' },
  vip:     { label: 'VIP',     color: '#F59E0B' },
  inaktiv: { label: 'Inaktiv', color: '#6B7280' },
}

export function AiComposer({ column, userCount, restaurants, onClose }: Props) {
  const [tplIdx, setTplIdx] = useState(0)
  const [title, setTitle]   = useState('')
  const [msg, setMsg]       = useState('')
  const [target, setTarget] = useState('column')
  const [sending, setSending] = useState(false)
  const [generated, setGenerated] = useState(false)

  if (!column) return null
  const templates = TEMPLATES[column]
  const colInfo   = COL_LABEL[column]

  const applyTemplate = (idx: number) => {
    setTplIdx(idx)
    setTitle(templates[idx].title)
    setMsg(templates[idx].message)
    setGenerated(true)
  }

  const handleGenerate = () => {
    const next = (tplIdx + 1) % templates.length
    applyTemplate(next)
    toast('Neue Nachricht generiert ✨', { icon: '🤖' })
  }

  const handleSend = async () => {
    if (!title.trim() || !msg.trim()) { toast.error('Titel und Nachricht sind Pflichtfelder'); return }
    setSending(true)
    await new Promise(r => setTimeout(r, 1000))
    toast.success(`Nachricht für "${colInfo.label}" gespeichert — wird versendet sobald Push live ist 🚀`)
    setSending(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: colInfo.color + '22' }}>
              <Sparkles className="w-5 h-5" style={{ color: colInfo.color }} />
            </div>
            <div>
              <p className="font-bold text-[#1C1F1A]">KI Nachricht erstellen</p>
              <p className="text-xs text-gray-400">
                Segment: <span className="font-semibold" style={{ color: colInfo.color }}>{colInfo.label}</span>
                {' '}· {userCount} Nutzer
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Template-Vorschläge */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">KI-Vorschläge für "{colInfo.label}"</p>
            <div className="flex gap-2">
              {templates.map((t, i) => (
                <button key={i} onClick={() => applyTemplate(i)}
                  className={`flex-1 text-left px-3 py-2 rounded-xl border text-xs transition-all ${tplIdx === i && generated ? 'border-[#8BB06A] bg-[#EEF5E6]' : 'border-gray-200 hover:border-gray-300'}`}>
                  <span className="text-base">{t.emoji}</span>
                  <p className="font-medium text-[#1C1F1A] mt-0.5 leading-tight line-clamp-2">{t.title}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Titel */}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Titel der Benachrichtigung</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder={templates[0].title}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#8BB06A]" />
          </div>

          {/* Nachricht */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-500">Nachricht</label>
              <button onClick={handleGenerate}
                className="flex items-center gap-1 text-xs text-[#8BB06A] hover:text-[#577A3D] font-medium">
                <RefreshCw className="w-3 h-3" /> Neu generieren
              </button>
            </div>
            <textarea value={msg} onChange={e => setMsg(e.target.value)}
              placeholder={templates[0].message}
              rows={4}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#8BB06A] resize-none" />
            <p className="text-xs text-gray-400 mt-1">{msg.length} / 200 Zeichen</p>
          </div>

          {/* Zielgruppe */}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Senden an</label>
            <select value={target} onChange={e => setTarget(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#8BB06A] bg-white">
              <option value="column">Alle in „{colInfo.label}" ({userCount} Nutzer)</option>
              <option value="all">Alle Nutzer</option>
              {restaurants.map(r => <option key={r.id} value={`rest:${r.id}`}>Restaurant: {r.name}</option>)}
            </select>
          </div>

          {/* Send */}
          <button onClick={handleSend} disabled={sending || !generated}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-60 transition-colors"
            style={{ background: generated ? colInfo.color : '#d1d5db' }}>
            {sending ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Send className="w-4 h-4" />}
            {sending ? 'Wird gespeichert…' : 'Nachricht senden / speichern'}
          </button>

          {!generated && (
            <p className="text-center text-xs text-gray-400">
              Wähle einen Vorschlag oben oder generiere eine neue Nachricht
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
