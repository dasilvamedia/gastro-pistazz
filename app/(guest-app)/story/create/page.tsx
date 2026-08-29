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
type StickerColor = 'green' | 'white' | 'black' | 'glass' | 'sunset' | 'beige'
const STICKER_STYLES: Record<StickerColor, { bg: string; grad?: [string, string]; text: string; border: string }> = {
  green:      { bg: '#8BB06A',                 text: '#ffffff', border: 'rgba(255,255,255,0.3)' },
  white:      { bg: '#ffffff',                 text: '#1C1F1A', border: 'rgba(0,0,0,0.12)' },
  black:      { bg: '#1C1F1A',                 text: '#ffffff', border: 'rgba(255,255,255,0.15)' },
  glass:      { bg: 'rgba(255,255,255,0.22)',  text: '#ffffff', border: 'rgba(255,255,255,0.45)' },
  sunset:     { bg: '#f09433', grad: ['#f09433', '#bc1888'], text: '#ffffff', border: 'rgba(255,255,255,0.35)' },
  beige:      { bg: '#F2EDE0',                 text: '#577A3D', border: 'rgba(87,122,61,0.25)' },
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

      // 1. Foto OHNE Beschneiden einpassen (contain); dahinter weicher Blur-Hintergrund
      const iW = img.naturalWidth  || 1080
      const iH = img.naturalHeight || 1920

      // Hintergrund: Bild als Cover + kraeftiger Blur (wie Instagram)
      const cScale = Math.max(W / iW, H / iH)
      ctx.filter = 'blur(48px)'
      ctx.drawImage(img, (W - iW * cScale) / 2, (H - iH * cScale) / 2, iW * cScale, iH * cScale)
      ctx.filter = ''
      ctx.fillStyle = 'rgba(0,0,0,0.18)'
      ctx.fillRect(0, 0, W, H)

      // Vordergrund: das komplette Original, scharf und unbeschnitten
      const fScale = Math.min(W / iW, H / iH)
      const dW = iW * fScale, dH = iH * fScale
      ctx.filter = filterCss === 'none' ? '' : filterCss
      ctx.drawImage(img, (W - dW) / 2, (H - dH) / 2, dW, dH)
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
      const baseW = W * 0.44, baseH = H * 0.082
      const sW = baseW * stickerScale
      const sH = baseH * stickerScale
      const sX = sCx - sW / 2
      const sY = sCy - sH / 2
      // Weicher Schatten fuer den "Sticker liegt auf dem Foto"-Look
      ctx.shadowColor   = 'rgba(0,0,0,0.35)'
      ctx.shadowBlur    = 28
      ctx.shadowOffsetY = 10
      if (stStyle.grad) {
        const g = ctx.createLinearGradient(sX, sY, sX + sW, sY + sH)
        g.addColorStop(0, stStyle.grad[0])
        g.addColorStop(1, stStyle.grad[1])
        ctx.fillStyle = g
      } else {
        ctx.fillStyle = stStyle.bg
      }
      ctx.beginPath()
      ctx.roundRect(sX, sY, sW, sH, sH * 0.32)
      ctx.fill()
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetY = 0
      ctx.strokeStyle = stStyle.border
      ctx.lineWidth   = 2
      ctx.stroke()

      ctx.fillStyle    = stStyle.text + 'B3'
      ctx.font         = `600 ${W * 0.019 * stickerScale}px -apple-system, sans-serif`
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('P O W E R E D  B Y', sCx, sY + sH * 0.30)

      ctx.fillStyle = stStyle.text
      ctx.font      = `bold ${W * 0.040 * stickerScale}px 'DM Serif Display', Georgia, serif`
      ctx.fillText('gastro.pistazz.io', sCx, sY + sH * 0.68)

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
  const COLORS: StickerColor[] = ['green', 'white', 'black', 'glass', 'sunset', 'beige']
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
      onDoubleClick={() => { const i = COLORS.indexOf(color); onColorChange(COLORS[(i + 1) % COLORS.length]) }}
    >
      <div
        className="rounded-2xl px-5 py-2 flex flex-col items-center gap-0 border shadow-xl"
        style={{
          background: s.grad ? `linear-gradient(135deg, ${s.grad[0]}, ${s.grad[1]})` : s.bg,
          borderColor: s.border,
          ...(color === 'glass' ? { backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' } : {}),
        }}
      >
        <span className="text-[7px] font-semibold tracking-[0.25em] uppercase" style={{ color: s.text, opacity: 0.7 }}>Powered by</span>
        <span className="font-serif text-lg font-bold leading-tight" style={{ color: s.text }}>gastro.pistazz.io</span>
      </div>
      <p className="text-center text-white/45 text-[9px] mt-1 leading-tight">
        Ziehen · 2× Tippen = Stil
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
    '@gastro.pistazz.io',
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
  // Kann die native App das Bild direkt an Instagram uebergeben? (Build >= 6)
  const [hasNativeIG, setHasNativeIG] = useState(false)
  useEffect(() => {
    const w = window as unknown as { Capacitor?: { Plugins?: { InstagramStory?: unknown } } }
    setHasNativeIG(!!w.Capacitor?.Plugins?.InstagramStory)
  }, [])
  const [stickerPos,   setStickerPos]  = useState({ x: 0.5, y: 0.42, scale: 1.0 })
  const [showSheet,    setShowSheet]   = useState(false) // kept for compatibility
  const [submitting,   setSubmitting]  = useState(false)
  const [pointsEarned, setPointsEarned]= useState(0)
  const [step, setStep] = useState<'capture' | 'edit' | 'share-options' | 'video-share' | 'success'>('capture')
  const [copiedTags, setCopiedTags] = useState<Record<string, boolean>>({})
  const [howtoDismissed, setHowtoDismissed] = useState(() =>
    typeof window !== 'undefined' && sessionStorage.getItem('storyHowto') === '1')
  const [camError, setCamError] = useState(false)
  const [exportedBlob,    setExportedBlob]    = useState<Blob | null>(null)
  const [exportedBlobUrl, setExportedBlobUrl] = useState<string | null>(null)

  // ── Kamera-Features: Modi, Zoom, Belichtung, Video, Boomerang ────────────
  const [captureMode, setCaptureMode] = useState<'boomerang' | 'story' | 'video'>('story')
  const [zoom, setZoom]               = useState(1)   // UI-Wert 1..5
  const [cssZoom, setCssZoom]         = useState(1)   // nur wenn kein nativer Zoom
  const [brightness, setBrightness]   = useState(1)   // Belichtung (Preview + Foto)
  const [focusPt, setFocusPt]         = useState<{ x: number; y: number; key: number } | null>(null)
  const [recording, setRecording]     = useState(false)
  const [recSecs, setRecSecs]         = useState(0)
  const [boomBusy, setBoomBusy]       = useState(false)
  const [capturedVideo, setCapturedVideo] = useState<{ url: string; blob: Blob; mime: string } | null>(null)
  const recorderRef   = useRef<MediaRecorder | null>(null)
  const recChunksRef  = useRef<Blob[]>([])
  const recTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const holdTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const holdActiveRef = useRef(false)
  const lastTapRef    = useRef(0)
  const singleTapRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pinchRef      = useRef({ d: 0, z: 1 })
  const focusHideRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const filterCss = FILTERS.find(f => f.id === filter)?.css ?? 'none'

  // ── Auth-Guard: ohne Login zur Registrierung (verhindert Unauthorized am Flow-Ende) ──
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace(slug ? `/register?restaurant=${slug}` : '/register')
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
      // Portrait-Ideals (1080x1920): ohne Constraints liefert iOS oft nur
      // 640x480 - im 9:16-Cover-Container wirkt das stark gezoomt UND
      // unscharf. Mit Hochformat-Ideals kommt der native 1x-Weitwinkel in
      // voller Aufloesung. Audio fuer Video-Aufnahmen gleich mit anfragen
      // (Fallback ohne Ton, falls Mikrofon abgelehnt wird).
      const videoC = { facingMode: facing, width: { ideal: 1080 }, height: { ideal: 1920 } }
      const s = await navigator.mediaDevices
        .getUserMedia({ video: videoC, audio: true })
        .catch(() => navigator.mediaDevices.getUserMedia({ video: videoC }))
      setStream(s)
      setZoom(1); setCssZoom(1); setBrightness(1); setFocusPt(null)
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
    let srcX = (safeX - vidLeft) / coverScale
    let srcY = (safeY - vidTop)  / coverScale
    let srcW = safeW / coverScale
    let srcH = safeH / coverScale

    // CSS-Zoom (Geraete ohne nativen Kamera-Zoom): Ausschnitt um die Mitte
    // verkleinern, damit das Foto exakt dem gezoomten Preview entspricht
    if (cssZoom > 1) {
      const nw = srcW / cssZoom, nh = srcH / cssZoom
      srcX += (srcW - nw) / 2; srcY += (srcH - nh) / 2
      srcW = nw; srcH = nh
    }

    // 4. Draw to 1080×1920 (Instagram Story resolution)
    canvas.width  = 1080
    canvas.height = 1920
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    if (facingMode === 'user') { ctx.translate(1080, 0); ctx.scale(-1, 1) }
    // Belichtungs-Anpassung (Tap auf die Flaeche) wird ins Foto eingebacken
    const bFilter = brightness !== 1 ? `brightness(${brightness})` : ''
    const combined = [filterCss === 'none' ? '' : filterCss, bFilter].filter(Boolean).join(' ')
    ctx.filter = combined || 'none'
    ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, 1080, 1920)

    stream?.getTracks().forEach(t => t.stop()); setStream(null)
    setCapturedSrc(canvas.toDataURL('image/jpeg', 0.95))
    setStep('edit')
  }

  // ── Zoom: nativ (iOS 17+) wenn moeglich, sonst CSS + Export-Crop ─────────
  const applyZoom = useCallback((z: number) => {
    const clamped = Math.min(5, Math.max(1, z))
    setZoom(clamped)
    const track = stream?.getVideoTracks()[0]
    const caps = track?.getCapabilities?.() as (MediaTrackCapabilities & { zoom?: { min: number; max: number } }) | undefined
    if (track && caps?.zoom) {
      const nz = Math.min(caps.zoom.max, Math.max(caps.zoom.min, caps.zoom.min * clamped))
      track.applyConstraints({ advanced: [{ zoom: nz } as unknown as MediaTrackConstraintSet] }).catch(() => setCssZoom(clamped))
      setCssZoom(1)
    } else {
      setCssZoom(clamped)
    }
  }, [stream])

  // ── Tap = AE/AF + Belichtungsregler, Doppel-Tap = Kamera wechseln,
  //    Pinch = Zoom ─────────────────────────────────────────────────────────
  const handleViewTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length >= 2) {
      pinchRef.current = {
        d: Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY),
        z: zoom,
      }
    }
  }
  const handleViewTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length >= 2 && pinchRef.current.d > 0) {
      const d = Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY)
      applyZoom(pinchRef.current.z * (d / pinchRef.current.d))
    }
  }
  const handleViewTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      // Doppel-Tap: Front/Back wechseln
      lastTapRef.current = 0
      if (singleTapRef.current) { clearTimeout(singleTapRef.current); singleTapRef.current = null }
      setFacingMode(f => (f === 'environment' ? 'user' : 'environment'))
      return
    }
    lastTapRef.current = now
    const rect = e.currentTarget.getBoundingClientRect()
    const nx = (e.clientX - rect.left) / rect.width
    const ny = (e.clientY - rect.top) / rect.height
    singleTapRef.current = setTimeout(() => {
      setFocusPt({ x: nx, y: ny, key: Date.now() })
      // Nativer AE/AF-Versuch (wo unterstuetzt); Belichtungsregler erscheint immer
      const track = stream?.getVideoTracks()[0]
      const caps = track?.getCapabilities?.() as (MediaTrackCapabilities & { focusMode?: string[] }) | undefined
      if (track && caps?.focusMode?.length) {
        track.applyConstraints({
          advanced: [{ focusMode: 'single-shot', pointsOfInterest: [{ x: nx, y: ny }] } as unknown as MediaTrackConstraintSet],
        }).catch(() => {})
      }
      if (focusHideRef.current) clearTimeout(focusHideRef.current)
      focusHideRef.current = setTimeout(() => setFocusPt(null), 3000)
    }, 300)
  }

  // ── Video-Aufnahme (Halten in STORY, Freihand-Toggle in VIDEO) ───────────
  const stopRecording = useCallback(() => {
    if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop()
    setRecording(false)
  }, [])

  const startRecording = useCallback(() => {
    if (!stream || recording) return
    const mime = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/mp4')
      ? 'video/mp4' : 'video/webm'
    let rec: MediaRecorder
    try { rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 }) }
    catch { toast.error('Videoaufnahme wird auf diesem Gerät nicht unterstützt'); return }
    recChunksRef.current = []
    rec.ondataavailable = ev => { if (ev.data.size > 0) recChunksRef.current.push(ev.data) }
    rec.onstop = () => {
      const blob = new Blob(recChunksRef.current, { type: mime })
      if (blob.size < 60_000) return // versehentlicher Kurz-Tap
      setCapturedVideo(prev => { if (prev) URL.revokeObjectURL(prev.url); return { url: URL.createObjectURL(blob), blob, mime } })
      setStep('video-share')
    }
    rec.start(250)
    recorderRef.current = rec
    setRecording(true)
    setRecSecs(0)
    recTimerRef.current = setInterval(() => {
      setRecSecs(s => {
        if (s + 1 >= 15) stopRecording() // Instagram-Story-Limit
        return s + 1
      })
    }, 1000)
  }, [stream, recording, stopRecording])

  const handleShutterDown = () => {
    if (captureMode !== 'story') return
    holdActiveRef.current = false
    holdTimerRef.current = setTimeout(() => { holdActiveRef.current = true; startRecording() }, 280)
  }
  const handleShutterUp = () => {
    if (captureMode === 'story') {
      if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null }
      if (holdActiveRef.current) stopRecording()
      else capturePhoto()
    } else if (captureMode === 'video') {
      // Freihand: Tippen startet/stoppt
      if (recording) stopRecording()
      else startRecording()
    } else {
      captureBoomerang()
    }
  }

  // ── Boomerang: 1s Frames einfangen, vor+zurueck als kurzes Video encoden ─
  const captureBoomerang = async () => {
    const video = videoRef.current
    if (!video || boomBusy || recording) return
    setBoomBusy(true)
    try {
      const W = 720, H = 1280
      const vW = video.videoWidth || 1080, vH = video.videoHeight || 1920
      const cover = Math.max(W / vW, H / vH)
      const sw = W / cover, sh = H / cover
      let sx = (vW - sw) / 2, sy = (vH - sh) / 2
      if (cssZoom > 1) {
        const nw = sw / cssZoom, nh = sh / cssZoom
        sx += (sw - nw) / 2; sy += (sh - nh) / 2
      }
      const zw = cssZoom > 1 ? sw / cssZoom : sw
      const zh = cssZoom > 1 ? sh / cssZoom : sh

      const frames: HTMLCanvasElement[] = []
      const FRAME_N = 18
      for (let i = 0; i < FRAME_N; i++) {
        const c = document.createElement('canvas'); c.width = W; c.height = H
        const cx = c.getContext('2d')!
        if (facingMode === 'user') { cx.translate(W, 0); cx.scale(-1, 1) }
        cx.filter = brightness !== 1 ? `brightness(${brightness})` : 'none'
        cx.drawImage(video, sx, sy, zw, zh, 0, 0, W, H)
        frames.push(c)
        await new Promise(r => setTimeout(r, 55))
      }

      const out = document.createElement('canvas'); out.width = W; out.height = H
      const octx = out.getContext('2d')!
      const st = (out as HTMLCanvasElement & { captureStream: (fps: number) => MediaStream }).captureStream(30)
      const mime = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm'
      const rec = new MediaRecorder(st, { mimeType: mime, videoBitsPerSecond: 5_000_000 })
      const chunks: Blob[] = []
      rec.ondataavailable = ev => { if (ev.data.size > 0) chunks.push(ev.data) }
      const finished = new Promise<Blob>(res => { rec.onstop = () => res(new Blob(chunks, { type: mime })) })
      rec.start(250)
      const seq = [...frames, ...frames.slice(1, -1).reverse()]
      for (let loop = 0; loop < 3; loop++) {
        for (const f of seq) { octx.drawImage(f, 0, 0); await new Promise(r => setTimeout(r, 34)) }
      }
      rec.stop()
      const blob = await finished
      setCapturedVideo(prev => { if (prev) URL.revokeObjectURL(prev.url); return { url: URL.createObjectURL(blob), blob, mime } })
      setStep('video-share')
    } catch {
      toast.error('Boomerang fehlgeschlagen — bitte nochmal versuchen')
    }
    setBoomBusy(false)
  }

  // ── Video an Instagram uebergeben (nativ, sonst System-Share) ────────────
  const shareVideoToIG = async () => {
    if (!capturedVideo) return
    const native = (window as unknown as {
      Capacitor?: { Plugins?: { InstagramStory?: { shareVideo?: (o: { base64: string; appId?: string }) => Promise<{ shared: boolean }> } } }
    }).Capacitor?.Plugins?.InstagramStory
    if (native?.shareVideo) {
      try {
        const base64 = await new Promise<string>((res, rej) => {
          const r = new FileReader()
          r.onload = () => res((r.result as string).split(',')[1])
          r.onerror = rej
          r.readAsDataURL(capturedVideo.blob)
        })
        const out = await native.shareVideo({ base64, appId: process.env.NEXT_PUBLIC_META_APP_ID ?? '1100803475748097' })
        if (out?.shared) return
      } catch { /* Fallback unten */ }
    }
    const ext = capturedVideo.mime.includes('mp4') ? 'mp4' : 'webm'
    const file = new File([capturedVideo.blob], `pistazz-story.${ext}`, { type: capturedVideo.mime })
    if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'pistazz Story' }); return } catch { /* abgebrochen */ }
    }
    window.location.href = 'instagram://camera'
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

      // ── Android: natives Share-Sheet funktioniert dort zuverlaessig, Instagram
      //    erscheint als direktes Ziel. iOS: Instagram registriert sich NICHT im
      //    System-Share-Sheet fuer Bilder aus Web-Apps (getestet, kein IG-Icon
      //    dort) — bis der native Plugin-Weg in einem App-Update ausgeliefert ist,
      //    bleibt "in Fotos sichern + manuell auswaehlen" der einzige zuverlaessige Weg. ──
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

      if (!isIOS) {
        const file = new File([blob], 'pistazz-story.jpg', { type: 'image/jpeg' })
        const canShare = typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })
        if (canShare) {
          try {
            await navigator.share({ files: [file], title: 'pistazz Story' })
            setSubmitting(false)
            router.push(`/story/submit?restaurant=${slug}&type=instagram_story&shared=true`)
            return
          } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
              setSubmitting(false)
              return
            }
          }
        }
      }

      setStep('share-options')

    } catch {
      toast.error('Fehler beim Exportieren')
    }
    setSubmitting(false)
  }

  // ── Instagram öffnen: nativ mit Bild-Uebergabe (sobald App-Build mit
  //    InstagramStoryPlugin live ist), sonst manueller Weg ueber die Galerie.
  //    (Web Share-Sheet UND Zwischenablage+Deep-Link wurden getestet — Instagram
  //    registriert sich auf iOS bei keinem der beiden Wege als Ziel.) ──
  const handleOpenInstagram = async () => {
    const native = (window as unknown as {
      Capacitor?: { Plugins?: { InstagramStory?: { share: (o: { base64: string; appId?: string }) => Promise<{ shared: boolean }> } } }
    }).Capacitor?.Plugins?.InstagramStory
    if (native && exportedBlob) {
      try {
        const base64 = await new Promise<string>((res, rej) => {
          const r = new FileReader()
          r.onload = () => res((r.result as string).split(',')[1])
          r.onerror = rej
          r.readAsDataURL(exportedBlob)
        })
        const out = await native.share({ base64, appId: process.env.NEXT_PUBLIC_META_APP_ID ?? '1100803475748097' })
        if (out?.shared) return
      } catch { /* Fallback unten */ }
    }

    // Manueller Weg: Bild oben wurde per Gedrueckthalten in Fotos gesichert —
    // Instagram-Kamera oeffnen, dort unten links das Galerie-Symbol antippen
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
    if (capturedVideo) { URL.revokeObjectURL(capturedVideo.url); setCapturedVideo(null) }
    stopRecording()
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
          <img src={exportedBlobUrl} alt="Story-Vorschau" className="absolute inset-0 w-full h-full object-contain" style={{ WebkitTouchCallout: 'default', WebkitUserSelect: 'auto', touchAction: 'auto' } as React.CSSProperties} />
          <button
            onClick={() => setStep('edit')}
            className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          className="bg-[#1C1F1A] px-5 pt-4 space-y-2.5"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 12px) + 12px)' }}
        >
          {/* Tags: fuer die Punkte muessen beide als Erwaehnung in die Story */}
          <p className="text-white/80 text-[13px] leading-snug text-center">
            Vergiss nicht: Füge <strong className="text-white">beide Tags</strong> in deine Story ein. Dafür gibt es deine Punkte!
          </p>
          <div className="flex gap-2">
            {[restaurant?.instagram_handle ? `@${restaurant.instagram_handle.replace(/^@+/, '')}` : null, '@gastro.pistazz.io'].filter((t): t is string => !!t).map(tag => {
              const done = !!copiedTags[tag]
              return (
                <button
                  key={tag}
                  onClick={async () => {
                    try { await navigator.clipboard.writeText(tag); setCopiedTags(prev => ({ ...prev, [tag]: true })) } catch {}
                  }}
                  className={`flex-1 min-w-0 flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 border transition-colors ${
                    done ? 'bg-[#8BB06A]/15 border-[#8BB06A]/50 active:bg-[#8BB06A]/25' : 'bg-white/8 border-white/15 active:bg-white/15'
                  }`}
                >
                  <span className="text-white font-bold text-[13px] truncate">{tag}</span>
                  <span className={`text-[11px] font-semibold shrink-0 flex items-center gap-1 ${done ? 'text-[#8BB06A]' : 'text-white/60'}`}>
                    {done ? <><CheckCircle className="w-3.5 h-3.5" />Kopiert</> : 'Kopieren'}
                  </span>
                </button>
              )
            })}
          </div>
          <p className="text-white/45 text-[11px] leading-snug text-center px-2">
            In Instagram einfügen, dann in der Vorschlagsliste den <strong className="text-white/70">Account antippen</strong> — nicht nur eintippen, sonst zählt der Tag nicht.
          </p>

          {hasNativeIG ? (
            /* Direkte Bild-Uebergabe: kein Speichern, kein Galerie-Umweg */
            <p className="text-[#8BB06A] text-[12px] leading-snug text-center">
              ✨ Dein Bild wird <strong>automatisch an Instagram übergeben</strong> — einfach unten tippen.
            </p>
          ) : (
            /* Manueller Weg fuer aeltere App-Versionen / Web */
            <div className="rounded-xl bg-amber-500/15 border border-amber-400/30 px-3 py-2.5">
              <p className="text-amber-200 text-[12px] leading-snug">
                <strong className="text-amber-100">1.</strong> Bild oben gedrückt halten und sichern &nbsp;
                <strong className="text-amber-100">2.</strong> Instagram öffnen (Button unten) &nbsp;
                <strong className="text-amber-100">3.</strong> Dort unten links das Galerie-Symbol antippen und das Bild wählen
              </p>
            </div>
          )}

          <button
            onClick={handleOpenInstagram}
            className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 active:opacity-80 transition-opacity"
            style={{ background: 'linear-gradient(90deg,#f09433 0%,#dc2743 55%,#bc1888 100%)' }}
          >
            <svg width="24" height="24" viewBox="0 0 18 18" fill="none" className="shrink-0">
              <circle cx="9" cy="9" r="3.5" stroke="white" strokeWidth="1.5" fill="none"/>
              <circle cx="13.2" cy="4.8" r="1" fill="white"/>
              <rect x="1" y="1" width="16" height="16" rx="4.5" stroke="white" strokeWidth="1.5" fill="none"/>
            </svg>
            <span className="text-white font-bold text-base flex-1 text-left">{hasNativeIG ? 'Story in Instagram öffnen' : 'Instagram öffnen'}</span>
            <span className="text-white/70 text-lg">›</span>
          </button>

          <button
            onClick={() => router.push(`/story/submit?restaurant=${slug}&type=instagram_story&shared=true`)}
            className="w-full py-3.5 rounded-2xl gradient-primary text-white font-bold text-base flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />Geteilt? Punkte anfordern
          </button>

          <button
            onClick={retake}
            className="w-full py-2 text-white/45 text-xs font-medium flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Story gefällt dir nicht? <span className="text-white/75 underline">Neu aufnehmen</span>
          </button>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Success
  // ─────────────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────
  // Render: Video/Boomerang-Vorschau + Teilen
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 'video-share' && capturedVideo) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">
        <div className="flex-1 relative overflow-hidden">
          <video
            src={capturedVideo.url}
            autoPlay loop muted playsInline
            className="absolute inset-0 w-full h-full object-contain"
          />
          <button
            onClick={retake}
            className="absolute left-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white z-10"
            style={{ top: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div
          className="bg-[#1C1F1A] px-5 pt-4 space-y-2.5"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 12px) + 12px)' }}
        >
          <p className="text-white/80 text-[13px] leading-snug text-center">
            Füge in Instagram <strong className="text-white">beide Tags</strong> hinzu — dafür gibt es deine Punkte:{' '}
            {restaurant?.instagram_handle ? <strong className="text-white">@{restaurant.instagram_handle.replace(/^@+/, '')}</strong> : null} <strong className="text-white">@gastro.pistazz.io</strong>
          </p>
          <button
            onClick={shareVideoToIG}
            className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 active:opacity-80 transition-opacity"
            style={{ background: 'linear-gradient(90deg,#f09433 0%,#dc2743 55%,#bc1888 100%)' }}
          >
            <svg width="24" height="24" viewBox="0 0 18 18" fill="none" className="shrink-0">
              <circle cx="9" cy="9" r="3.5" stroke="white" strokeWidth="1.5" fill="none"/>
              <circle cx="13.2" cy="4.8" r="1" fill="white"/>
              <rect x="1" y="1" width="16" height="16" rx="4.5" stroke="white" strokeWidth="1.5" fill="none"/>
            </svg>
            <span className="text-white font-bold text-base flex-1 text-left">Video in Instagram teilen</span>
            <span className="text-white/70 text-lg">›</span>
          </button>
          <button
            onClick={() => router.push(`/story/submit?restaurant=${slug}&type=instagram_story&shared=true`)}
            className="w-full py-3.5 rounded-2xl gradient-primary text-white font-bold text-base flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />Geteilt? Punkte anfordern
          </button>
          <button
            onClick={retake}
            className="w-full py-2 text-white/45 text-xs font-medium flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Neu aufnehmen
          </button>
        </div>
      </div>
    )
  }

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
    <div className="fixed inset-0 bg-black overflow-hidden" style={{ touchAction: 'none', overscrollBehavior: 'none' }}>

      {/* Hidden helpers */}
      <input ref={galleryInput} type="file" accept="image/*" className="hidden" onChange={handleGalleryPick} />
      <canvas ref={captureCanvas} className="hidden" />

      {/* ── CAMERA / PHOTO — echtes Story-Format 9:16, zentriert (WYSIWYG zum Export) ── */}
      <div className="absolute inset-0 flex items-center justify-center">
      <div
        ref={cameraContainerRef}
        className="relative overflow-hidden rounded-2xl"
        style={{ aspectRatio: '9 / 16', maxWidth: '100%', maxHeight: '100%', width: 'auto', height: '100%' }}
      >

        {/* Live camera feed */}
        {step === 'capture' && !camError && (
          <video ref={videoRef} playsInline muted autoPlay
            disablePictureInPicture
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              transform: `scale(${facingMode === 'user' ? -cssZoom : cssZoom}, ${cssZoom})`,
              filter: brightness !== 1 ? `brightness(${brightness})` : undefined,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Gesten-Flaeche: Tap = AE/AF, Doppel-Tap = Kamera wechseln, Pinch = Zoom */}
        {step === 'capture' && !camError && (
          <div
            className="absolute inset-0 z-10"
            onTouchStart={handleViewTouchStart}
            onTouchMove={handleViewTouchMove}
            onClick={handleViewTap}
          >
            {/* AE/AF-Rahmen */}
            {focusPt && (
              <div
                key={focusPt.key}
                className="absolute w-[72px] h-[72px] -ml-9 -mt-9 rounded-lg border-2 border-yellow-300 pointer-events-none animate-[fadeIn_0.15s_ease-out]"
                style={{ left: `${focusPt.x * 100}%`, top: `${focusPt.y * 100}%`, boxShadow: '0 0 12px rgba(0,0,0,0.4)' }}
              />
            )}
            {/* Belichtungsregler (erscheint nach Tap) */}
            {focusPt && (
              <div
                className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2"
                onClick={e => e.stopPropagation()}
              >
                <span className="text-yellow-300 text-lg leading-none">☀︎</span>
                <input
                  type="range" min={0.4} max={1.6} step={0.05} value={brightness}
                  onChange={e => {
                    setBrightness(parseFloat(e.target.value))
                    if (focusHideRef.current) clearTimeout(focusHideRef.current)
                    focusHideRef.current = setTimeout(() => setFocusPt(null), 3000)
                  }}
                  className="accent-yellow-300"
                  style={{ writingMode: 'vertical-lr' as never, direction: 'rtl', height: 140, width: 28 }}
                />
              </div>
            )}
            {/* Zoom-Anzeige */}
            {zoom > 1.05 && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-black/50 text-white text-xs font-semibold pointer-events-none">
                {zoom.toFixed(1)}×
              </div>
            )}
            {/* Aufnahme-Timer */}
            {recording && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-red-600/90 text-white text-xs font-bold pointer-events-none flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                0:{String(recSecs).padStart(2, '0')}
              </div>
            )}
          </div>
        )}

        {/* Camera error */}
        {step === 'capture' && camError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white/70 px-8 text-center">
            <CameraOff className="w-12 h-12" />
            <div>
              <p className="text-white font-bold text-base mb-1">Kamera erlauben</p>
              <p className="text-sm text-white/55">Für deine Story brauchen wir kurz Zugriff auf die Kamera.</p>
            </div>
            <button onClick={() => startCamera(facingMode)} className="gradient-primary text-white font-bold px-6 py-3 rounded-2xl text-sm">
              Kamera aktivieren
            </button>
            <button onClick={() => galleryInput.current?.click()} className="text-[#8BB06A] underline text-sm">
              Oder Bild aus der Galerie wählen
            </button>
          </div>
        )}

        {/* Captured / gallery image */}
        {step === 'edit' && capturedSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={capturedSrc} alt="" className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: filterCss === 'none' ? undefined : filterCss }} />
        )}

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

        </>
      )}

      </div>
      </div>{/* end camera */}

      {/* ── TOP BAR — always on top ── */}
      <div
        className="absolute top-0 inset-x-0 z-50 flex items-center justify-between px-4 pb-2"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}
      >
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
          <div className="w-11 h-11" />
        )}
      </div>

      {/* ── SO GIBT'S PUNKTE: Anleitung vor dem Erstellen ── */}
      {step === 'capture' && !howtoDismissed && (
        <div className="absolute inset-x-4 z-40" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 68px)' }}>
          <div className="rounded-2xl bg-black/70 backdrop-blur-md border border-white/15 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-white font-bold text-sm">So bekommst du deine Punkte</p>
              <button
                onClick={() => { setHowtoDismissed(true); sessionStorage.setItem('storyHowto', '1') }}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/70"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ol className="space-y-1.5 text-white/80 text-[13px] leading-snug">
              <li><strong className="text-white">1.</strong> Foto aufnehmen und Sticker platzieren</li>
              <li><strong className="text-white">2.</strong> Bild sichern und in Instagram als Story teilen</li>
              <li><strong className="text-white">3.</strong> Zurück in der App: Kassenbon fotografieren (Beweis, dass du vor Ort bist)</li>
              <li><strong className="text-white">4.</strong> Punkte anfordern. Fertig!</li>
            </ol>
          </div>
        </div>
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

              {/* Ausloeser: Tap = Foto (Story) / Start-Stopp (Video, freihaendig) /
                  Boomerang. Halten in STORY = Video aufnehmen wie bei Instagram. */}
              <button
                onPointerDown={handleShutterDown}
                onPointerUp={handleShutterUp}
                onPointerCancel={() => { if (holdTimerRef.current) clearTimeout(holdTimerRef.current); if (holdActiveRef.current) stopRecording() }}
                disabled={camError || boomBusy}
                className={`w-[78px] h-[78px] rounded-full border-[4px] flex items-center justify-center disabled:opacity-30 transition-colors ${
                  recording ? 'border-red-500' : 'border-white'
                }`}
              >
                {boomBusy ? (
                  <span className="w-8 h-8 border-[3px] border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <div className={`rounded-full transition-all duration-200 ${
                    recording ? 'w-8 h-8 rounded-lg bg-red-500' :
                    captureMode === 'video' ? 'w-[62px] h-[62px] bg-red-500' :
                    captureMode === 'boomerang' ? 'w-[62px] h-[62px] bg-white flex items-center justify-center' :
                    'w-[62px] h-[62px] bg-white'
                  }`}>
                    {!recording && captureMode === 'boomerang' && <span className="text-black text-xl font-black">∞</span>}
                  </div>
                )}
              </button>

              <div className="w-14 h-14" />
            </div>
            {/* Modus-Auswahl wie bei Instagram */}
            <div className="flex justify-center items-center gap-6 pb-3">
              {([['boomerang', 'Boomerang'], ['story', 'Story'], ['video', 'Video']] as const).map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => { if (!recording) setCaptureMode(m) }}
                  className={`text-[13px] tracking-[0.15em] uppercase transition-all ${
                    captureMode === m ? 'text-white font-bold scale-105' : 'text-white/45 font-semibold'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {captureMode === 'story' && !recording && (
              <p className="text-center text-white/40 text-[10px] pb-2 -mt-1">Halten für Video · Tippen für Foto</p>
            )}
          </div>
        ) : (
          /* ── EDIT: filter strip + share controls (gradient so photo shows through) ── */
          <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent">
            <div className="pt-3 pb-1" style={{ touchAction: 'pan-x' }}>
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
