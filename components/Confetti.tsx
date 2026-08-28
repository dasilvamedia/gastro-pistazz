'use client'

import { useEffect, useRef } from 'react'

// Leichtgewichtiger Canvas-Konfetti-Burst ohne externe Abhaengigkeit.
const COLORS = ['#8BB06A', '#E5B84C', '#E86B5A', '#577A3D', '#ffffff']

interface Particle {
  x: number; y: number; vx: number; vy: number
  size: number; rotation: number; rotationSpeed: number; color: string
}

export function Confetti({ trigger }: { trigger: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (trigger === 0) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = window.innerWidth * dpr
    canvas.height = window.innerHeight * dpr
    ctx.scale(dpr, dpr)

    const particles: Particle[] = Array.from({ length: 140 }, () => ({
      x: window.innerWidth / 2,
      y: window.innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 14,
      vy: Math.random() * -12 - 4,
      size: Math.random() * 7 + 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }))

    let raf: number
    let frame = 0
    const gravity = 0.45

    const tick = () => {
      frame++
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      let alive = false
      for (const p of particles) {
        p.vy += gravity
        p.x += p.vx
        p.y += p.vy
        p.rotation += p.rotationSpeed
        if (p.y < window.innerHeight + 40) alive = true
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        ctx.restore()
      }
      if (alive && frame < 240) raf = requestAnimationFrame(tick)
      else ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [trigger])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[999]"
      style={{ width: '100vw', height: '100vh' }}
    />
  )
}
