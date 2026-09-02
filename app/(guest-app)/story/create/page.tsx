'use client'

import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
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
// CSS-Filter auf Canvas: WebKit (iOS-App) ignoriert ctx.filter stillschweigend —
// deshalb einmal testen und andernfalls die Filterkette (brightness/contrast/
// saturate/sepia/grayscale/hue-rotate) pixelgenau selbst rechnen. Nur so ist
// der Export garantiert identisch mit der CSS-Vorschau.
// ─────────────────────────────────────────────────────────────────────────────
let _ctxFilterOk: boolean | null = null
function ctxFilterSupported(): boolean {
  if (_ctxFilterOk !== null) return _ctxFilterOk
  try {
    const c = document.createElement('canvas'); c.width = c.height = 1
    const x = c.getContext('2d')!
    x.filter = 'brightness(0.5)'
    _ctxFilterOk = x.filter === 'brightness(0.5)'
  } catch { _ctxFilterOk = false }
  return _ctxFilterOk
}

type ColorOp = { m: number[]; o: number[] } // 3x3-Matrix (zeilenweise) + Offset
const LUM = [0.2126, 0.7152, 0.0722]
const identOp = (): ColorOp => ({ m: [1,0,0, 0,1,0, 0,0,1], o: [0,0,0] })
const composeOps = (a: ColorOp, b: ColorOp): ColorOp => {
  // erst a, dann b anwenden
  const m = new Array(9).fill(0), o = [...b.o]
  for (let r = 0; r < 3; r++) for (let cIdx = 0; cIdx < 3; cIdx++) {
    for (let k = 0; k < 3; k++) m[r*3+cIdx] += b.m[r*3+k] * a.m[k*3+cIdx]
    o[r] += b.m[r*3+cIdx] * a.o[cIdx]
  }
  return { m, o }
}
function cssFilterToOp(css: string): ColorOp {
  let op = identOp()
  const re = /(brightness|contrast|saturate|sepia|grayscale|hue-rotate)\(([^)]+)\)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(css))) {
    const fn = match[1]
    const v = parseFloat(match[2])
    let next: ColorOp | null = null
    if (fn === 'brightness') next = { m: [v,0,0, 0,v,0, 0,0,v], o: [0,0,0] }
    else if (fn === 'contrast') { const off = (0.5 - v / 2) * 255; next = { m: [v,0,0, 0,v,0, 0,0,v], o: [off,off,off] } }
    else if (fn === 'saturate' || fn === 'grayscale') {
      const s = fn === 'saturate' ? v : 1 - v
      const m: number[] = []
      for (let r = 0; r < 3; r++) for (let cIdx = 0; cIdx < 3; cIdx++)
        m.push(LUM[cIdx] * (1 - s) + (r === cIdx ? s : 0))
      next = { m, o: [0,0,0] }
    } else if (fn === 'sepia') {
      const S = [0.393,0.769,0.189, 0.349,0.686,0.168, 0.272,0.534,0.131]
      const m = S.map((sv, i) => sv * v + ((i % 4 === 0) ? 1 - v : 0))
      next = { m, o: [0,0,0] }
    } else if (fn === 'hue-rotate') {
      const rad = (v * Math.PI) / 180, cos = Math.cos(rad), sin = Math.sin(rad)
      next = { m: [
        0.213+cos*0.787-sin*0.213, 0.715-cos*0.715-sin*0.715, 0.072-cos*0.072+sin*0.928,
        0.213-cos*0.213+sin*0.143, 0.715+cos*0.285+sin*0.140, 0.072-cos*0.072-sin*0.283,
        0.213-cos*0.213-sin*0.787, 0.715-cos*0.715+sin*0.715, 0.072+cos*0.928+sin*0.072,
      ], o: [0,0,0] }
    }
    if (next) op = composeOps(op, next)
  }
  return op
}
function applyOpPixels(ctx: CanvasRenderingContext2D, w: number, h: number, op: ColorOp) {
  const { m, o } = op
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i+1], b = d[i+2]
    d[i]   = Math.max(0, Math.min(255, m[0]*r + m[1]*g + m[2]*b + o[0]))
    d[i+1] = Math.max(0, Math.min(255, m[3]*r + m[4]*g + m[5]*b + o[1]))
    d[i+2] = Math.max(0, Math.min(255, m[6]*r + m[7]*g + m[8]*b + o[2]))
  }
  ctx.putImageData(img, 0, 0)
}
function applyFilterPixels(ctx: CanvasRenderingContext2D, w: number, h: number, css: string) {
  if (!css || css === 'none') return
  applyOpPixels(ctx, w, h, cssFilterToOp(css))
}

// Farbmatrix auf der GPU (WebGL): wendet die Filterkette in ~1ms pro Frame an.
// Der CPU-Pixel-Pfad (applyOpPixels) blockierte bei 30fps den Hauptthread -
// das verursachte Tonknistern, Ruckeln und verpasste Frames.
function makeGlColorFilter(W: number, H: number, op: ColorOp) {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = W; canvas.height = H
    const gl = canvas.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: true }) as WebGLRenderingContext | null
    if (!gl) return null
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src); gl.compileShader(s)
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null
    }
    const vs = compile(gl.VERTEX_SHADER,
      'attribute vec2 p; varying vec2 t; void main(){ t = vec2((p.x+1.0)/2.0, (1.0-p.y)/2.0); gl_Position = vec4(p,0.,1.); }')
    const fs = compile(gl.FRAGMENT_SHADER,
      'precision mediump float; varying vec2 t; uniform sampler2D u; uniform mat3 m; uniform vec3 o;' +
      'void main(){ vec4 c = texture2D(u, t); gl_FragColor = vec4(clamp(m * c.rgb + o, 0.0, 1.0), c.a); }')
    if (!vs || !fs) return null
    const prog = gl.createProgram()!
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null
    gl.useProgram(prog)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    // op.m ist zeilenweise, WebGL-mat3 erwartet Spalten
    const m = op.m
    gl.uniformMatrix3fv(gl.getUniformLocation(prog, 'm'), false,
      new Float32Array([m[0],m[3],m[6], m[1],m[4],m[7], m[2],m[5],m[8]]))
    gl.uniform3fv(gl.getUniformLocation(prog, 'o'),
      new Float32Array([op.o[0] / 255, op.o[1] / 255, op.o[2] / 255]))
    gl.viewport(0, 0, W, H)
    return {
      apply(src: TexImageSource): HTMLCanvasElement {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        return canvas
      },
    }
  } catch { return null }
}
// Filter auf das ganze Canvas anwenden — nativ wenn moeglich, sonst Pixel-Pfad
function burnFilter(ctx: CanvasRenderingContext2D, w: number, h: number, css: string) {
  if (!css || css === 'none') return
  if (ctxFilterSupported()) {
    const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h
    tmp.getContext('2d')!.drawImage(ctx.canvas, 0, 0)
    ctx.filter = css
    ctx.drawImage(tmp, 0, 0)
    ctx.filter = 'none'
  } else {
    applyFilterPixels(ctx, w, h, css)
  }
}

// Pistazz-Sticker auf ein Story-Canvas zeichnen (geteilt von Foto-Export
// und Video-Einbrennen) — cx/cy sind Canvas-Koordinaten des Mittelpunkts
function drawSticker(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  stickerColor: StickerColor, sCx: number, sCy: number, stickerScale: number,
) {
  const stStyle = STICKER_STYLES[stickerColor]
  const baseW = W * 0.44, baseH = H * 0.082
  const sW = baseW * stickerScale
  const sH = baseH * stickerScale
  const sX = sCx - sW / 2
  const sY = sCy - sH / 2
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
}

// Native Kamera (ab Build 11): Apples Kamera-Stack hinter der WebView -
// Bildstabilisierung, Hardware-Encoding, echte Geraetequalitaet
type NativeCamAPI = {
  start: (o: { x: number; y: number; width: number; height: number; position: string }) => Promise<unknown>
  stop: () => Promise<unknown>
  flip: () => Promise<unknown>
  setZoom: (o: { zoom: number }) => Promise<unknown>
  focus: (o: { x: number; y: number }) => Promise<unknown>
  setExposure: (o: { bias: number }) => Promise<unknown>
  capturePhoto: () => Promise<{ base64: string }>
  startRecord: () => Promise<unknown>
  pauseRecord: () => Promise<unknown>
  resumeRecord: () => Promise<unknown>
  stopRecord: () => Promise<{ base64: string; mime?: string }>
}
function getNativeCam(): NativeCamAPI | null {
  return (window as unknown as { Capacitor?: { Plugins?: { NativeCam?: NativeCamAPI } } }).Capacitor?.Plugins?.NativeCam ?? null
}
function base64ToBlob(base64: string, mime: string): Blob {
  const bin = atob(base64)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return new Blob([buf], { type: mime })
}

// Normalisierte Container-Position (0-1) → Position auf dem 9:16-Canvas
function remapToStoryCanvas(nx: number, ny: number, containerW: number, containerH: number, W: number, H: number) {
  const safeW_c = Math.min(containerW, containerH * (9 / 16))
  const safeH_c = Math.min(containerH, containerW * (16 / 9))
  const safeL   = (containerW - safeW_c) / 2 / containerW
  const safeT   = (containerH - safeH_c) / 2 / containerH
  return {
    cx: ((nx - safeL) / (safeW_c / containerW)) * W,
    cy: ((ny - safeT) / (safeH_c / containerH)) * H,
  }
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

      // Hintergrund: Bild als Cover + kraeftiger Blur (wie Instagram).
      // WebKit kann ctx.filter='blur()' nicht — Downscale/Upscale ergibt
      // denselben weichen Look und funktioniert ueberall.
      const cScale = Math.max(W / iW, H / iH)
      if (ctxFilterSupported()) {
        ctx.filter = 'blur(48px)'
        ctx.drawImage(img, (W - iW * cScale) / 2, (H - iH * cScale) / 2, iW * cScale, iH * cScale)
        ctx.filter = 'none'
      } else {
        const t = document.createElement('canvas')
        t.width = Math.max(2, Math.round(W / 24)); t.height = Math.max(2, Math.round(H / 24))
        const tx = t.getContext('2d')!
        tx.imageSmoothingEnabled = true
        const ts = Math.max(t.width / iW, t.height / iH)
        tx.drawImage(img, (t.width - iW * ts) / 2, (t.height - iH * ts) / 2, iW * ts, iH * ts)
        ctx.drawImage(t, 0, 0, W, H)
      }
      ctx.fillStyle = 'rgba(0,0,0,0.18)'
      ctx.fillRect(0, 0, W, H)

      // Vordergrund: das komplette Original, scharf und unbeschnitten;
      // danach den gewaehlten Filter fest einbrennen (Vorschau = Export)
      const fScale = Math.min(W / iW, H / iH)
      const dW = iW * fScale, dH = iH * fScale
      ctx.drawImage(img, (W - dW) / 2, (H - dH) / 2, dW, dH)
      burnFilter(ctx, W, H, filterCss)

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
      const { cx: sCx, cy: sCy } = toCanvas(stickerX, stickerY)
      drawSticker(ctx, W, H, stickerColor, sCx, sCy, stickerScale)

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
        body:    'Zur Gutschrift deiner Bonuspunkte wird deine Story geprüft, meist in wenigen Stunden.',
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
  readOnly = false,
}: {
  color: StickerColor
  onColorChange: (c: StickerColor) => void
  x: number
  y: number
  scale: number
  onUpdate: (x: number, y: number, scale: number) => void
  containerRef: React.RefObject<HTMLDivElement | null>
  /** Nur anzeigen (finale Vorschau), keine Gesten */
  readOnly?: boolean
}) {
  const s = STICKER_STYLES[color]
  const COLORS: StickerColor[] = ['green', 'white', 'black', 'glass', 'sunset', 'beige']
  const drag = useRef({ sx: 0, sy: 0, px: x, py: y, dist: 0, sc: scale, lx: x, ly: y })

  // WYSIWYG-Groesse: exakt dieselbe Mathematik wie der Canvas-Export
  // (drawSticker: Breite = 44% der 9:16-Zone, Hoehe/Fonts proportional).
  // Damit ist der Sticker in Vorschau und geteilter Story IMMER gleich gross,
  // egal ob Foto, Video oder Boomerang.
  const [cbox, setCbox] = useState({ w: 390, h: 693 })
  useLayoutEffect(() => {
    const el = containerRef.current
    if (el && el.offsetWidth > 0) setCbox({ w: el.offsetWidth, h: el.offsetHeight })
  }, [containerRef])
  const safeW = Math.min(cbox.w, cbox.h * 9 / 16)
  const boxW = safeW * 0.44
  const boxH = boxW * ((1920 * 0.082) / (1080 * 0.44))
  // Instagram-Style: beim Ziehen rastet der Sticker in der Mitte ein und
  // eine Hilfslinie zeigt die Zentrierung an
  const [guides, setGuides] = useState({ v: false, h: false })
  const SNAP = 0.018
  const snap = (nx: number, ny: number) => {
    const v = Math.abs(nx - 0.5) < SNAP
    const h = Math.abs(ny - 0.5) < SNAP
    setGuides({ v, h })
    return { nx: v ? 0.5 : nx, ny: h ? 0.5 : ny }
  }
  const clearGuides = () => setGuides({ v: false, h: false })

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
      // Single-touch → drag; legt der zweite Finger irgendwo auf dem Bild
      // nach, wird daraus ein Pinch zum Vergroessern/Verkleinern (wie man es
      // von Stickern kennt)
      drag.current.sx = e.touches[0].clientX
      drag.current.sy = e.touches[0].clientY
      drag.current.px = x; drag.current.py = y
      drag.current.lx = x; drag.current.ly = y
      drag.current.dist = 0; drag.current.sc = scale
      const onMove = (te: TouchEvent) => {
        if (te.touches.length >= 2) {
          const d = Math.hypot(te.touches[1].clientX - te.touches[0].clientX, te.touches[1].clientY - te.touches[0].clientY)
          if (!drag.current.dist) drag.current.dist = d
          const ns = Math.min(3, Math.max(0.3, drag.current.sc * (d / drag.current.dist)))
          onUpdate(drag.current.lx, drag.current.ly, ns)
          return
        }
        if (drag.current.dist) return // nach Pinch nicht wieder in Drag springen
        const rx = Math.min(0.95, Math.max(0.05, drag.current.px + (te.touches[0].clientX - drag.current.sx) / rect.width))
        const ry = Math.min(0.95, Math.max(0.05, drag.current.py + (te.touches[0].clientY - drag.current.sy) / rect.height))
        const { nx, ny } = snap(rx, ry)
        drag.current.lx = nx; drag.current.ly = ny
        onUpdate(nx, ny, scale)
      }
      const onEnd = (te: TouchEvent) => {
        if (te.touches.length > 0) return // erst wenn alle Finger weg sind
        clearGuides(); window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd)
      }
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
    const onMove = (me: MouseEvent) => {
      const rx = Math.min(0.95, Math.max(0.05, px + (me.clientX - sx) / rect.width))
      const ry = Math.min(0.95, Math.max(0.05, py + (me.clientY - sy) / rect.height))
      const { nx, ny } = snap(rx, ry)
      onUpdate(nx, ny, scale)
    }
    const onUp = () => { clearGuides(); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <>
    {/* Zentrier-Hilfslinien (wie Instagram): erscheinen, sobald der Sticker
        auf der Mittelachse einrastet */}
    {guides.v && (
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] z-30 pointer-events-none"
        style={{ background: '#8BB06A', boxShadow: '0 0 6px rgba(139,176,106,0.9)' }} />
    )}
    {guides.h && (
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] z-30 pointer-events-none"
        style={{ background: '#8BB06A', boxShadow: '0 0 6px rgba(139,176,106,0.9)' }} />
    )}
    <div
      className={`absolute select-none z-20 ${readOnly ? 'pointer-events-none' : 'pointer-events-auto cursor-move'}`}
      style={{
        left: `${x * 100}%`,
        top:  `${y * 100}%`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: 'center center',
      }}
      onMouseDown={readOnly ? undefined : handleMouseDown}
      onTouchStart={readOnly ? undefined : handleTouchStart}
      onDoubleClick={readOnly ? undefined : () => { const i = COLORS.indexOf(color); onColorChange(COLORS[(i + 1) % COLORS.length]) }}
    >
      <div
        className="flex flex-col items-center justify-center border shadow-xl"
        style={{
          width: boxW, height: boxH, borderRadius: boxH * 0.32,
          background: s.grad ? `linear-gradient(135deg, ${s.grad[0]}, ${s.grad[1]})` : s.bg,
          borderColor: s.border,
          ...(color === 'glass' ? { backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' } : {}),
        }}
      >
        <span style={{ color: s.text, opacity: 0.7, fontSize: boxW * 0.0432, letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 600, lineHeight: 1.5 }}>Powered by</span>
        <span style={{ color: s.text, fontSize: boxW * 0.0908, fontFamily: "'DM Serif Display', Georgia, serif", fontWeight: 700, lineHeight: 1.2 }}>gastro.pistazz.io</span>
      </div>
      {!readOnly && (
        <p className="text-center text-white/45 text-[9px] mt-1 leading-tight">
          Ziehen · 2× Tippen = Stil
        </p>
      )}
    </div>
    </>
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
            Im nächsten Schritt <strong className="text-[#1C1F1A]">„Instagram Stories"</strong> wählen, das Bild wird direkt in deine Story geladen.
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
            Tippe auf <strong>„Instagram Stories"</strong> im Menü, nicht auf „Instagram", dann geht das Bild direkt in deine Story.
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
  // App-Build-Nummer: ab Build 10 kann das native Plugin den Sticker als
  // eigenes Instagram-Element uebergeben (Video bleibt Original)
  const [appBuild, setAppBuild] = useState(0)
  useEffect(() => {
    const cap = (window as unknown as { Capacitor?: { Plugins?: { App?: { getInfo: () => Promise<{ build: string }> } } } }).Capacitor
    cap?.Plugins?.App?.getInfo().then(i => setAppBuild(parseInt(i.build, 10) || 0)).catch(() => {})
  }, [])
  useEffect(() => {
    const w = window as unknown as { Capacitor?: { Plugins?: { InstagramStory?: unknown } } }
    setHasNativeIG(!!w.Capacitor?.Plugins?.InstagramStory)
  }, [])
  const [stickerPos,   setStickerPos]  = useState({ x: 0.5, y: 0.5, scale: 1.0 })
  const [showSheet,    setShowSheet]   = useState(false) // kept for compatibility
  const [submitting,   setSubmitting]  = useState(false)
  const [pointsEarned, setPointsEarned]= useState(0)
  const [step, setStep] = useState<'capture' | 'edit' | 'share-options' | 'video-edit' | 'video-share' | 'success'>('capture')
  const [copiedTags, setCopiedTags] = useState<Record<string, boolean>>({})
  const [howtoDismissed, setHowtoDismissed] = useState(() =>
    typeof window !== 'undefined'
    && (sessionStorage.getItem('storyHowto') === '1' || localStorage.getItem('storyHowtoNever') === '1'))
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
  const recRafRef     = useRef<number | null>(null)
  const drawActiveRef = useRef(false)
  const [recPaused, setRecPaused] = useState(false)
  const recPausedRef  = useRef(false)
  const [boomPhase, setBoomPhase] = useState<null | 'rec' | 'enc'>(null)
  // Video-Vorschau: Sticker/Filter werden erst beim Teilen ins Video eingebrannt
  const videoShareRef = useRef<HTMLDivElement>(null)
  const [videoBusy, setVideoBusy] = useState(false)
  // Temporaere Diagnose: was encodiert iOS WIRKLICH (Dauer + Bitrate)?
  const [vidDiag, setVidDiag] = useState('')
  // Native Kamera aktiv? (Build 11+, echte Stabilisierung + Hardware-Encode)
  const [nativeCam, setNativeCam] = useState(false)
  const nativeCamRef = useRef(false)
  const nativeRecActiveRef = useRef(false)
  // Wurde das aktuelle Video nativ aufgenommen? (Filter dann erst beim Teilen)
  const capturedNativeRef = useRef(false)
  const burnedVideoRef = useRef<{ key: string; blob: Blob; mime: string } | null>(null)
  // Fertiges Video (Sticker + Filter eingebrannt) fuer die finale Vorschau
  const [burnedVideo, setBurnedVideo] = useState<{ url: string; blob: Blob; mime: string } | null>(null)
  // Boomerang-Rohframes: das geteilte Video wird direkt daraus encodiert
  // (nur EIN Encode statt Aufnahme+Einbrennen = keine Doppel-Kompression)
  const boomFramesRef = useRef<HTMLCanvasElement[] | null>(null)
  // Ohne Filter + Build >= 10: Original-Video unangetastet teilen, Sticker
  // geht als transparentes PNG an Instagram und wird dort als eigenes
  // Element darueber gelegt (null Qualitaetsverlust)
  const [stickerNative, setStickerNative] = useState(false)
  const videoFinalRef = useRef<HTMLDivElement>(null)
  const videoBoxDims = useRef({ w: 390, h: 844 })
  // Live-Refs, damit die Video-Zeichenschleife Zoom/Helligkeit/Kamera
  // waehrend der Aufnahme mitbekommt
  const cssZoomRef = useRef(1);     useEffect(() => { cssZoomRef.current = cssZoom }, [cssZoom])
  const brightRef  = useRef(1);     useEffect(() => { brightRef.current = brightness }, [brightness])
  const filterRef  = useRef('none')
  const facingRef  = useRef<'user' | 'environment'>('environment')
  useEffect(() => { facingRef.current = facingMode }, [facingMode])

  const filterCss = FILTERS.find(f => f.id === filter)?.css ?? 'none'
  useEffect(() => { filterRef.current = filterCss }, [filterCss])

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
    // Native Kamera (Build 11+): stabilisiert, Hardware-Encode, 1:1-Qualitaet
    const ncam = getNativeCam()
    if (ncam) {
      try {
        await new Promise(r => requestAnimationFrame(() => r(null)))
        const box = cameraContainerRef.current?.getBoundingClientRect()
        await ncam.start({
          x: box?.x ?? 0, y: box?.y ?? 0,
          width: box?.width ?? window.innerWidth,
          height: box?.height ?? window.innerHeight,
          position: facing === 'user' ? 'front' : 'back',
        })
        nativeCamRef.current = true
        setNativeCam(true)
        setZoom(1); setCssZoom(1); setBrightness(1); setFocusPt(null)
        setupPush()
        return
      } catch { /* Fallback: Web-Kamera unten */ }
    }
    try {
      // 3:4-Vollsensor-Ideals (1440x1920): 9:16-Ideals zwingen iOS in einen
      // 16:9-Beschnitt des 4:3-Sensors - dadurch fehlt oben/unten massiv
      // Sichtfeld und es wirkt gezoomt. 3:4 liefert das volle vertikale FOV
      // der echten Kamera; der 9:16-Story-Zuschnitt passiert nur seitlich
      // (object-cover bzw. Export-Crop). Audio fuer Video-Aufnahmen gleich
      // mit anfragen (Fallback ohne Ton, falls Mikrofon abgelehnt wird).
      // 4:3-Sensor-Vollformat anfordern (landscape-orientierte Ideals, da
      // iOS-Streams intern quer liegen) - Ziel: volles natives Sichtfeld
      const videoC = { facingMode: facing, width: { ideal: 2560 }, height: { ideal: 1920 } }
      // Audio OHNE Telefon-Processing: Echo-/Rauschunterdrueckung und
      // Auto-Gain machen Story-Ton dumpf - fuer Videos will man den vollen
      // natuerlichen Klang des Geraets.
      const audioC = { echoCancellation: false, noiseSuppression: false, autoGainControl: false, sampleRate: 48000 }
      // WICHTIG: In der nativen App darf Audio erst ab Build 9 angefragt
      // werden - aeltere Builds haben keine NSMicrophoneUsageDescription und
      // iOS beendet die App beim Mikrofon-Zugriff sofort (Hard-Crash).
      let wantAudio = true
      const cap = (window as unknown as { Capacitor?: { Plugins?: { App?: { getInfo: () => Promise<{ build: string }> } } } }).Capacitor
      if (cap) {
        wantAudio = false
        try {
          const info = await cap.Plugins?.App?.getInfo()
          if (info && parseInt(info.build, 10) >= 9) wantAudio = true
        } catch { /* bleibt ohne Audio */ }
      }
      const s = wantAudio
        ? await navigator.mediaDevices
            .getUserMedia({ video: videoC, audio: audioC })
            .catch(() => navigator.mediaDevices.getUserMedia({ video: videoC }))
        : await navigator.mediaDevices.getUserMedia({ video: videoC })
      setStream(s)
      setZoom(1); setCssZoom(1); setBrightness(1); setFocusPt(null)
      // Start IMMER exakt bei 1x - nie Ultraweitwinkel (<1), nie gezoomt (>1)
      const track = s.getVideoTracks()[0]
      const caps = track?.getCapabilities?.() as (MediaTrackCapabilities & { zoom?: { min: number; max: number } }) | undefined
      if (track && caps?.zoom) {
        const oneX = Math.min(caps.zoom.max, Math.max(caps.zoom.min, 1))
        track.applyConstraints({ advanced: [{ zoom: oneX } as unknown as MediaTrackConstraintSet] }).catch(() => {})
      }
      if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play().catch(() => {}) }
      // Register push after camera permission granted (both are user gestures)
      setupPush()
    } catch {
      setCamError(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    startCamera(facingMode)
    return () => {
      stream?.getTracks().forEach(t => t.stop())
      if (nativeCamRef.current) { getNativeCam()?.stop().catch(() => {}); nativeCamRef.current = false }
    }
  }, [facingMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Belichtungs-Slider steuert bei nativer Kamera die echte Belichtung (EV)
  useEffect(() => {
    if (nativeCamRef.current) getNativeCam()?.setExposure({ bias: (brightness - 1) * 2.5 }).catch(() => {})
  }, [brightness])

  // Native Kamera liegt HINTER der WebView: auch html/body muessen
  // durchsichtig sein, sonst verdeckt der weisse App-Hintergrund die
  // Vorschau (weisser Kasten statt Kamerabild)
  useEffect(() => {
    if (!(nativeCam && step === 'capture')) return
    const de = document.documentElement, b = document.body
    const prev = [de.style.background, b.style.background]
    de.style.background = 'transparent'
    b.style.background = 'transparent'
    return () => { de.style.background = prev[0]; b.style.background = prev[1] }
  }, [nativeCam, step])

  // ── Capture ──────────────────────────────────────────────────────────────
  const capturePhoto = () => {
    // Nativ: volles Geraete-Foto, Belichtung/Zoom sind echte Kamera-Werte
    if (nativeCamRef.current) {
      const ncam = getNativeCam()!
      ncam.capturePhoto().then(({ base64 }) => {
        setCapturedSrc('data:image/jpeg;base64,' + base64)
        ncam.stop().catch(() => {})
        nativeCamRef.current = false; setNativeCam(false)
        setStep('edit')
      }).catch(() => toast.error('Foto fehlgeschlagen, bitte nochmal versuchen'))
      return
    }
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
    ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, 1080, 1920)
    ctx.resetTransform()
    // Nur die Belichtung einbacken - der gewaehlte Filter bleibt Vorschau
    // und wird erst beim Export EINMAL eingebrannt (sonst doppelt)
    const bFilter = brightness !== 1 ? `brightness(${brightness})` : ''
    if (bFilter) burnFilter(ctx, 1080, 1920, bFilter)

    stream?.getTracks().forEach(t => t.stop()); setStream(null)
    setCapturedSrc(canvas.toDataURL('image/jpeg', 0.95))
    setStep('edit')
  }

  // ── Zoom: nativ (iOS 17+) wenn moeglich, sonst CSS + Export-Crop ─────────
  const applyZoom = useCallback((z: number) => {
    const clamped = Math.min(5, Math.max(1, z))
    setZoom(clamped)
    if (nativeCamRef.current) { getNativeCam()?.setZoom({ zoom: clamped }).catch(() => {}); return }
    const track = stream?.getVideoTracks()[0]
    const caps = track?.getCapabilities?.() as (MediaTrackCapabilities & { zoom?: { min: number; max: number } }) | undefined
    if (track && caps?.zoom) {
      // 1x-Basis: UI-Zoom 1..5 entspricht nativem Faktor, nie unter 1x
      const nz = Math.min(caps.zoom.max, Math.max(Math.max(caps.zoom.min, 1), clamped))
      track.applyConstraints({ advanced: [{ zoom: nz } as unknown as MediaTrackConstraintSet] }).catch(() => setCssZoom(clamped))
      setCssZoom(1)
    } else {
      setCssZoom(clamped)
    }
  }, [stream])

  // ── Tap = AE/AF + Belichtungsregler, Doppel-Tap = Kamera wechseln,
  //    Pinch = Zoom ─────────────────────────────────────────────────────────
  const exposureDragRef = useRef<{ y: number; b: number; moved: boolean } | null>(null)
  // Horizontales Wischen wechselt den Modus (Boomerang | Story | Video),
  // wie man es von Instagram kennt - Tippen auf die Labels geht weiterhin
  const swipeRef = useRef<{ x: number; y: number; dx: number; valid: boolean } | null>(null)
  const handleViewTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length >= 2) {
      swipeRef.current = null
      pinchRef.current = {
        d: Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY),
        z: zoom,
      }
    } else {
      swipeRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, dx: 0, valid: true }
      if (focusPt) {
        // Apple-Style: nach dem Fokus-Tap regelt vertikales Ziehen die Belichtung
        exposureDragRef.current = { y: e.touches[0].clientY, b: brightness, moved: false }
      }
    }
  }
  const handleViewTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length >= 2 && pinchRef.current.d > 0) {
      swipeRef.current = null
      const d = Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY)
      applyZoom(pinchRef.current.z * (d / pinchRef.current.d))
      return
    }
    const sw = swipeRef.current
    if (sw && e.touches.length === 1) {
      sw.dx = e.touches[0].clientX - sw.x
      const dy = Math.abs(e.touches[0].clientY - sw.y)
      // Deutlich vertikaler als horizontal = Belichtungs-Geste, kein Swipe
      if (dy > 30 && dy > Math.abs(sw.dx)) sw.valid = false
    }
    const drag = exposureDragRef.current
    if (drag && focusPt && e.touches.length === 1) {
      const dy = drag.y - e.touches[0].clientY
      if (Math.abs(dy) > 6) drag.moved = true
      setBrightness(Math.min(1.6, Math.max(0.4, drag.b + (dy / 220) * 1.2)))
      if (focusHideRef.current) clearTimeout(focusHideRef.current)
      focusHideRef.current = setTimeout(() => setFocusPt(null), 2500)
    }
  }
  const handleViewTouchEnd = (e: React.TouchEvent) => {
    const sw = swipeRef.current
    swipeRef.current = null
    if (!sw || !sw.valid || e.touches.length > 0) return
    if (Math.abs(sw.dx) < 60 || recording || boomBusy) return
    const modes: Array<'boomerang' | 'story' | 'video'> = ['boomerang', 'story', 'video']
    const i = modes.indexOf(captureMode)
    // Nach links wischen = Modus rechts davon, nach rechts = links davon
    const next = sw.dx < 0 ? Math.min(modes.length - 1, i + 1) : Math.max(0, i - 1)
    if (next !== i) {
      setCaptureMode(modes[next])
      // ein Swipe soll keinen Fokus-Tap ausloesen
      if (singleTapRef.current) { clearTimeout(singleTapRef.current); singleTapRef.current = null }
      lastTapRef.current = 0
    }
  }
  const handleViewTap = (e: React.MouseEvent<HTMLDivElement>) => {
    // Nach einer Belichtungs-Zieh-Geste keinen neuen Fokus-Tap ausloesen
    if (exposureDragRef.current?.moved) { exposureDragRef.current = null; return }
    exposureDragRef.current = null
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
      // Native Kamera: echter AF/AE-Punkt via AVFoundation
      if (nativeCamRef.current) {
        getNativeCam()?.focus({ x: nx, y: ny }).catch(() => {})
        if (focusHideRef.current) clearTimeout(focusHideRef.current)
        focusHideRef.current = setTimeout(() => setFocusPt(null), 3000)
        return
      }
      // Web-Fallback: AE/AF-Versuch (wo unterstuetzt); Belichtungsregler erscheint immer
      const track = stream?.getVideoTracks()[0]
      const caps = track?.getCapabilities?.() as (MediaTrackCapabilities & { focusMode?: string[] }) | undefined
      if (track && caps?.focusMode?.length) {
        // Erst punktueller Fokus, dann continuous als Fallback - je nachdem,
        // was das Geraet unterstuetzt
        track.applyConstraints({
          advanced: [
            { focusMode: 'single-shot', pointsOfInterest: [{ x: nx, y: ny }] },
            { focusMode: 'continuous', pointsOfInterest: [{ x: nx, y: ny }] },
          ] as unknown as MediaTrackConstraintSet[],
        }).catch(() => {})
      }
      if (focusHideRef.current) clearTimeout(focusHideRef.current)
      focusHideRef.current = setTimeout(() => setFocusPt(null), 3000)
    }, 300)
  }

  // ── Video-Aufnahme (Halten in STORY, Freihand-Toggle in VIDEO) ───────────
  const stopRecording = useCallback(() => {
    if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null }
    // Nativ: Aufnahme beenden, MP4 in Originalqualitaet uebernehmen
    if (nativeCamRef.current) {
      if (!nativeRecActiveRef.current) { setRecording(false); return }
      nativeRecActiveRef.current = false
      setRecording(false)
      setRecPaused(false); recPausedRef.current = false
      const ncam = getNativeCam()!
      ncam.stopRecord().then(({ base64, mime }) => {
        const blob = base64ToBlob(base64, mime || 'video/mp4')
        boomFramesRef.current = null
        capturedNativeRef.current = true
        setCapturedVideo(prev => { if (prev) URL.revokeObjectURL(prev.url); return { url: URL.createObjectURL(blob), blob, mime: mime || 'video/mp4' } })
        ncam.stop().catch(() => {})
        nativeCamRef.current = false; setNativeCam(false)
        setStep('video-edit')
      }).catch(() => toast.error('Video konnte nicht gespeichert werden, bitte nochmal'))
      return
    }
    drawActiveRef.current = false
    if (recRafRef.current) { cancelAnimationFrame(recRafRef.current); recRafRef.current = null }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop()
    setRecording(false)
    setRecPaused(false); recPausedRef.current = false
  }, [])

  // Video-Modus: Aufnahme pausieren/fortsetzen (bis Stopp oder 15s gesamt).
  // Nativ: Segmente werden am Ende verlustfrei zusammengefuegt.
  const pauseResumeRecording = useCallback(() => {
    if (nativeCamRef.current) {
      const ncam = getNativeCam()!
      if (recPausedRef.current) {
        ncam.resumeRecord().catch(() => {})
        setRecPaused(false); recPausedRef.current = false
      } else {
        ncam.pauseRecord().catch(() => {})
        setRecPaused(true); recPausedRef.current = true
      }
      return
    }
    const rec = recorderRef.current
    if (!rec || rec.state === 'inactive') return
    if (rec.state === 'recording') {
      rec.pause()
      setRecPaused(true); recPausedRef.current = true
    } else if (rec.state === 'paused') {
      rec.resume()
      setRecPaused(false); recPausedRef.current = false
    }
  }, [])

  const startRecording = useCallback(() => {
    if (recording) return
    // Nativ: Apples Encoder nimmt auf - stabilisiert, volle Qualitaet
    if (nativeCamRef.current) {
      const ncam = getNativeCam()!
      ncam.startRecord().then(() => {
        nativeRecActiveRef.current = true
        setRecording(true)
        setRecSecs(0)
        setRecPaused(false); recPausedRef.current = false
        recTimerRef.current = setInterval(() => {
          if (recPausedRef.current) return
          setRecSecs(s => {
            if (s + 1 >= 15) stopRecording()
            return s + 1
          })
        }, 1000)
      }).catch(() => toast.error('Aufnahme fehlgeschlagen, bitte nochmal'))
      return
    }
    const video = videoRef.current
    if (!stream || !video) return

    // Hochformat-Pipeline in voller Story-Aufloesung (1080x1920): jeder
    // Frame wird mit Zoom, Belichtung und Spiegelung ins 9:16-Canvas
    // gezeichnet und DAS aufgenommen. requestVideoFrameCallback (falls
    // vorhanden) taktet exakt mit den Kamera-Frames = fluessiger.
    const W = 1080, H = 1920
    const c = document.createElement('canvas'); c.width = W; c.height = H
    const cx = c.getContext('2d')!
    cx.imageSmoothingEnabled = true
    cx.imageSmoothingQuality = 'high'
    // Jeder Frame wird erst KOMPLETT auf dem Arbeits-Canvas gebaut und dann
    // in einem Zug auf das aufgenommene Canvas kopiert - der Encoder kann so
    // nie einen halbfertigen Zustand erwischen (das war das Flackern)
    const work = document.createElement('canvas'); work.width = W; work.height = H
    const wcx = work.getContext('2d')!
    wcx.imageSmoothingEnabled = true
    wcx.imageSmoothingQuality = 'high'
    // Gewaehlter Filter wird LIVE per GPU in den einzigen Encode gebrannt -
    // kein zweites Encoden mehr noetig, Qualitaet bleibt beim Original
    const recFilter = filterRef.current
    const recOp = recFilter !== 'none' ? cssFilterToOp(recFilter) : null
    const recGl = recOp ? makeGlColorFilter(W, H, recOp) : null
    const drawFrame = () => {
      if (!recPausedRef.current) {
        const vW = video.videoWidth || W, vH = video.videoHeight || H
        const cover = Math.max(W / vW, H / vH)
        let sw = W / cover, sh = H / cover
        let sx = (vW - sw) / 2, sy = (vH - sh) / 2
        const z = cssZoomRef.current
        if (z > 1) { const nw = sw / z, nh = sh / z; sx += (sw - nw) / 2; sy += (sh - nh) / 2; sw = nw; sh = nh }
        wcx.save()
        if (facingRef.current === 'user') { wcx.translate(W, 0); wcx.scale(-1, 1) }
        wcx.drawImage(video, sx, sy, sw, sh, 0, 0, W, H)
        wcx.restore()
        // Belichtung als schnelles Overlay (ctx.filter kann WebKit nicht;
        // ein Pixel-Pass waere bei 30fps zu langsam)
        const b = brightRef.current
        if (b < 1) {
          wcx.fillStyle = `rgba(0,0,0,${Math.min(0.85, 1 - b)})`
          wcx.fillRect(0, 0, W, H)
        } else if (b > 1) {
          wcx.globalCompositeOperation = 'lighter'
          wcx.fillStyle = `rgba(255,255,255,${Math.min(0.6, (b - 1) * 0.55)})`
          wcx.fillRect(0, 0, W, H)
          wcx.globalCompositeOperation = 'source-over'
        }
        if (recOp) {
          if (recGl) wcx.drawImage(recGl.apply(work), 0, 0)
          else applyOpPixels(wcx, W, H, recOp)
        }
        cx.drawImage(work, 0, 0)
      }
      if (!drawActiveRef.current) return
      const v = video as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number }
      if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(drawFrame)
      else recRafRef.current = requestAnimationFrame(drawFrame)
    }
    drawActiveRef.current = true
    boomFramesRef.current = null
    drawFrame()

    const canvasStream = (c as HTMLCanvasElement & { captureStream: (fps: number) => MediaStream }).captureStream(30)
    const audioTrack = stream.getAudioTracks()[0]
    const recStream = audioTrack
      ? new MediaStream([canvasStream.getVideoTracks()[0], audioTrack])
      : canvasStream

    // Bitrate aggressiv anfordern - iOS ignoriert die Vorgabe je nach
    // Codec-Angabe. High-Profile-H.264 explizit versuchen, dann Container pur.
    const mimeCandidates = ['video/mp4;codecs=avc1.640033', 'video/mp4', 'video/webm']
    const recMime = mimeCandidates.find(m => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) ?? 'video/webm'
    const mime = recMime.startsWith('video/mp4') ? 'video/mp4' : 'video/webm'
    let rec: MediaRecorder
    try { rec = new MediaRecorder(recStream, { mimeType: recMime, videoBitsPerSecond: 25_000_000, audioBitsPerSecond: 256_000 }) }
    catch {
      drawActiveRef.current = false
      if (recRafRef.current) cancelAnimationFrame(recRafRef.current)
      toast.error('Videoaufnahme wird auf diesem Gerät nicht unterstützt'); return
    }
    recChunksRef.current = []
    rec.ondataavailable = ev => { if (ev.data.size > 0) recChunksRef.current.push(ev.data) }
    rec.onerror = () => { toast.error('Aufnahme-Fehler, bitte nochmal versuchen') }
    rec.onstop = () => {
      const blob = new Blob(recChunksRef.current, { type: mime })
      if (blob.size < 10_000) {
        toast.error('Video zu kurz, halte etwas länger drauf')
        return
      }
      setCapturedVideo(prev => { if (prev) URL.revokeObjectURL(prev.url); return { url: URL.createObjectURL(blob), blob, mime } })
      setStep('video-edit')
    }
    rec.start(250)
    recorderRef.current = rec
    setRecording(true)
    setRecSecs(0)
    setRecPaused(false); recPausedRef.current = false
    recTimerRef.current = setInterval(() => {
      if (recPausedRef.current) return // Pause zaehlt nicht
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
    if (boomBusy || recording) return
    // Nativ: kurzen stabilisierten Clip aufnehmen, Frames daraus ziehen
    if (nativeCamRef.current) {
      setBoomBusy(true)
      setBoomPhase('rec')
      try {
        const ncam = getNativeCam()!
        await ncam.startRecord()
        nativeRecActiveRef.current = true
        await new Promise(r => setTimeout(r, 1300))
        nativeRecActiveRef.current = false
        const { base64 } = await ncam.stopRecord()
        setBoomPhase('enc')
        const srcBlob = base64ToBlob(base64, 'video/mp4')
        const srcUrl = URL.createObjectURL(srcBlob)
        const v = document.createElement('video')
        v.src = srcUrl; v.muted = true; v.playsInline = true
        await new Promise<void>((res, rej) => { v.onloadedmetadata = () => res(); v.onerror = () => rej(new Error('load')) })
        const dur = isFinite(v.duration) && v.duration > 0.2 ? v.duration : 1.2
        const W = 1080, H = 1920
        const frames: HTMLCanvasElement[] = []
        for (let i = 0; i < 24; i++) {
          await new Promise<void>(res => { v.onseeked = () => res(); v.currentTime = Math.min(dur - 0.05, (i / 24) * dur) })
          const c = document.createElement('canvas'); c.width = W; c.height = H
          const fx = c.getContext('2d')!
          const vw = v.videoWidth || W, vh = v.videoHeight || H
          const cover = Math.max(W / vw, H / vh)
          fx.drawImage(v, (W - vw * cover) / 2, (H - vh * cover) / 2, vw * cover, vh * cover)
          frames.push(c)
        }
        URL.revokeObjectURL(srcUrl)
        boomFramesRef.current = frames
        capturedNativeRef.current = true
        // Vorschau-Video aus den Frames (nur Anzeige; geteilt wird der
        // Single-Encode aus den Rohframes beim Weiter-Schritt)
        const out = document.createElement('canvas'); out.width = W; out.height = H
        const octx = out.getContext('2d')!
        const st = (out as HTMLCanvasElement & { captureStream: (fps: number) => MediaStream }).captureStream(30)
        const mime = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm'
        const rec = new MediaRecorder(st, { mimeType: mime, videoBitsPerSecond: 12_000_000 })
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
        ncam.stop().catch(() => {})
        nativeCamRef.current = false; setNativeCam(false)
        setStep('video-edit')
      } catch {
        toast.error('Boomerang fehlgeschlagen, bitte nochmal versuchen')
      }
      setBoomPhase(null)
      setBoomBusy(false)
      return
    }
    const video = videoRef.current
    if (!video) return
    setBoomBusy(true)
    setBoomPhase('rec')
    try {
      const W = 1080, H = 1920
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
      // Mehr Frames + gleichmaessiger Takt = deutlich ruhigeres Ergebnis
      const FRAME_N = 24
      for (let i = 0; i < FRAME_N; i++) {
        const c = document.createElement('canvas'); c.width = W; c.height = H
        const cx = c.getContext('2d')!
        if (facingMode === 'user') { cx.translate(W, 0); cx.scale(-1, 1) }
        cx.drawImage(video, sx, sy, zw, zh, 0, 0, W, H)
        cx.resetTransform()
        if (brightness < 1) {
          cx.fillStyle = `rgba(0,0,0,${Math.min(0.85, 1 - brightness)})`
          cx.fillRect(0, 0, W, H)
        } else if (brightness > 1) {
          cx.globalCompositeOperation = 'lighter'
          cx.fillStyle = `rgba(255,255,255,${Math.min(0.6, (brightness - 1) * 0.55)})`
          cx.fillRect(0, 0, W, H)
          cx.globalCompositeOperation = 'source-over'
        }
        frames.push(c)
        await new Promise(r => setTimeout(r, 42))
      }

      setBoomPhase('enc')
      const out = document.createElement('canvas'); out.width = W; out.height = H
      const octx = out.getContext('2d')!
      const st = (out as HTMLCanvasElement & { captureStream: (fps: number) => MediaStream }).captureStream(30)
      const mime = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm'
      const rec = new MediaRecorder(st, { mimeType: mime, videoBitsPerSecond: 12_000_000 })
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
      // Rohframes behalten: das geteilte Video wird beim Einbrennen direkt
      // daraus encodiert (Original-Qualitaet, keine zweite Kompression)
      boomFramesRef.current = frames
      setCapturedVideo(prev => { if (prev) URL.revokeObjectURL(prev.url); return { url: URL.createObjectURL(blob), blob, mime } })
      setStep('video-edit')
    } catch {
      toast.error('Boomerang fehlgeschlagen, bitte nochmal versuchen')
    }
    setBoomPhase(null)
    setBoomBusy(false)
  }

  // ── Sticker + Filter fest ins Video einbrennen (Vorschau = geteiltes Video).
  //    Das Video wird dazu einmal durch ein 9:16-Canvas abgespielt und neu
  //    aufgenommen; Ton bleibt ueber WebAudio erhalten. ──
  const burnVideoOverlay = async (opts: { withFilter: boolean; withSticker: boolean }): Promise<{ blob: Blob; mime: string }> => {
    const src = capturedVideo!
    const key = `${src.url}|${opts.withFilter ? filter : '-'}|${opts.withSticker ? `${stickerColor}|${stickerPos.x.toFixed(3)},${stickerPos.y.toFixed(3)},${stickerPos.scale.toFixed(2)}` : '-'}`
    if (burnedVideoRef.current?.key === key) return burnedVideoRef.current

    const W = 1080, H = 1920
    const c = document.createElement('canvas'); c.width = W; c.height = H
    const bctx = c.getContext('2d')!
    bctx.imageSmoothingEnabled = true
    bctx.imageSmoothingQuality = 'high'
    if (videoShareRef.current) videoBoxDims.current = { w: videoShareRef.current.offsetWidth, h: videoShareRef.current.offsetHeight }
    const { cx: sCx, cy: sCy } = remapToStoryCanvas(stickerPos.x, stickerPos.y, videoBoxDims.current.w, videoBoxDims.current.h, W, H)
    // WICHTIG: ctx.filter wird hier bewusst NIE benutzt - neuere iOS-Versionen
    // melden es als unterstuetzt, wenden es beim Zeichnen von Videos aber
    // stillschweigend nicht an. Die Filterkette laeuft deshalb immer als
    // Farbmatrix: auf der GPU (schnell), zur Not auf der CPU.
    const op = opts.withFilter && filterCss !== 'none' ? cssFilterToOp(filterCss) : null
    const glf = op ? makeGlColorFilter(W, H, op) : null

    // Jeder Frame wird KOMPLETT auf einem Arbeits-Canvas gebaut (Bild +
    // Filter + Sticker) und erst dann in einem Zug auf das aufgenommene
    // Canvas kopiert. Der Encoder sieht so nie halbfertige Frames (Flackern).
    const work = document.createElement('canvas'); work.width = W; work.height = H
    const wctx = work.getContext('2d')!
    wctx.imageSmoothingEnabled = true
    wctx.imageSmoothingQuality = 'high'
    const composeFrame = (drawSrc: (t: CanvasRenderingContext2D) => void) => {
      drawSrc(wctx)
      if (op) {
        if (glf) wctx.drawImage(glf.apply(work), 0, 0)
        else applyOpPixels(wctx, W, H, op)
      }
      if (opts.withSticker) drawSticker(wctx, W, H, stickerColor, sCx, sCy, stickerPos.scale)
      bctx.drawImage(work, 0, 0)
    }

    const mime = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm'
    const cs = (c as HTMLCanvasElement & { captureStream: (fps: number) => MediaStream }).captureStream(30)

    // ── Boomerang: direkt aus den Rohframes encodieren — das Ergebnis ist
    //    der EINZIGE Encode, Original-Qualitaet ohne Doppel-Kompression ──
    if (boomFramesRef.current?.length) {
      const frames = boomFramesRef.current
      const rec = new MediaRecorder(cs, { mimeType: mime, videoBitsPerSecond: 20_000_000 })
      const chunks: Blob[] = []
      rec.ondataavailable = ev => { if (ev.data.size > 0) chunks.push(ev.data) }
      const done = new Promise<Blob>(res => { rec.onstop = () => res(new Blob(chunks, { type: mime })) })
      rec.start(250)
      const seq = [...frames, ...frames.slice(1, -1).reverse()]
      for (let loop = 0; loop < 3; loop++) {
        for (const f of seq) {
          composeFrame(t => t.drawImage(f, 0, 0, W, H))
          await new Promise(r => setTimeout(r, 34))
        }
      }
      rec.stop()
      const blob = await done
      const out = { key, blob, mime }
      burnedVideoRef.current = out
      return out
    }

    // ── Video: einmal durchspielen und mit Ton neu aufnehmen ──
    const v = document.createElement('video')
    v.src = src.url
    v.playsInline = true
    v.muted = false
    await new Promise<void>((res, rej) => {
      v.onloadedmetadata = () => res()
      v.onerror = () => rej(new Error('Video laden fehlgeschlagen'))
    })

    const tracks: MediaStreamTrack[] = [cs.getVideoTracks()[0]]
    let ac: AudioContext | null = null
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ac = new AC()
      const node = ac.createMediaElementSource(v)
      const dest = ac.createMediaStreamDestination()
      node.connect(dest)
      const at = dest.stream.getAudioTracks()[0]
      if (at) tracks.push(at)
    } catch { /* ohne Ton weiter */ }

    // Hoher Bitrate-Ansatz: der zweite Encode (Einbrennen) darf sichtbar
    // nichts kosten, Instagram komprimiert am Ende sowieso selbst
    const rec = new MediaRecorder(new MediaStream(tracks), { mimeType: mime, videoBitsPerSecond: 20_000_000, audioBitsPerSecond: 256_000 })
    const chunks: Blob[] = []
    rec.ondataavailable = ev => { if (ev.data.size > 0) chunks.push(ev.data) }
    const done = new Promise<Blob>(res => { rec.onstop = () => res(new Blob(chunks, { type: mime })) })

    let active = true
    const draw = () => {
      if (!active) return
      const vW = v.videoWidth || W, vH = v.videoHeight || H
      const cover = Math.max(W / vW, H / vH)
      const dw = vW * cover, dh = vH * cover
      composeFrame(t => t.drawImage(v, (W - dw) / 2, (H - dh) / 2, dw, dh))
      const vv = v as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number }
      if (vv.requestVideoFrameCallback) vv.requestVideoFrameCallback(draw)
      else requestAnimationFrame(draw)
    }
    v.onended = () => {
      active = false
      setTimeout(() => { try { rec.stop() } catch {} ; ac?.close().catch(() => {}) }, 150)
    }
    rec.start(250)
    await v.play()
    draw()
    const blob = await done
    const out = { key, blob, mime }
    burnedVideoRef.current = out
    return out
  }

  // Vorschau-Videos MUESSEN von selbst laufen: muted hart als Attribut
  // setzen (React laesst es weg), play() mehrfach nachschieben (iOS
  // blockiert sonst z.B. im Stromsparmodus und zeigt einen Play-Button)
  const forcePlay = (el: HTMLVideoElement | null) => {
    if (!el) return
    el.muted = true
    el.setAttribute('muted', '')
    el.setAttribute('playsinline', '')
    const tryPlay = () => { el.play().catch(() => {}) }
    tryPlay()
    let tries = 0
    const iv = setInterval(() => {
      tries++
      if (!el.paused || tries > 12 || !el.isConnected) { clearInterval(iv); return }
      tryPlay()
    }, 400)
    el.addEventListener('touchstart', tryPlay)
  }

  // Transparentes Story-PNG mit dem Sticker an der gewaehlten Position -
  // Instagram legt es als eigenes Element ueber das Original-Video
  const stickerPngBase64 = () => {
    const W = 1080, H = 1920
    const c = document.createElement('canvas'); c.width = W; c.height = H
    const ctx = c.getContext('2d')!
    const { cx, cy } = remapToStoryCanvas(stickerPos.x, stickerPos.y, videoBoxDims.current.w, videoBoxDims.current.h, W, H)
    drawSticker(ctx, W, H, stickerColor, cx, cy, stickerPos.scale)
    return c.toDataURL('image/png').split(',')[1]
  }

  // ── Schritt 1 → 2 ─────────────────────────────────────────────────────
  // Ziel: so wenig Encodes wie moeglich.
  // VIDEO: Filter steckt schon im einzigen Aufnahme-Encode. Ab Build 10
  //   geht das Original unangetastet raus, Sticker als natives IG-Element.
  // BOOMERANG: wird hier EINMAL aus den Rohframes encodiert (mit Filter);
  //   Sticker nativ (Build 10) oder mit eingebrannt (aeltere Builds).
  const handleVideoNext = async () => {
    if (!capturedVideo || videoBusy) return
    if (videoShareRef.current) videoBoxDims.current = { w: videoShareRef.current.offsetWidth, h: videoShareRef.current.offsetHeight }
    const isBoom = !!boomFramesRef.current?.length
    const canNative = hasNativeIG && appBuild >= 10
    // Filter muss nur dann eingebrannt werden, wenn er noch nicht im Video
    // steckt: Boomerang (Rohframes) und native Aufnahmen mit gewaehltem Filter
    const needsFilterBurn = isBoom || (capturedNativeRef.current && filter !== 'original')
    if (!needsFilterBurn && canNative) {
      setStickerNative(true)
      setBurnedVideo(prev => {
        if (prev && prev.url !== capturedVideo.url) URL.revokeObjectURL(prev.url)
        return { url: capturedVideo.url, blob: capturedVideo.blob, mime: capturedVideo.mime }
      })
      setStep('video-share')
      return
    }
    setStickerNative(canNative)
    setVideoBusy(true)
    try {
      const b = await burnVideoOverlay({ withFilter: needsFilterBurn, withSticker: !canNative })
      setBurnedVideo(prev => {
        // capturedVideo.url nie revoken - die Original-Vorschau braucht sie noch
        if (prev && prev.url !== capturedVideo.url) URL.revokeObjectURL(prev.url)
        return { url: URL.createObjectURL(b.blob), blob: b.blob, mime: b.mime }
      })
      setStep('video-share')
    } catch {
      toast.error('Vorbereiten fehlgeschlagen, bitte nochmal versuchen')
    }
    setVideoBusy(false)
  }

  // ── Video an Instagram uebergeben (nativ, sonst System-Share) ────────────
  const shareVideoToIG = async () => {
    if (videoBusy) return
    // Normalfall: fertig eingebranntes Video liegt schon vor
    let share: { blob: Blob; mime: string } | null = burnedVideo
    if (!share && capturedVideo) {
      setVideoBusy(true)
      try { share = await burnVideoOverlay({ withFilter: !!boomFramesRef.current?.length || (capturedNativeRef.current && filter !== 'original'), withSticker: !stickerNative }) } catch { share = capturedVideo }
      setVideoBusy(false)
    }
    if (!share) return

    const native = (window as unknown as {
      Capacitor?: { Plugins?: { InstagramStory?: { shareVideo?: (o: { base64: string; appId?: string; stickerBase64?: string }) => Promise<{ shared: boolean }> } } }
    }).Capacitor?.Plugins?.InstagramStory
    if (native?.shareVideo) {
      try {
        const base64 = await new Promise<string>((res, rej) => {
          const r = new FileReader()
          r.onload = () => res((r.result as string).split(',')[1])
          r.onerror = rej
          r.readAsDataURL(share.blob)
        })
        const out = await native.shareVideo({
          base64,
          appId: process.env.NEXT_PUBLIC_META_APP_ID ?? '1100803475748097',
          // Original-Modus: Sticker als eigenes Instagram-Element obendrauf
          ...(stickerNative ? { stickerBase64: stickerPngBase64() } : {}),
        })
        if (out?.shared) return
      } catch { /* Fallback unten */ }
    }
    const ext = share.mime.includes('mp4') ? 'mp4' : 'webm'
    const file = new File([share.blob], `pistazz-story.${ext}`, { type: share.mime })
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
    setCapturedSrc(null); setTextBlocks([]); setStickerPos({ x: 0.5, y: 0.5, scale: 1.0 })
    if (exportedBlobUrl) { URL.revokeObjectURL(exportedBlobUrl); setExportedBlobUrl(null) }
    setExportedBlob(null)
    if (capturedVideo) { URL.revokeObjectURL(capturedVideo.url); setCapturedVideo(null) }
    if (burnedVideo) { URL.revokeObjectURL(burnedVideo.url); setBurnedVideo(null) }
    burnedVideoRef.current = null
    boomFramesRef.current = null
    capturedNativeRef.current = false
    setVidDiag('')
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
      if (nativeCamRef.current) { getNativeCam()?.stop().catch(() => {}); nativeCamRef.current = false; setNativeCam(false) }
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
            In Instagram einfügen, dann in der Vorschlagsliste den <strong className="text-white/70">Account antippen</strong> und nicht nur eintippen, sonst zählt der Tag nicht.
          </p>

          {hasNativeIG ? (
            /* Direkte Bild-Uebergabe: kein Speichern, kein Galerie-Umweg */
            <p className="text-[#8BB06A] text-[12px] leading-snug text-center">
              ✨ Dein Bild wird <strong>automatisch an Instagram übergeben</strong>, einfach unten tippen.
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
  // Render: Video/Boomerang Schritt 1 - Bearbeiten (Sticker + Filter, Vollbild)
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 'video-edit' && capturedVideo) {
    // Web-VIDEO: Filter steckt schon in der Aufnahme (Live-GPU-Burn).
    // BOOMERANG + NATIVE Aufnahmen: Filter erst beim Teilen - hier waehlbar,
    // Vorschau per CSS.
    const isBoomEdit = !!boomFramesRef.current?.length || capturedNativeRef.current
    return (
      <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">
        <div ref={videoShareRef} className="flex-1 relative overflow-hidden">
          <video
            src={capturedVideo.url}
            autoPlay loop muted playsInline preload="auto"
            ref={forcePlay}
            onLoadedData={e => { e.currentTarget.play().catch(() => {}) }}
            onLoadedMetadata={e => {
              const d = e.currentTarget.duration
              if (isFinite(d) && d > 0 && capturedVideo) {
                setVidDiag(`${d.toFixed(1)}s · ${(capturedVideo.blob.size * 8 / d / 1e6).toFixed(1)} Mbit/s · ${(capturedVideo.blob.size / 1e6).toFixed(1)} MB`)
              }
            }}
            className="absolute inset-0 w-full h-full object-contain"
            style={{ filter: isBoomEdit && filterCss !== 'none' ? filterCss : undefined }}
          />
          {/* Temporaere Diagnose: tatsaechliche Encoder-Leistung des Geraets */}
          {vidDiag && (
            <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/50 text-white/60 text-[10px] pointer-events-none z-10">
              {vidDiag}
            </div>
          )}
          {/* Sticker: verschiebbar, rastet mittig ein, wird beim Weiter eingebrannt */}
          <StickerOverlay
            color={stickerColor} onColorChange={setStickerColor}
            x={stickerPos.x} y={stickerPos.y} scale={stickerPos.scale}
            onUpdate={(x, y, scale) => setStickerPos({ x, y, scale })}
            containerRef={videoShareRef}
          />
          <button
            onClick={retake}
            className="absolute left-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white z-30"
            style={{ top: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}
          >
            <X className="w-5 h-5" />
          </button>
          {videoBusy && (
            <div className="absolute inset-0 z-40 bg-black/60 flex flex-col items-center justify-center pointer-events-none">
              <span className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="mt-3 text-white text-sm font-semibold">Video wird vorbereitet…</span>
            </div>
          )}
        </div>
        <div
          className="bg-black pt-1"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 12px) + 10px)' }}
        >
          {isBoomEdit && <FilterStrip selected={filter} onChange={setFilter} />}
          <div className="px-5 pt-1">
            <button
              onClick={handleVideoNext}
              disabled={videoBusy}
              className="w-full py-3.5 rounded-2xl gradient-primary text-white font-bold text-base flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {videoBusy ? 'Video wird vorbereitet…' : 'Weiter'}
              <span className="text-white/80 text-lg leading-none">›</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Video/Boomerang Schritt 2 - fertige Story teilen
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 'video-share' && burnedVideo) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">
        <div ref={videoFinalRef} className="flex-1 relative overflow-hidden">
          {/* Finale Vorschau: exakt das Video, das an Instagram geht */}
          <video
            src={burnedVideo.url}
            autoPlay loop muted playsInline preload="auto"
            ref={forcePlay}
            onLoadedData={e => { e.currentTarget.play().catch(() => {}) }}
            className="absolute inset-0 w-full h-full object-contain"
          />
          {/* Original-Modus: Sticker ist nicht eingebrannt, sondern geht als
              eigenes Element an Instagram - hier nur zur Ansicht */}
          {stickerNative && (
            <StickerOverlay
              readOnly
              color={stickerColor} onColorChange={() => {}}
              x={stickerPos.x} y={stickerPos.y} scale={stickerPos.scale}
              onUpdate={() => {}}
              containerRef={videoFinalRef}
            />
          )}
          <button
            onClick={() => setStep('video-edit')}
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
          <button
            onClick={shareVideoToIG}
            disabled={videoBusy}
            className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 active:opacity-80 transition-opacity disabled:opacity-60"
            style={{ background: 'linear-gradient(90deg,#f09433 0%,#dc2743 55%,#bc1888 100%)' }}
          >
            <svg width="24" height="24" viewBox="0 0 18 18" fill="none" className="shrink-0">
              <circle cx="9" cy="9" r="3.5" stroke="white" strokeWidth="1.5" fill="none"/>
              <circle cx="13.2" cy="4.8" r="1" fill="white"/>
              <rect x="1" y="1" width="16" height="16" rx="4.5" stroke="white" strokeWidth="1.5" fill="none"/>
            </svg>
            <span className="text-white font-bold text-base flex-1 text-left">Story in Instagram teilen</span>
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
    <div
      className="fixed inset-0 bg-black overflow-hidden select-none"
      style={{
        touchAction: 'none',
        overscrollBehavior: 'none',
        // Kein iOS-Textmarkieren/Copy-Callout bei langem Druecken (z.B.
        // Halten fuer Video) - in der Kamera gibt es nichts zu kopieren
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
        // Native Kamera liegt HINTER der WebView: hier durchsichtig werden,
        // damit die echte Vorschau durchscheint (Loch in der Seite)
        ...(nativeCam && step === 'capture' ? { background: 'transparent' } : {}),
      } as React.CSSProperties}
    >

      {/* Hidden helpers */}
      <input ref={galleryInput} type="file" accept="image/*" className="hidden" onChange={handleGalleryPick} />
      <canvas ref={captureCanvas} className="hidden" />

      {/* ── CAMERA / PHOTO — echtes Story-Format 9:16, zentriert (WYSIWYG zum Export) ── */}
      <div className="absolute inset-0 flex items-center justify-center">
      <div
        ref={cameraContainerRef}
        className="relative overflow-hidden rounded-2xl"
        style={{
          // WICHTIG: exakt 9:16 erzwingen. Vorher gewann height:100% den
          // Konflikt mit maxWidth -> Container wurde ~9:19.5 (volle
          // Bildschirmhoehe) und object-cover musste seitlich MASSIV
          // beschneiden = zusaetzlicher kuenstlicher Zoom.
          aspectRatio: '9 / 16',
          width: 'min(100%, calc(100dvh * 9 / 16))',
          height: 'auto',
          maxHeight: '100%',
          // Native Kamera: Box durchsichtig, Balken drumherum schwarz
          ...(nativeCam && step === 'capture'
            ? { background: 'transparent', boxShadow: '0 0 0 200vmax #000' }
            : {}),
        }}
      >

        {/* Live camera feed (Web-Fallback; nativ rendert AVFoundation dahinter) */}
        {step === 'capture' && !camError && !nativeCam && (
          <video ref={videoRef} playsInline muted autoPlay
            disablePictureInPicture
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              transform: `scale(${facingMode === 'user' ? -cssZoom : cssZoom}, ${cssZoom})`,
              // Filter wird schon in der Kamera gewaehlt (wie bei Instagram) -
              // Vorschau per CSS, in die Aufnahme brennt ihn der GPU-Shader live
              filter: [filterCss === 'none' ? '' : filterCss, brightness !== 1 ? `brightness(${brightness})` : ''].filter(Boolean).join(' ') || undefined,
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
            onTouchEnd={handleViewTouchEnd}
            onClick={handleViewTap}
          >
            {/* AE/AF im Apple-Stil: Rahmen mit Sonne rechts daneben -
                vertikal ziehen regelt die Belichtung, alles animiert */}
            {focusPt && (
              <div
                className="absolute pointer-events-none"
                style={{ left: `${focusPt.x * 100}%`, top: `${focusPt.y * 100}%` }}
              >
                <div
                  key={focusPt.key}
                  className="w-[76px] h-[76px] -ml-[38px] -mt-[38px] border border-yellow-300"
                  style={{ animation: 'aeIn 0.28s ease-out', boxShadow: '0 0 10px rgba(0,0,0,0.35)' }}
                />
                <div className="absolute" style={{ left: 52, top: -60, height: 120, width: 24 }}>
                  <div className="absolute left-1/2 -translate-x-1/2 w-px bg-yellow-300/70" style={{ top: 0, bottom: 0 }} />
                  <span
                    className="absolute left-1/2 -translate-x-1/2 text-yellow-300 text-xl leading-none drop-shadow"
                    style={{
                      top: `calc(50% - 11px + ${(1 - (brightness - 0.4) / 1.2) * 88 - 44}px)`,
                      transition: 'top 0.05s linear',
                    }}
                  >☀︎</span>
                </div>
              </div>
            )}
            {/* Pause-Hinweis */}
            {recording && recPaused && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-white text-xs font-bold pointer-events-none">
                ⏸ Pausiert
              </div>
            )}
            {/* Zoom-Anzeige */}
            {zoom > 1.05 && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-black/50 text-white text-xs font-semibold pointer-events-none">
                {zoom.toFixed(1)}×
              </div>
            )}
            {/* Boomerang-Status: klar sichtbar, was gerade passiert */}
            {boomPhase === 'rec' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-6xl font-black animate-pulse drop-shadow-lg" style={{ color: '#8BB06A' }}>∞</span>
                <span className="mt-2 px-3 py-1 rounded-full text-white text-xs font-bold tracking-widest uppercase flex items-center gap-1.5" style={{ background: 'rgba(139,176,106,0.92)' }}>
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  Boomerang läuft
                </span>
              </div>
            )}
            {boomPhase === 'enc' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none bg-black/40">
                <span className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="mt-3 text-white text-sm font-semibold">Boomerang wird erstellt…</span>
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

      {/* ── SO GIBT'S PUNKTE: Anleitung vor dem Erstellen — unten in
             Daumenreichweite; X = nur fuer jetzt weg, "Okay" = diese Sitzung,
             "Nicht mehr anzeigen" = dauerhaft ── */}
      {step === 'capture' && !howtoDismissed && (
        <div
          className="absolute inset-x-4 z-40"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 12px) + 330px)' }}
        >
          <div className="rounded-2xl bg-black/75 backdrop-blur-md border border-white/15 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-white font-bold text-sm">So bekommst du deine Punkte</p>
              <button
                onClick={() => setHowtoDismissed(true)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/70"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ol className="space-y-1.5 text-white/80 text-[13px] leading-snug">
              <li><strong className="text-white">1.</strong> Foto oder Video aufnehmen und Sticker platzieren</li>
              <li><strong className="text-white">2.</strong> Auf „Teilen“ tippen, deine Story geht direkt an Instagram</li>
              <li><strong className="text-white">3.</strong> Zurück in der App: Kassenbon fotografieren (Beweis, dass du vor Ort bist)</li>
              <li><strong className="text-white">4.</strong> Punkte anfordern. Fertig!</li>
            </ol>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => { setHowtoDismissed(true); sessionStorage.setItem('storyHowto', '1') }}
                className="flex-1 py-2.5 rounded-xl gradient-primary text-white font-bold text-[13px]"
              >
                Okay, verstanden
              </button>
              <button
                onClick={() => { setHowtoDismissed(true); localStorage.setItem('storyHowtoNever', '1') }}
                className="flex-1 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white/70 font-semibold text-[13px]"
              >
                Nicht mehr anzeigen
              </button>
            </div>
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
              {captureMode === 'video' && recording ? (
                /* Video: Pause/Weiter - Aufnahme laeuft nach Fortsetzen
                   weiter, bis Stopp oder die 15s voll sind */
                <button
                  onClick={pauseResumeRecording}
                  className={`w-14 h-14 rounded-2xl border flex items-center justify-center text-white transition-colors ${
                    recPaused ? 'bg-[#8BB06A] border-[#8BB06A]' : 'bg-white/10 border-white/20'
                  }`}
                >
                  {recPaused
                    ? <span className="text-xl leading-none">▶</span>
                    : <span className="text-xl leading-none">⏸</span>}
                </button>
              ) : (
                <button
                  onClick={() => galleryInput.current?.click()}
                  className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white/70"
                >
                  <ImagePlus className="w-6 h-6" />
                </button>
              )}

              {/* Ausloeser: Tap = Foto (Story) / Start-Stopp (Video, freihaendig) /
                  Boomerang. Halten in STORY = Video aufnehmen wie bei Instagram.
                  Waehrend der Aufnahme: gruener Fortschrittsring (15s) + Sekunden. */}
              <div className="relative w-[78px] h-[78px]">
                {recording && (
                  <>
                    <svg className="absolute -inset-2 pointer-events-none -rotate-90" width="94" height="94" viewBox="0 0 94 94">
                      <circle cx="47" cy="47" r="43" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="5" />
                      <circle
                        cx="47" cy="47" r="43" fill="none" stroke="#8BB06A" strokeWidth="5" strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 43}
                        strokeDashoffset={2 * Math.PI * 43 * (1 - Math.min(recSecs, 15) / 15)}
                        style={{ transition: 'stroke-dashoffset 1s linear' }}
                      />
                    </svg>
                    <span className="absolute -right-12 top-1/2 -translate-y-1/2 text-white font-bold text-sm tabular-nums pointer-events-none">
                      {recSecs}s
                    </span>
                  </>
                )}
                <button
                  onPointerDown={handleShutterDown}
                  onPointerUp={handleShutterUp}
                  onPointerCancel={() => { if (holdTimerRef.current) clearTimeout(holdTimerRef.current); if (holdActiveRef.current) stopRecording() }}
                  disabled={camError || boomBusy}
                  className={`w-full h-full rounded-full border-[4px] flex items-center justify-center disabled:opacity-30 transition-colors ${
                    recording ? 'border-[#8BB06A]' : 'border-white'
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
              </div>

              <div className="w-14 h-14" />
            </div>
            {/* Filter schon in der Kamera waehlen (wie Instagram) - so wird er
                direkt beim einzigen Encode mit aufgenommen, null Extra-Verlust.
                Native Kamera: Filterwahl kommt im Bearbeiten-Schritt danach. */}
            {!recording && !boomBusy && !nativeCam && (
              <FilterStrip selected={filter} onChange={setFilter} />
            )}
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
