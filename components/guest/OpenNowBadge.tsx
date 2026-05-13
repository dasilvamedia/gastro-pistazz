'use client'

import { useMemo } from 'react'

interface DayHours {
  open: string
  close: string
  closed?: boolean
}

interface OpenNowBadgeProps {
  openingHours: Record<string, DayHours | undefined> | null | undefined
  className?: string
}

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function isOpenNow(openingHours: Record<string, DayHours | undefined> | null | undefined): boolean | null {
  if (!openingHours) return null

  const now = new Date()
  const dayKey = DAY_KEYS[now.getDay()]
  const hours = openingHours[dayKey]

  if (!hours || hours.closed || !hours.open || !hours.close) return false

  const [openH, openM] = hours.open.split(':').map(Number)
  const [closeH, closeM] = hours.close.split(':').map(Number)
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const openMinutes = openH * 60 + openM
  let closeMinutes = closeH * 60 + closeM
  if (closeMinutes <= openMinutes) closeMinutes += 24 * 60

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes
}

export default function OpenNowBadge({ openingHours, className = '' }: OpenNowBadgeProps) {
  const open = useMemo(() => isOpenNow(openingHours), [openingHours])

  if (open === null) return null

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
        open
          ? 'bg-green-100 text-green-700'
          : 'bg-red-50 text-red-600'
      } ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${open ? 'bg-green-500' : 'bg-red-500'}`}
        style={open ? { animation: 'pulse 2s ease-in-out infinite' } : {}}
      />
      {open ? 'Jetzt geöffnet' : 'Geschlossen'}
    </span>
  )
}
