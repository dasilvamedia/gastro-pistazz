'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { QRCodeSVG } from 'qrcode.react'
import { Plus, Download, Trash2, QrCode, ToggleLeft, ToggleRight } from 'lucide-react'
import { QRCode } from '@/types'

export default function QRCodesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [restaurantSlug, setRestaurantSlug] = useState('')
  const [qrCodes, setQrCodes] = useState<QRCode[]>([])
  const [loading, setLoading] = useState(true)
  const [label, setLabel] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [creating, setCreating] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const svgRefs = useRef<Record<string, SVGSVGElement | null>>({})

  useEffect(() => {
    async function init() {
      const res = await fetch('/api/dashboard/restaurant')
      if (!res.ok) { setLoading(false); return }
      const { restaurant: rest } = await res.json()
      if (!rest) { setLoading(false); return }
      setRestaurantId(rest.id)
      setRestaurantSlug(rest.slug)
      // Use production URL — never localhost
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gastro.pistazz.io'
      const defaultUrl = `${siteUrl}/r/${rest.slug}`
      setTargetUrl(defaultUrl)
      const { data: codes } = await supabase.from('qr_codes').select('*').eq('restaurant_id', rest.id).order('created_at', { ascending: false })
      setQrCodes(codes ?? [])
      setLoading(false)
    }
    init()
  }, [supabase])

  const createQR = async () => {
    if (!restaurantId || !targetUrl) { toast.error('Bitte Ziel-URL eingeben'); return }
    setCreating(true)
    const code = Math.random().toString(36).substring(2, 10).toUpperCase()
    const { data, error } = await supabase.from('qr_codes').insert({
      restaurant_id: restaurantId,
      code,
      label: label || null,
      target_url: targetUrl,
      is_active: true,
    }).select().single()
    if (error) { toast.error('Fehler beim Erstellen'); setCreating(false); return }
    setQrCodes(prev => [data, ...prev])
    setLabel('')
    setTargetUrl(`${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gastro.pistazz.io'}/r/${restaurantSlug}`)
    toast.success('QR-Code erstellt')
    setCreating(false)
  }

  const toggleQR = async (qr: QRCode) => {
    const { error } = await supabase.from('qr_codes').update({ is_active: !qr.is_active }).eq('id', qr.id)
    if (error) { toast.error('Fehler'); return }
    setQrCodes(prev => prev.map(q => q.id === qr.id ? { ...q, is_active: !q.is_active } : q))
    toast.success(qr.is_active ? 'Deaktiviert' : 'Aktiviert')
  }

  const deleteQR = async (id: string) => {
    const { error } = await supabase.from('qr_codes').delete().eq('id', id)
    if (error) { toast.error('Löschen fehlgeschlagen'); return }
    setQrCodes(prev => prev.filter(q => q.id !== id))
    setDeleteId(null)
    toast.success('QR-Code geloescht')
  }

  const downloadQR = (qr: QRCode) => {
    const svgEl = svgRefs.current[qr.id]
    if (!svgEl) return

    const canvas = document.createElement('canvas')
    const size = 300
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const svgData = new XMLSerializer().serializeToString(svgEl)
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)
      const a = document.createElement('a')
      a.download = `qr-${qr.label ?? qr.code}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="skeleton h-36 rounded-2xl" />
        {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-[#1C1F1A]">QR-Codes</h1>
        <p className="text-sm text-gray-500 mt-1">Erstelle und verwalte QR-Codes fuer dein Restaurant</p>
      </div>

      {/* Create form */}
      <div className="bg-white rounded-2xl p-6 border border-[#EEF5E6] space-y-4">
        <div className="flex items-center gap-2">
          <QrCode size={18} className="text-[#8BB06A]" />
          <h2 className="font-semibold text-[#1C1F1A]">Neuer QR-Code</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#1C1F1A] mb-1.5">Bezeichnung (optional)</label>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="z.B. Eingang, Tisch 5, Flyer"
              className="w-full px-4 py-2.5 border border-[#D4E8C2] rounded-xl text-sm focus:outline-none focus:border-[#8BB06A] focus:ring-2 focus:ring-[#8BB06A]/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1C1F1A] mb-1.5">Ziel-URL</label>
            <input
              value={targetUrl}
              onChange={e => setTargetUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2.5 border border-[#D4E8C2] rounded-xl text-sm focus:outline-none focus:border-[#8BB06A] focus:ring-2 focus:ring-[#8BB06A]/20"
            />
          </div>
        </div>
        <button
          onClick={createQR}
          disabled={creating || !targetUrl}
          className="flex items-center gap-2 gradient-primary text-white font-semibold px-5 py-2.5 rounded-xl disabled:opacity-60 hover:opacity-90 transition-opacity"
        >
          <Plus size={16} />
          {creating ? 'Erstelle...' : 'QR-Code erstellen'}
        </button>
      </div>

      {/* QR codes list */}
      {qrCodes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#EEF5E6]">
          <QrCode size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-[#1C1F1A] font-bold text-lg mb-1">Noch keine QR-Codes</p>
          <p className="text-[#6D9450] text-sm">Erstelle deinen ersten QR-Code oben</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {qrCodes.map(qr => (
            <div key={qr.id} className={`bg-white rounded-2xl p-5 border transition-all ${qr.is_active ? 'border-[#D4E8C2]' : 'border-gray-200 opacity-70'}`}>
              <div className="flex gap-4">
                <div className="flex-shrink-0 bg-gray-50 rounded-xl p-2">
                  <QRCodeSVG
                    value={qr.target_url ?? `https://gastro.pistazz.io/r/${restaurantSlug}`}
                    size={150}
                    ref={(el: SVGSVGElement | null) => { svgRefs.current[qr.id] = el }}
                  />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <p className="font-semibold text-[#1C1F1A] truncate">{qr.label ?? qr.code}</p>
                    <p className="text-xs text-gray-400 truncate">{qr.target_url}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-[#EEF5E6] text-[#6D9450] px-2 py-0.5 rounded-full font-medium">
                      {qr.scan_count} Scans
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${qr.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {qr.is_active ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{new Date(qr.created_at).toLocaleDateString('de')}</p>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => downloadQR(qr)}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-[#D4E8C2] text-[#6D9450] hover:bg-[#EEF5E6] transition-colors"
                    >
                      <Download size={12} /> Download
                    </button>
                    <button
                      onClick={() => toggleQR(qr)}
                      className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition-colors ${qr.is_active ? 'border-yellow-200 text-yellow-700 hover:bg-yellow-50' : 'border-green-200 text-green-700 hover:bg-green-50'}`}
                    >
                      {qr.is_active ? <ToggleLeft size={12} /> : <ToggleRight size={12} />}
                      {qr.is_active ? 'Pause' : 'Aktivieren'}
                    </button>
                    <button
                      onClick={() => setDeleteId(qr.id)}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-[#1C1F1A] mb-2">QR-Code löschen?</h3>
            <p className="text-sm text-gray-500 mb-5">Dieser QR-Code und alle Scan-Daten werden permanent geloescht.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-600 text-sm hover:bg-gray-50">
                Abbrechen
              </button>
              <button onClick={() => deleteQR(deleteId)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#E86B5A] text-white text-sm hover:opacity-90">
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
