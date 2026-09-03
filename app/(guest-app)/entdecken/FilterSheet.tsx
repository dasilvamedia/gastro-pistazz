'use client'

import { motion } from 'framer-motion'
import type { RestaurantType } from '@/types'
import { RESTAURANT_TYPE_LABELS } from '@/types'
import { CUISINE_OPTIONS, DIETARY_OPTIONS } from '@/lib/restaurantTags'

export type FilterType = RestaurantType | 'alle'

export const filterOptions: { value: FilterType; label: string }[] = [
  { value: 'alle', label: 'Alle' },
  ...(Object.keys(RESTAURANT_TYPE_LABELS) as RestaurantType[]).map(t => ({ value: t, label: RESTAURANT_TYPE_LABELS[t] })),
]

// Filter-Sheet: Typ (einer), Kueche (mehrere, ODER), Ernaehrung (mehrere, UND).
export function FilterSheet({
  filter, setFilter, cuisine, setCuisine, dietary, setDietary, onClose, resultCount,
}: {
  filter: FilterType
  setFilter: (f: FilterType) => void
  cuisine: string[]
  setCuisine: (v: string[]) => void
  dietary: string[]
  setDietary: (v: string[]) => void
  onClose: () => void
  resultCount: number
}) {
  const toggle = (list: string[], v: string, set: (n: string[]) => void) =>
    set(list.includes(v) ? list.filter(x => x !== v) : [...list, v])
  const chip = (active: boolean) =>
    `px-3.5 py-2 rounded-full text-sm font-medium transition-all ${active ? 'gradient-primary text-white shadow-sm' : 'bg-[#EEF5E6] text-[#6D9450]'}`
  const activeCount = (filter !== 'alle' ? 1 : 0) + cuisine.length + dietary.length

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/30 z-[1002]"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="absolute bottom-0 inset-x-0 z-[1003] bg-white/95 backdrop-blur-2xl rounded-t-3xl px-5 pt-3 flex flex-col"
        style={{ boxShadow: '0 -8px 32px rgba(0,0,0,0.12)', border: '1px solid rgba(255,255,255,0.6)', maxHeight: '75vh', paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
      >
        <div className="w-10 h-1 rounded-full bg-black/10 mx-auto mb-4 shrink-0" />
        <div className="overflow-y-auto no-scrollbar space-y-6 pb-2">
          <section>
            <h3 className="text-base font-semibold text-[#1C1F1A] mb-3">Typ</h3>
            <div className="flex flex-wrap gap-2">
              {filterOptions.map(f => (
                <button key={f.value} onClick={() => setFilter(f.value)} className={chip(filter === f.value)}>{f.label}</button>
              ))}
            </div>
          </section>
          <section>
            <h3 className="text-base font-semibold text-[#1C1F1A] mb-1">Küche</h3>
            <p className="text-xs text-[#6D9450] mb-3">Mehrere möglich, es reicht eine Übereinstimmung.</p>
            <div className="flex flex-wrap gap-2">
              {CUISINE_OPTIONS.map(o => (
                <button key={o.value} onClick={() => toggle(cuisine, o.value, setCuisine)} className={chip(cuisine.includes(o.value))}>
                  {o.emoji} {o.label}
                </button>
              ))}
            </div>
          </section>
          <section>
            <h3 className="text-base font-semibold text-[#1C1F1A] mb-1">Ernährung</h3>
            <p className="text-xs text-[#6D9450] mb-3">Alle gewählten müssen zutreffen.</p>
            <div className="flex flex-wrap gap-2">
              {DIETARY_OPTIONS.map(o => (
                <button key={o.value} onClick={() => toggle(dietary, o.value, setDietary)} className={chip(dietary.includes(o.value))}>
                  {o.emoji} {o.label}
                </button>
              ))}
            </div>
          </section>
        </div>
        <div className="flex gap-3 pt-4 shrink-0 border-t border-[#EEF5E6] mt-2">
          <button
            onClick={() => { setFilter('alle'); setCuisine([]); setDietary([]) }}
            disabled={activeCount === 0}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold bg-[#EEF5E6] text-[#577A3D] disabled:opacity-40"
          >
            Zurücksetzen
          </button>
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl text-sm font-bold gradient-primary text-white">
            Anwenden ({resultCount})
          </button>
        </div>
      </motion.div>
    </>
  )
}
