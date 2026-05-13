'use client'

type DayHours = { open: string; close: string; closed?: boolean }
type OpeningHours = Record<string, DayHours | undefined>

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

function isOpenNow(hours: OpeningHours): boolean {
  const now = new Date()
  const dayKey = DAY_KEYS[now.getDay()]
  const day = hours[dayKey]
  if (!day || day.closed) return false
  const cur = now.getHours() * 60 + now.getMinutes()
  const open = parseTime(day.open)
  const close = parseTime(day.close)
  if (close <= open) return cur >= open || cur < close
  return cur >= open && cur < close
}

interface Props {
  opening_hours: OpeningHours | null | undefined
  className?: string
}

export function OpenNowBadge({ opening_hours, className = '' }: Props) {
  if (!opening_hours) return null
  const open = isOpenNow(opening_hours)
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
        open
          ? 'bg-green-100 text-green-700'
          : 'bg-red-100 text-red-600'
      } ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${open ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`} />
      {open ? 'Jetzt geöffnet' : 'Geschlossen'}
    </span>
  )
}
