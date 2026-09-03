'use client'

import { MIN_RADIUS_KM, MAX_RADIUS_KM } from '@/lib/geo'

// Umkreis wie ein Lautstaerkeregler: 1 bis 50 km, pistazz-gruene Spur
// (.pz-range in globals.css), 44 px Hit-Area fuer den Daumen.
export function RadiusSlider({
  value, onChange, onCommit, compact,
}: {
  value: number
  onChange: (km: number) => void
  onCommit?: (km: number) => void
  compact?: boolean
}) {
  return (
    <div className={compact ? '' : 'space-y-1'}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-[#1C1F1A]">Umkreis: {value} km</span>
        {!compact && <span className="text-[#6D9450]">{MIN_RADIUS_KM} bis {MAX_RADIUS_KM} km</span>}
      </div>
      <input
        type="range"
        min={MIN_RADIUS_KM}
        max={MAX_RADIUS_KM}
        step={1}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        onPointerUp={e => onCommit?.(Number((e.target as HTMLInputElement).value))}
        onKeyUp={e => onCommit?.(Number((e.target as HTMLInputElement).value))}
        aria-label="Umkreis in Kilometern"
        className="pz-range w-full"
        style={{ ['--pz-range-pct' as string]: `${((value - MIN_RADIUS_KM) / (MAX_RADIUS_KM - MIN_RADIUS_KM)) * 100}%` }}
      />
    </div>
  )
}
