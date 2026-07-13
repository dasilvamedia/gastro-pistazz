'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { CameraOff, CheckCircle, Copy, FlipHorizontal, ImagePlus, RotateCcw, Share2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Restaurant } from '@/types'
import { FilterStrip, FILTERS, type FilterId } from '@/components/story/FilterStrip'
import { TextOverlay, type TextBlock } from '@/components/story/TextOverlay'

// ─────────────────────────────────────────────────────────────────────────────
// Sticker color variants
// ─────────────────────────────────────────────────────────────────────────────
type StickerColor = 'green' | 'white' | 'black'
const STICKER_STYLES: Record<StickerColor, { bg: string; text: string; border: string }> = {
  green: { bg: '#8BB06A',   text: '#ffffff',  border: 'rgba(255,255,255,0.3)' },
  white: { bg: '#ffffff',   text: '#1C1F1A',  border: 'rgba(0,0,0,0.12)' },
  black: { bg: '#1C1F1A',   text: '#ffffff',  border: 'rgba(255,255,255,0.15)' },
}

// ─────────────────────────────────────────────────────────────────────────────
// Canvas export: draws image + filter + sticker + text overlays + tag pill
// ─────────────────────────────────────────────────────────────────────────────
async function exportCanvas(
  imageSrc: string,
  filterCss: string,
  textBlocks: TextBlock[],
  restaurantHandle: string | null | undefined,
  stickerColor: StickerColor,
  stickerX: number,
  stickerY: number,
  stickerScale: number,
  containerW: number,
  containerH: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      // Always export at Instagram Story resolution 1080×1920 (9:16)
      const W = 1080
      const H = 1920
      const canvas = document.createElement('canvas')
      canvas.width  = W
      canvas.height = H
      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      // 1. Photo + filter — crop image to fill 9:16 (cover)
      const iW = img.naturalWidth  || 1080
      const iH = img.naturalHeight || 1920
      const iRatio = iW / iH
      const tRatio = W  / H  // 9/16
      let sx = 0, sy = 0, sw = iW, sh = iH
      if (iRatio > tRatio) { sw = Math.round(iH * tRatio); sx = Math.round((iW - sw) / 2) }
      else if (iRatio < tRatio) { sh = Math.round(iW / tRatio); sy = Math.round((iH - sh) / 2) }

      ctx.filter = filterCss === 'none' ? '' : filterCss
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H)
      ctx.filter = ''

      // Helper: remap a normalised (0-1) screen position to the 9:16 canvas position.
      // When the container IS 9:16 this is identity; when wider/taller we offset into the safe zone.
      const safeW_c = Math.min(containerW, containerH * (9 / 16))
      const safeH_c = Math.min(containerH, containerW * (16 / 9))
      const safeL   = (containerW - safeW_c) / 2 / containerW
      const safeT   = (containerH - safeH_c) / 2 / containerH
      const safeWn  = safeW_c / containerW
      const safeHn  = safeH_c / containerH
      const toCanvas = (nx: number, ny: number) => ({
        cx: ((nx - safeL) / safeWn) * W,
        cy: ((ny - safeT) / safeHn) * H,
      })

      // 2. Pistazz sticker at user-defined position + scale (remapped to canvas)
      const stStyle = STICKER_STYLES[stickerColor]
      const { cx: sCx, cy: sCy } = toCanvas(stickerX, stickerY)
      const baseW = W * 0.52, baseH = H * 0.12
      const sW = baseW * stickerScale
      const sH = baseH * stickerScale
      const sX = sCx - sW / 2
      const sY = sCy - sH / 2
      ctx.fillStyle = stStyle.bg
      ctx.beginPath()
      ctx.roundRect(sX, sY, sW, sH, sH * 0.22)
      ctx.fill()
      ctx.strokeStyle = stStyle.border
      ctx.lineWidth   = 2
      ctx.stroke()

      ctx.fillStyle    = stStyle.text + '80'
      ctx.font         = `500 ${W * 0.025 * stickerScale}px -apple-system, sans-serif`
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('POWERED BY', sCx, sY + sH * 0.28)

      ctx.fillStyle = stStyle.text
      ctx.font      = `bold ${W * 0.065 * stickerScale}px -apple-system, sans-serif`
      ctx.fillText('pistazz.io', sCx, sY + sH * 0.68)

      // 4. Text overlays (remapped from screen coords to canvas coords)
      textBlocks.forEach(block => {
        const { cx: bx, cy: by } = toCanvas(block.x, block.y)
        ctx.font      = `bold ${block.fontSize * (W / 390)}px -apple-system, sans-serif`
        ctx.fillStyle = block.color
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.shadowColor  = block.color === '#000000' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.7)'
        ctx.shadowBlur   = 8
        ctx.fillText(block.text, bx, by)
        ctx.shadowBlur = 0
      })

      // 5. @tag pill at bottom
      const handles = [
        restaurantHandle ? `@${restaurantHandle.replace(/^@/, '')}` : null,
        '@gastropistazz',
      ].filter(Boolean).join('  ')

      const fs2 = 28 * (W / 390)
      ctx.font         = `bold ${fs2}px -apple-system, sans-serif`
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'middle'
      const met   = ctx.measureText(handles)
      const pillW = met.width + 48 * (W / 390)
      const pillH = fs2 + 28 * (W / 390)
      const pillX = (W - pillW) / 2
      const pillY = H - pillH - 80 * (H / 844)

      ctx.fillStyle = 'rgba(255,255,255,0.88)'
      ctx.beginPath()
      ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2)
      ctx.fill()
      ctx.fillStyle = '#1C1F1A'
      ctx.fillText(handles, W / 2, pillY + pillH / 2)

      canvas.toBlob(b => b ? resolve(b) : reject(new Error('Export failed')), 'image/jpeg', 0.95)
    }
    img.onerror = reject
    img.src     = imageSrc
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Service worker + push subscription helper
// ─────────────────────────────────────────────────────────────────────────────
async function setupPush() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    await navigator.serviceWorker.ready

    const perm = await Notification.requestPermission()
    if (perm !== 'granted') return

    const existing = await reg.pushManager.getSubscription()
    const sub = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    })

    const subJSON = sub.toJSON()
    const p256dh = subJSON.keys?.['p256dh']
    const auth   = subJSON.keys?.['auth']
    if (!p256dh || !auth) return

    await fetch('/api/push/subscribe', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ endpoint: sub.endpoint, keys: { p256dh, auth } }),
    })
  } catch { /* silently skip if unsupported */ }
}


async function sendPushNotification(userId: string) {
  try {
    await fetch('/api/push/send', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        user_id: userId,
        title:   '📸 Story eingereicht!',
        body:    'Zur Gutschrift deiner Bonuspunkte wird deine Story geprüft – meist in wenigen Stunden.',
        url:     '/home',
      }),
    })
  } catch { /* non-critical */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sticker overlay — draggable + pinch-resizable + double-tap for color
// ─────────────────────────────────────────────────────────────────────────────
function StickerOverlay({
  color, onColorChange,
  x, y, scale, onUpdate,
  containerRef,
}: {
  color: StickerColor
  onColorChange: (c: StickerColor) => void
  x: number
  y: number
  scale: number
  onUpdate: (x: number, y: number, scale: number) => void
  containerRef: React.RefObject<HTMLDivElement | null>
}) {
  const s = STICKER_STYLES[color]
  const COLORS: StickerColor[] = ['green', 'white', 'black']
  const drag = useRef({ sx: 0, sy: 0, px: x, py: y, dist: 0, sc: scale })

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation()
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()

    if (e.touches.length >= 2) {
      // Pinch → scale
      drag.current.dist = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY,
      )
      drag.current.sc = scale
      drag.current.px = x; drag.current.py = y
      const onPinch = (te: TouchEvent) => {
        if (te.touches.length < 2) return
        const d = Math.hypot(te.touches[1].clientX - te.touches[0].clientX, te.touches[1].clientY - te.touches[0].clientY)
        const ns = Math.min(3, Math.max(0.3, drag.current.sc * (d / drag.current.dist)))
        onUpdate(drag.current.px, drag.current.py, ns)
      }
      const onEnd = () => { window.removeEventListener('touchmove', onPinch); window.removeEventListener('touchend', onEnd) }
      window.addEventListener('touchmove', onPinch)
      window.addEventListener('touchend', onEnd)
    } else {
      // Single-touch → drag
      drag.current.sx = e.touches[0].clientX
      drag.current.sy = e.touches[0].clientY
      drag.current.px = x; drag.current.py = y
      const onMove = (te: TouchEvent) => {
        const nx = Math.min(0.95, Math.max(0.05, drag.current.px + (te.touches[0].clientX - drag.current.sx) / rect.width))
        const ny = Math.min(0.95, Math.max(0.05, drag.current.py + (te.touches[0].clientY - drag.current.sy) / rect.height))
        onUpdate(nx, ny, scale)
      }
      const onEnd = () => { window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd) }
      window.addEventListener('touchmove', onMove)
      window.addEventListener('touchend', onEnd)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const sx = e.clientX, sy = e.clientY, px = x, py = y
    const onMove = (me: MouseEvent) => onUpdate(
      Math.min(0.95, Math.max(0.05, px + (me.clientX - sx) / rect.width)),
      Math.min(0.95, Math.max(0.05, py + (me.clientY - sy) / rect.height)),
      scale,
    )
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div
      className="absolute pointer-events-auto cursor-move select-none z-20"
      style={{
        left: `${x * 100}%`,
        top:  `${y * 100}%`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: 'center center',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onDoubleClick={() => { const i = COLORS.indexOf(color); onColorChange(COLORS[(i + 1) % 3]) }}
    >
      <div
        className="rounded-2xl px-6 py-3 flex flex-col items-center gap-0.5 border shadow-lg"
        style={{ background: s.bg, borderColor: s.border }}
      >
        <span className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: s.text, opacity: 0.65 }}>POWERED BY</span>
        <span className="font-serif text-2xl font-bold" style={{ color: s.text }}>pistazz.io</span>
      </div>
      <p className="text-center text-white/45 text-[9px] mt-1 leading-tight">
        Ziehen · 2× Tippen = Farbe
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Share bottom sheet
// ─────────────────────────────────────────────────────────────────────────────
function ShareSheet({
  restaurantHandle,
  onCancel,
  onConfirm,
  loading,
}: {
  restaurantHandle: string | null | undefined
  onCancel: () => void
  onConfirm: () => void
  loading: boolean
}) {
  const handles = [
    restaurantHandle ? `@${restaurantHandle.replace(/^@/, '')}` : null,
    '@gastropistazz',
  ].filter(Boolean) as string[]

  const copyHandle = (h: string) => {
    navigator.clipboard.writeText(h).then(() => toast.success(`${h} kopiert!`)).catch(() => {})
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-t-3xl px-5 pt-3 pb-10 space-y-5 animate-slide-up">
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto" />

        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold text-[#1C1F1A]">Story teilen 📸</h2>
          <p className="text-sm text-gray-500">
            Im nächsten Schritt <strong className="text-[#1C1F1A]">„Instagram Stories"</strong> wählen — das Bild wird direkt in deine Story geladen.
          </p>
        </div>

        {/* Instagram hint */}
        <div className="flex items-center gap-3 bg-pink-50 border border-pink-100 rounded-2xl px-4 py-3">
          <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}>
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <rect width="18" height="18" rx="5" fill="white" fillOpacity="0.2"/>
              <circle cx="9" cy="9" r="3.2" stroke="white" strokeWidth="1.5" fill="none"/>
              <circle cx="13.2" cy="4.8" r="1" fill="white"/>
            </svg>
          </div>
          <p className="text-xs text-gray-600">
            Tippe auf <strong>„Instagram Stories"</strong> im Menü, nicht auf „Instagram" — dann geht das Bild direkt in deine Story.
          </p>
        </div>

        {/* Handle chips */}
        <div className="flex flex-wrap gap-2 justify-center">
          {handles.map(h => (
            <button
              key={h}
              onClick={() => copyHandle(h)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                <defs><linearGradient id="ig" x1="0" y1="18" x2="18" y2="0"><stop stopColor="#f09433"/><stop offset=".25" stopColor="#e6683c"/><stop offset=".5" stopColor="#dc2743"/><stop offset=".75" stopColor="#cc2366"/><stop offset="1" stopColor="#bc1888"/></linearGradient></defs>
                <rect width="18" height="18" rx="5" fill="url(#ig)"/>
                <circle cx="9" cy="9" r="3.2" stroke="white" strokeWidth="1.5" fill="none"/>
                <circle cx="13.2" cy="4.8" r="1" fill="white"/>
              </svg>
              <span className="text-sm font-medium text-[#1C1F1A]">{h}</span>
              <Copy className="w-3 h-3 text-gray-400" />
            </button>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 font-semibold text-sm"
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 rounded-2xl gradient-primary text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <span className="animate-pulse">Wird geteilt…</span> : (
              <><Share2 className="w-4 h-4" />Jetzt teilen</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main inner component
// ─────────────────────────────────────────────────────────────────────────────
function StoryCreateInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const slug         = searchParams.get('restaurant')
  const supabase     = createClient()

  const videoRef           = useRef<HTMLVideoElement>(null)
  const captureCanvas      = useRef<HTMLCanvasElement>(null)
  const galleryInput       = useRef<HTMLInputElement>(null)
  const cameraContainerRef = useRef<HTMLDivElement>(null)

  const [restaurant,   setRestaurant]  = useState<Restaurant | null>(null)
  const [stream,       setStream]      = useState<MediaStream | null>(null)
  const [facingMode,   setFacingMode]  = useState<'user' | 'environment'>('environment')
  const [filter,       setFilter]      = useState<FilterId>('original')
  const [capturedSrc,  setCapturedSrc] = useState<string | null>(null)
  const [textBlocks,   setTextBlocks]  = useState<TextBlock[]>([])
  const [stickerColor, setStickerColor]= useState<StickerColor>('green')
  const [stickerPos,   setStickerPos]  = useState({ x: 0.5, y: 0.42, scale: 1.0 })
  const [showSheet,    setShowSheet]   = useState(false) // kept for compatibility
  const [submitting,   setSubmitting]  = useState(false)
  const [pointsEarned, setPointsEarned]= useState(0)
  const [step, setStep] = useState<'capture' | 'edit' | 'share-options' | 'success'>('capture')
  const [camError, setCamError] = useState(false)
  const [exportedBlob,    setExportedBlob]    = useState<Blob | null>(null)
  const [exportedBlobUrl, setExportedBlobUrl] = useState<string | null>(null)
  const [clipboardCopied, setClipboardCopied] = useState(false)

  const filterCss = FILTERS.find(f => f.id === filter)?.css ?? 'none'

  // ── Load restaurant ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!slug) return
    supabase.from('restaurants').select('*').eq('slug', slug).single()
      .then(({ data }) => { if (data) setRestaurant(data) })
  }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Camera ───────────────────────────────────────────────────────────────
  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    setCamError(false)
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          aspectRatio: 9 / 16,
          width:  { ideal: 1080, max: 4096 },
          height: { ideal: 1920, max: 4096 },
        },
        audio: true,
      })
      setStream(s)
      if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play().catch(() => {}) }
      // Register push after camera permission granted (both are user gestures)
      setupPush()
    } catch {
      setCamError(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    startCamera(facingMode)
    return () => { stream?.getTracks().forEach(t => t.stop()) }
  }, [facingMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Capture ──────────────────────────────────────────────────────────────
  const capturePhoto = () => {
    const video     = videoRef.current
    const canvas    = captureCanvas.current
    const container = cameraContainerRef.current
    if (!video || !canvas) return

    const vW = video.videoWidth  || 1080
    const vH = video.videoHeight || 1920
    const containerW = container?.offsetWidth  ?? 390
    const containerH = container?.offsetHeight ?? 844

    // 1. object-cover: how the video maps onto the full-screen container
    const scaleW = containerW / vW
    const scaleH = containerH / vH
    const coverScale = Math.max(scaleW, scaleH)
    const vidLeft = (containerW - vW * coverScale) / 2
    const vidTop  = (containerH - vH * coverScale) / 2

    // 2. 9:16 safe-zone centred inside the container (this is what gets exported)
    const safeW = Math.min(containerW, containerH * (9 / 16))
    const safeH = Math.min(containerH, containerW * (16 / 9))
    const safeX = (containerW - safeW) / 2
    const safeY = (containerH - safeH) / 2

    // 3. Map safe-zone from container space → video pixel space
    const srcX = (safeX - vidLeft) / coverScale
    const srcY = (safeY - vidTop)  / coverScale
    const srcW = safeW / coverScale
    const srcH = safeH / coverScale

    // 4. Draw to 1080×1920 (Instagram Story resolution)
    canvas.width  = 1080
    canvas.height = 1920
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    if (facingMode === 'user') { ctx.translate(1080, 0); ctx.scale(-1, 1) }
    ctx.filter = filterCss === 'none' ? '' : filterCss
    ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, 1080, 1920)

    stream?.getTracks().forEach(t => t.stop()); setStream(null)
    setCapturedSrc(canvas.toDataURL('image/jpeg', 0.95))
    setStep('edit')
  }

  // ── Helper: submit story to Pistazz API ─────────────────────────────────
  const submitToPlatform = async (blob: Blob) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !restaurant) return
    const file = new File([blob], 'story.jpg', { type: 'image/jpeg' })
    const form = new FormData()
    form.append('restaurant_id', restaurant.id)
    form.append('type', 'instagram_story')
    form.append('file', file)
    const caption = textBlocks.map(b => b.text).filter(Boolean).join(' ')
    if (caption) form.append('caption', caption)
    const res = await fetch('/api/stories/submit', { method: 'POST', body: form })
    if (res.ok) {
      setPointsEarned(restaurant.points_per_story ?? 500)
      await sendPushNotification(user.id)
    }
  }

  // ── Main share handler ───────────────────────────────────────────────────
  const handleExport = async () => {
    if (!capturedSrc || !restaurant) return
    setSubmitting(true)
    try {
      const cW = cameraContainerRef.current?.offsetWidth  ?? 390
      const cH = cameraContainerRef.current?.offsetHeight ?? 844
      const blob = await exportCanvas(
        capturedSrc, filterCss, textBlocks, restaurant.instagram_handle,
        stickerColor, stickerPos.x, stickerPos.y, stickerPos.scale, cW, cH,
      )

      if (exportedBlobUrl) URL.revokeObjectURL(exportedBlobUrl)
      setExportedBlob(blob)
      setExportedBlobUrl(URL.createObjectURL(blob))

      // ── Primär: Web Share API → iOS/Android Share Sheet → User wählt Instagram ──
      const file = new File([blob], 'pistazz-story.jpg', { type: 'image/jpeg' })
      const canShare = typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })
      if (canShare) {
        try {
          await navigator.share({ files: [file], title: 'pistazz Story' })
          // Nach erfolgreichem Share → zur URL-Eingabe weiterleiten
          setSubmitting(false)
          router.push(`/story/submit?restaurant=${slug}&type=instagram_story&shared=true`)
          return
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') {
            // User hat Share-Sheet abgebrochen
            setSubmitting(false)
            return
          }
          // Anderer Fehler → Fallback
        }
      }

      // ── Fallback: Zwischenablage + Instagram öffnen ──
      let ok = false
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/jpeg': blob })])
          ok = true
        } catch { /* Clipboard nicht erlaubt */ }
      }
      setClipboardCopied(ok)
      if (ok) window.location.href = 'instagram://camera'
      setStep('share-options')

    } catch {
      toast.error('Fehler beim Exportieren')
    }
    setSubmitting(false)
  }

  // ── Fallback: Instagram manuell öffnen ──────────────────────────────────
  const handleOpenInstagram = () => {
    window.location.href = 'instagram://camera'
  }

  // ── Punkte einreichen ────────────────────────────────────────────────────
  const handleSubmitToPlatform = async () => {
    if (!exportedBlob) return
    setSubmitting(true)
    try {
      await submitToPlatform(exportedBlob)
      setStep('success')
    } catch {
      toast.error('Fehler beim Einreichen')
    }
    setSubmitting(false)
  }

  const retake = () => {
    setCapturedSrc(null); setTextBlocks([]); setStickerPos({ x: 0.5, y: 0.42, scale: 1.0 })
    if (exportedBlobUrl) { URL.revokeObjectURL(exportedBlobUrl); setExportedBlobUrl(null) }
    setExportedBlob(null)
    setClipboardCopied(false)
    setStep('capture')
    startCamera(facingMode)
  }

  const handleGalleryPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      stream?.getTracks().forEach(t => t.stop()); setStream(null)
      setCapturedSrc(reader.result as string)
      setStep('edit')
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Share options — guided 2-step flow to Instagram
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 'share-options' && exportedBlobUrl) {
    const downloadBlob = () => {
      if (!exportedBlob) return
      const tmp = URL.createObjectURL(exportedBlob)
      Object.assign(document.createElement('a'), { href: tmp, download: 'pistazz-story.jpg' }).click()
      URL.revokeObjectURL(tmp)
    }

    return (
      <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">

        {/* Story-Vorschau */}
        <div className="flex-1 relative overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={exportedBlobUrl} alt="Story-Vorschau" className="absolute inset-0 w-full h-full object-contain" />
          <button
            onClick={() => setStep('edit')}
            className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          className="bg-[#1C1F1A] px-5 pt-5 space-y-3"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 12px) + 12px)' }}
        >
          {clipboardCopied ? (
            /* ── Clipboard-Pfad: Instagram wurde direkt geöffnet ── */
            <>
              <div className="flex flex-col items-center gap-1 text-center pb-1">
                <span className="text-3xl">📸</span>
                <h2 className="text-white font-bold text-base">Instagram wurde geöffnet!</h2>
                <p className="text-white/50 text-xs leading-relaxed">
                  Dein Bild liegt in der Zwischenablage.{'\n'}
                  Instagram fragt dich gleich, ob du es einfügen möchtest.
                </p>
              </div>

              {/* Nochmals öffnen falls nötig */}
              <button
                onClick={handleOpenInstagram}
                className="w-full flex items-center gap-3 bg-white/8 border border-white/12 rounded-2xl px-4 py-3 active:bg-white/15 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg,#f09433 0%,#dc2743 50%,#bc1888 100%)' }}
                >
                  <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                    <circle cx="9" cy="9" r="3.5" stroke="white" strokeWidth="1.5" fill="none"/>
                    <circle cx="13.2" cy="4.8" r="1" fill="white"/>
                    <rect x="1" y="1" width="16" height="16" rx="4.5" stroke="white" strokeWidth="1.5" fill="none"/>
                  </svg>
                </div>
                <div className="text-left flex-1">
                  <p className="text-white font-semibold text-sm">Instagram nochmals öffnen</p>
                  <p className="text-white/45 text-xs">Falls es nicht automatisch geklappt hat</p>
                </div>
                <span className="text-white/30 text-lg">›</span>
              </button>
            </>
          ) : (
            /* ── Fallback: kein Clipboard, manuell ── */
            <>
              <h2 className="text-white font-bold text-base text-center">Story manuell teilen</h2>

              <button
                onClick={downloadBlob}
                className="w-full flex items-center gap-3 bg-white/8 border border-white/12 rounded-2xl px-4 py-3 active:bg-white/15 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-blue-500/25 border border-blue-400/30 flex items-center justify-center text-lg shrink-0">📥</div>
                <div className="text-left flex-1">
                  <p className="text-white font-semibold text-sm">Bild herunterladen</p>
                  <p className="text-white/45 text-xs">Dann Instagram → Story → Galerie</p>
                </div>
                <span className="text-white/30 text-lg">›</span>
              </button>

              <button
                onClick={handleOpenInstagram}
                className="w-full flex items-center gap-3 bg-white/8 border border-white/12 rounded-2xl px-4 py-3 active:bg-white/15 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg,#f09433 0%,#dc2743 50%,#bc1888 100%)' }}
                >
                  <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                    <circle cx="9" cy="9" r="3.5" stroke="white" strokeWidth="1.5" fill="none"/>
                    <circle cx="13.2" cy="4.8" r="1" fill="white"/>
                    <rect x="1" y="1" width="16" height="16" rx="4.5" stroke="white" strokeWidth="1.5" fill="none"/>
                  </svg>
                </div>
                <div className="text-left flex-1">
                  <p className="text-white font-semibold text-sm">Instagram öffnen</p>
                  <p className="text-white/45 text-xs">Story erstellen → Galerie → Bild wählen</p>
                </div>
                <span className="text-white/30 text-lg">›</span>
              </button>
            </>
          )}

          {/* Nach dem Share: zur URL-Eingabe weiterleiten */}
          <button
            onClick={() => router.push(`/story/submit?restaurant=${slug}&type=instagram_story&shared=true`)}
            className="w-full py-3.5 rounded-2xl gradient-primary text-white font-bold text-base flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />Ich habe geteilt — Punkte anfordern →
          </button>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Success
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-[#1C1F1A] to-[#2d5a27] flex flex-col items-center justify-center text-center px-8 gap-6">
        <CheckCircle className="w-20 h-20 text-[#8BB06A]" />
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Story gepostet! 🎉</h1>
          <p className="text-white/70 text-sm">Deine Story wurde eingereicht und wird geprüft.</p>
        </div>
        {pointsEarned > 0 && (
          <div className="bg-white/10 rounded-2xl px-6 py-4 border border-white/20">
            <p className="text-white/60 text-xs mb-1">Punkte eingereicht</p>
            <p className="text-[#8BB06A] text-4xl font-black">+{pointsEarned}</p>
          </div>
        )}
        <button onClick={() => router.push('/home')} className="mt-2 gradient-primary text-white font-bold px-8 py-3 rounded-2xl text-base">
          Zurück zur App
        </button>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Capture + Edit — Instagram-style full-screen camera
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black overflow-hidden">

      {/* Hidden helpers */}
      <input ref={galleryInput} type="file" accept="image/*" className="hidden" onChange={handleGalleryPick} />
      <canvas ref={captureCanvas} className="hidden" />

      {/* ── CAMERA / PHOTO — fills ENTIRE screen ── */}
      <div ref={cameraContainerRef} className="absolute inset-0">

        {/* Live camera feed */}
        {step === 'capture' && !camError && (
          <video ref={videoRef} playsInline muted autoPlay
            disablePictureInPicture
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              transform: facingMode === 'user' ? 'scaleX(-1)' : undefined,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Camera error */}
        {step === 'capture' && camError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white/60 px-8 text-center">
            <CameraOff className="w-12 h-12" />
            <p className="text-sm">Kamerazugriff verweigert.<br />Bitte erlauben und erneut versuchen.</p>
            <button onClick={() => startCamera(facingMode)} className="text-[#8BB06A] underline text-sm">Erneut versuchen</button>
          </div>
        )}

        {/* Captured / gallery image */}
        {step === 'edit' && capturedSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={capturedSrc} alt="" className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: filterCss === 'none' ? undefined : filterCss }} />
        )}

      </div>{/* end camera */}

      {/* ── TOP BAR — always on top ── */}
      <div className="absolute top-0 inset-x-0 z-50 flex items-center justify-between px-4 pt-3 pb-2">
        <button
          onClick={step === 'edit' ? retake : () => router.back()}
          className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white"
        >
          {step === 'edit' ? <RotateCcw className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </button>

        {restaurant && (
          <div className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm border border-white/15 max-w-[160px]">
            <span className="text-white text-xs font-semibold truncate block">{restaurant.name}</span>
          </div>
        )}

        {step === 'capture' ? (
          <button
            onClick={() => setFacingMode(f => f === 'environment' ? 'user' : 'environment')}
            className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white"
          >
            <FlipHorizontal className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={handleExport}
            disabled={submitting}
            className="px-5 py-2 rounded-full gradient-primary text-white text-sm font-bold shadow-lg disabled:opacity-60"
          >
            {submitting ? '…' : 'Teilen →'}
          </button>
        )}
      </div>

      {/* ── EDIT OVERLAYS — z-index between camera and bottom bar ── */}
      {step === 'edit' && (
        <>
          {/* Sticker — draggable, pinch-resizable, double-tap for color */}
          <StickerOverlay
            color={stickerColor} onColorChange={setStickerColor}
            x={stickerPos.x} y={stickerPos.y} scale={stickerPos.scale}
            onUpdate={(x, y, scale) => setStickerPos({ x, y, scale })}
            containerRef={cameraContainerRef}
          />

          {/* Text overlay (Aa button included) */}
          <TextOverlay blocks={textBlocks} onChange={setTextBlocks} />

          {/* @tag pill — above the edit controls (filter strip + share row ≈ 175px) */}
          <div className="absolute inset-x-0 z-20 flex flex-col items-center gap-1.5 pointer-events-none"
            style={{ bottom: '185px' }}>
            {!restaurant?.instagram_handle && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold"
                style={{ background: 'rgba(245,158,11,0.92)', color: '#fff' }}>
                ⚠️ Instagram-Handle fehlt — im Dashboard hinterlegen
              </div>
            )}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold text-[#1C1F1A]"
              style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(8px)' }}>
              <span style={{ color: '#E1306C' }}>▲</span>
              {[
                restaurant?.instagram_handle ? `@${restaurant.instagram_handle.replace(/^@/, '')}` : null,
                '@gastropistazz',
              ].filter(Boolean).join('  ')}
            </div>
          </div>
        </>
      )}

      {/* ── BOTTOM CONTROLS — floats over camera ── */}
      <div
        className="absolute bottom-0 inset-x-0 z-40"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 12px)' }}
      >
        {step === 'capture' ? (
          /* ── CAPTURE: gradient bg so camera shows through, no filter strip ── */
          <div className="bg-gradient-to-t from-black/85 via-black/40 to-transparent pt-6">
            <div className="flex items-center justify-between px-10 pt-2 pb-3">
              <button
                onClick={() => galleryInput.current?.click()}
                className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white/70"
              >
                <ImagePlus className="w-6 h-6" />
              </button>

              <button
                onClick={capturePhoto}
                disabled={camError}
                className="w-[78px] h-[78px] rounded-full border-[4px] border-white flex items-center justify-center disabled:opacity-30"
              >
                <div className="w-[62px] h-[62px] rounded-full bg-white" />
              </button>

              <div className="w-14 h-14" />
            </div>
            <div className="flex justify-center pb-3">
              <span className="text-white font-bold text-[13px] tracking-[0.15em] uppercase">Story</span>
            </div>
          </div>
        ) : (
          /* ── EDIT: filter strip + share controls (gradient so photo shows through) ── */
          <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent">
            <div className="pt-3 pb-1">
              <FilterStrip selected={filter} onChange={setFilter} previewSrc={capturedSrc} />
            </div>
            <div className="flex items-center gap-3 px-5 pb-3 pt-2">
              <button onClick={retake}
                className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/70">
                <RotateCcw className="w-5 h-5" />
              </button>
              {/* Export → guided share-options step */}
              <button
                onClick={handleExport}
                disabled={submitting}
                className="flex-1 h-12 rounded-2xl gradient-primary text-white font-bold text-base flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting
                  ? <span className="animate-pulse text-sm">Wird vorbereitet…</span>
                  : <><Share2 className="w-5 h-5" />Auf Instagram teilen</>
                }
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

export default function StoryCreatePage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-black" />}>
      <StoryCreateInner />
    </Suspense>
  )
}
