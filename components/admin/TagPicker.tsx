'use client'

import { CUISINE_OPTIONS, DIETARY_OPTIONS, MAX_CUISINE } from '@/lib/restaurantTags'

// Chips zum Setzen von Kueche (max. 3) und Ernaehrung. Owner-Profil und
// Admin-Editor nutzen dieselbe Komponente.
export function TagPicker({
  cuisine, dietary, onChange,
}: {
  cuisine: string[]
  dietary: string[]
  onChange: (next: { cuisine: string[]; dietary: string[] }) => void
}) {
  const toggleCuisine = (v: string) => {
    if (cuisine.includes(v)) onChange({ cuisine: cuisine.filter(x => x !== v), dietary })
    else if (cuisine.length < MAX_CUISINE) onChange({ cuisine: [...cuisine, v], dietary })
  }
  const toggleDietary = (v: string) => {
    onChange({ cuisine, dietary: dietary.includes(v) ? dietary.filter(x => x !== v) : [...dietary, v] })
  }
  const chip = (active: boolean, disabled: boolean) =>
    `px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
      active ? 'bg-[#8BB06A] text-white shadow-sm' : disabled ? 'bg-gray-50 text-gray-300' : 'bg-[#EEF5E6] text-[#577A3D] hover:bg-[#D4E8C2]'
    }`

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-[#1C1F1A]">Küche</p>
          <span className="text-xs text-gray-400">{cuisine.length} / {MAX_CUISINE}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {CUISINE_OPTIONS.map(o => {
            const active = cuisine.includes(o.value)
            const disabled = !active && cuisine.length >= MAX_CUISINE
            return (
              <button key={o.value} type="button" onClick={() => toggleCuisine(o.value)} disabled={disabled} className={chip(active, disabled)}>
                {o.emoji} {o.label}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 mt-2">Bis zu drei Richtungen. Gäste filtern danach in der App.</p>
      </div>
      <div>
        <p className="text-sm font-medium text-[#1C1F1A] mb-2">Ernährung</p>
        <div className="flex flex-wrap gap-2">
          {DIETARY_OPTIONS.map(o => (
            <button key={o.value} type="button" onClick={() => toggleDietary(o.value)} className={chip(dietary.includes(o.value), false)}>
              {o.emoji} {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
