'use client'

type DayHours = { open: string; close: string; closed?: boolean }
type OpeningHours = Record<string, DayHours | undefined>

const DAYS: { key: string; label: string }[] = [
  { key: 'monday',    label: 'Montag'     },
  { key: 'tuesday',   label: 'Dienstag'   },
  { key: 'wednesday', label: 'Mittwoch'   },
  { key: 'thursday',  label: 'Donnerstag' },
  { key: 'friday',    label: 'Freitag'    },
  { key: 'saturday',  label: 'Samstag'    },
  { key: 'sunday',    label: 'Sonntag'    },
]

const DAY_INDEX: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
}

interface Props {
  opening_hours: OpeningHours | null | undefined
  note?: string | null
  className?: string
}

export function OpeningHoursTable({ opening_hours, note, className = '' }: Props) {
  if (!opening_hours) return null
  const todayIdx = new Date().getDay()

  return (
    <div className={`space-y-1 ${className}`}>
      {DAYS.map(({ key, label }) => {
        const h = opening_hours[key]
        const isToday = DAY_INDEX[key] === todayIdx
        return (
          <div
            key={key}
            className={`flex items-center justify-between text-sm py-0.5 ${isToday ? 'font-semibold text-[#1C1F1A]' : 'text-gray-600'}`}
          >
            <span className="w-28 shrink-0">
              {label}
              {isToday && <span className="ml-1.5 text-[10px] text-[#8BB06A] font-bold uppercase tracking-wide">Heute</span>}
            </span>
            {(!h || h.closed) ? (
              <span className="text-gray-400">Geschlossen</span>
            ) : (
              <span>{h.open} – {h.close} Uhr</span>
            )}
          </div>
        )
      })}
      {note && (
        <p className="text-xs text-gray-400 pt-1 border-t border-gray-100 mt-2">{note}</p>
      )}
    </div>
  )
}
