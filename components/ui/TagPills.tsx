import { CUISINE_LABEL, CUISINE_EMOJI, DIETARY_LABEL, DIETARY_EMOJI } from '@/lib/restaurantTags'

type Variant = 'light' | 'dark' | 'glass'

const STYLES: Record<Variant, { cuisine: React.CSSProperties; dietary: React.CSSProperties }> = {
  light: {
    cuisine: { background: '#F3F4F6', color: '#374151' },
    dietary: { background: '#EEF5E6', color: '#3D7A22' },
  },
  dark: {
    cuisine: { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)' },
    dietary: { background: 'rgba(139,176,106,0.25)', color: '#D4E8C2' },
  },
  glass: {
    cuisine: { background: 'rgba(0,0,0,0.25)', color: 'rgba(255,255,255,0.9)' },
    dietary: { background: 'rgba(139,176,106,0.55)', color: '#fff' },
  },
}

// Kueche- und Ernaehrungs-Tags als kleine Pills. Wird auf Restaurantseite,
// Entdecken-Karten, Kartenvorschau, /r/[slug] und Favoriten genutzt.
export function TagPills({
  cuisine = [], dietary = [], variant = 'light', max, className = '',
}: {
  cuisine?: string[] | null
  dietary?: string[] | null
  variant?: Variant
  /** Obergrenze je Gruppe (Karten), ohne Wert alle */
  max?: number
  className?: string
}) {
  const c = (cuisine ?? []).filter(v => CUISINE_LABEL[v]).slice(0, max ?? 99)
  const d = (dietary ?? []).filter(v => DIETARY_LABEL[v]).slice(0, max ?? 99)
  if (c.length === 0 && d.length === 0) return null
  const s = STYLES[variant]
  const pill: React.CSSProperties = { fontSize: '0.72rem', fontWeight: 500, borderRadius: 99, padding: '2px 8px', whiteSpace: 'nowrap' }
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {c.map(v => (
        <span key={`c-${v}`} style={{ ...pill, ...s.cuisine }}>{CUISINE_EMOJI[v]} {CUISINE_LABEL[v]}</span>
      ))}
      {d.map(v => (
        <span key={`d-${v}`} style={{ ...pill, ...s.dietary }}>{DIETARY_EMOJI[v]} {DIETARY_LABEL[v]}</span>
      ))}
    </div>
  )
}
