'use client'

export const FILTERS = [
  { id: 'original',  name: 'Original',  css: 'none' },
  { id: 'clarendon', name: 'Clarendon', css: 'contrast(1.2) saturate(1.35) brightness(1.05)' },
  { id: 'juno',      name: 'Juno',      css: 'saturate(1.4) contrast(1.1) hue-rotate(345deg) brightness(1.05)' },
  { id: 'lark',      name: 'Lark',      css: 'brightness(1.1) contrast(0.9) saturate(0.85)' },
  { id: 'reyes',     name: 'Reyes',     css: 'sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)' },
  { id: 'lofi',      name: 'Lo-Fi',     css: 'contrast(1.5) saturate(1.1) brightness(0.9)' },
  { id: 'xpro',      name: 'X-Pro II',  css: 'contrast(1.45) saturate(1.3) sepia(0.1) brightness(0.95)' },
  { id: 'earlybird', name: 'Earlybird', css: 'sepia(0.4) contrast(0.9) brightness(1.1) saturate(0.85)' },
  { id: 'hudson',    name: 'Hudson',    css: 'brightness(1.15) contrast(0.9) saturate(1.1) hue-rotate(195deg)' },
  { id: 'valencia',  name: 'Valencia',  css: 'sepia(0.08) brightness(1.08) contrast(0.9) saturate(1.1) hue-rotate(350deg)' },
  { id: 'nashville', name: 'Nashville', css: 'sepia(0.2) contrast(1.2) brightness(1.05) saturate(1.2) hue-rotate(350deg)' },
  { id: 'rise',      name: 'Rise',      css: 'brightness(1.2) sepia(0.15) contrast(0.9) saturate(1.1)' },
  { id: 'slumber',   name: 'Slumber',   css: 'saturate(0.6) brightness(1.05) sepia(0.08)' },
  { id: 'willow',    name: 'Willow',    css: 'grayscale(0.5) contrast(0.95) brightness(1.05)' },
  { id: 'inkwell',   name: 'Inkwell',   css: 'grayscale(1) brightness(1.05) contrast(1.1)' },
  { id: 'noir',      name: 'Noir',      css: 'grayscale(1) contrast(1.5) brightness(0.85)' },
] as const

export type FilterId = typeof FILTERS[number]['id']
export type Filter   = typeof FILTERS[number]

interface FilterStripProps {
  selected: FilterId
  onChange: (id: FilterId) => void
  /** Optional: captured image dataURL for live thumbnail preview */
  previewSrc?: string | null
}

export function FilterStrip({ selected, onChange, previewSrc }: FilterStripProps) {
  return (
    <div
      className="flex gap-3 overflow-x-auto no-scrollbar px-5 pb-2"
      style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', paddingTop: 8, paddingBottom: 10, scrollPaddingInline: 20 }}
    >
      {FILTERS.map(f => {
        const active = f.id === selected
        return (
          <button
            key={f.id}
            onClick={() => onChange(f.id)}
            className="flex flex-col items-center gap-1.5 shrink-0 px-1"
            style={{ scrollSnapAlign: 'center' }}
          >
            <div
              className={`rounded-full overflow-hidden transition-all duration-150 ${
                active
                  ? 'border-[3px] border-white scale-110 shadow-[0_0_12px_rgba(255,255,255,0.5)]'
                  : 'border-[2px] border-white/25 opacity-65'
              }`}
              style={{ width: 60, height: 60 }}
            >
              {previewSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewSrc}
                  alt={f.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', filter: f.css }}
                />
              ) : (
                <div
                  style={{
                    width: '100%', height: '100%',
                    // Varied rainbow gradient so each CSS filter looks clearly different
                    background: 'linear-gradient(145deg, #f9a825 0%, #e91e63 28%, #7b1fa2 52%, #1565c0 76%, #2e7d32 100%)',
                    filter: f.css,
                  }}
                />
              )}
            </div>
            <span className={`text-[11px] font-semibold tracking-wide ${active ? 'text-white' : 'text-white/55'}`}>
              {f.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}
