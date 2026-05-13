'use client'

import { useState, useRef } from 'react'

export interface TextBlock {
  id: string
  text: string
  /** 0–1 relative to container */
  x: number
  y: number
  color: '#ffffff' | '#000000' | '#FFE066'
  fontSize: number
}

const COLORS: TextBlock['color'][] = ['#ffffff', '#000000', '#FFE066']
const SIZES = [18, 24, 32]

interface TextOverlayProps {
  blocks: TextBlock[]
  onChange: (blocks: TextBlock[]) => void
}

export function TextOverlay({ blocks, onChange }: TextOverlayProps) {
  const [editing, setEditing] = useState<string | null>(null)
  const [draft,   setDraft]   = useState('')
  const [color,   setColor]   = useState<TextBlock['color']>('#ffffff')
  const [size,    setSize]    = useState(24)
  const containerRef = useRef<HTMLDivElement>(null)

  const addBlock = () => {
    const id = Date.now().toString()
    setEditing(id)
    setDraft('')
    onChange([...blocks, { id, text: '', x: 0.5, y: 0.4, color, fontSize: size }])
  }

  const commitEdit = () => {
    if (!editing) return
    if (!draft.trim()) {
      onChange(blocks.filter(b => b.id !== editing))
    } else {
      onChange(blocks.map(b => b.id === editing ? { ...b, text: draft.trim(), color, fontSize: size } : b))
    }
    setEditing(null)
  }

  const startEdit = (block: TextBlock) => {
    setEditing(block.id)
    setDraft(block.text)
    setColor(block.color)
    setSize(block.fontSize)
  }

  const handleDrag = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()

    const move = (clientX: number, clientY: number) => {
      const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
      const y = Math.min(1, Math.max(0, (clientY - rect.top)  / rect.height))
      onChange(blocks.map(b => b.id === id ? { ...b, x, y } : b))
    }

    if ('touches' in e) {
      const onMove = (te: TouchEvent) => move(te.touches[0].clientX, te.touches[0].clientY)
      const onEnd  = () => { window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd) }
      window.addEventListener('touchmove', onMove)
      window.addEventListener('touchend',  onEnd)
    } else {
      const onMove = (me: MouseEvent) => move(me.clientX, me.clientY)
      const onUp   = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup',   onUp)
    }
  }

  return (
    <>
      {/* Drag container (covers the story canvas) */}
      <div ref={containerRef} className="absolute inset-0 pointer-events-none">
        {blocks.map(block => (
          <div
            key={block.id}
            className="absolute pointer-events-auto cursor-move select-none"
            style={{
              left: `${block.x * 100}%`,
              top:  `${block.y * 100}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: block.fontSize,
              color: block.color,
              fontWeight: 700,
              textShadow: block.color === '#000000'
                ? '0 1px 4px rgba(255,255,255,0.6)'
                : '0 1px 6px rgba(0,0,0,0.7)',
              whiteSpace: 'pre-wrap',
              maxWidth: '80%',
              textAlign: 'center',
              lineHeight: 1.2,
            }}
            onMouseDown={e => { e.stopPropagation(); handleDrag(block.id, e) }}
            onTouchStart={e => { e.stopPropagation(); handleDrag(block.id, e) }}
            onDoubleClick={() => startEdit(block)}
          >
            {block.text || <span className="opacity-50">Tippe hier…</span>}
          </div>
        ))}
      </div>

      {/* Text editor panel */}
      {editing && (
        <div className="absolute inset-x-0 bottom-0 z-50 bg-black/80 backdrop-blur-md p-4 space-y-3">
          {/* Color + size controls */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              {SIZES.map(s => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`px-2 py-0.5 rounded text-white text-xs font-bold ${size === s ? 'bg-white/30' : 'opacity-50'}`}
                >
                  {s === 18 ? 'S' : s === 24 ? 'M' : 'L'}
                </button>
              ))}
            </div>
          </div>

          <textarea
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Text eingeben…"
            rows={3}
            className="w-full bg-white/10 text-white placeholder-white/40 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none"
            style={{ fontSize: size * 0.7, color, fontWeight: 700 }}
          />
          <div className="flex gap-3">
            <button
              onClick={() => { onChange(blocks.filter(b => b.id !== editing)); setEditing(null) }}
              className="flex-1 py-2 rounded-xl border border-white/30 text-white/70 text-sm"
            >
              Löschen
            </button>
            <button
              onClick={commitEdit}
              className="flex-1 py-2 rounded-xl bg-white text-black font-semibold text-sm"
            >
              Fertig
            </button>
          </div>
        </div>
      )}

      {/* "Aa" button — left sidebar, below top bar */}
      <button
        data-add-text
        onClick={addBlock}
        className="absolute left-4 z-40 w-11 h-11 rounded-full bg-black/35 backdrop-blur-sm border border-white/25 flex items-center justify-center text-white font-bold text-[15px]"
        style={{ top: '80px' }}
      >
        Aa
      </button>
    </>
  )
}
