'use client'

interface DayHours {
  open: string
  close: string
  closed?: boolean
}

interface OpeningHoursTableProps {
  openingHours: Record<string, DayHours | undefined> | null | undefined
  note?: string | null
  compact?: boolean
}

const DAYS = [
  { key: 'monday',    label: 'Montag' },
  { key: 'tuesday',   label: 'Dienstag' },
  { key: 'wednesday', label: 'Mittwoch' },
  { key: 'thursday',  label: 'Donnerstag' },
  { key: 'friday',    label: 'Freitag' },
  { key: 'saturday',  label: 'Samstag' },
  { key: 'sunday',    label: 'Sonntag' },
]

const DAY_INDEX: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
}

export default function OpeningHoursTable({ openingHours, note, compact = false }: OpeningHoursTableProps) {
  if (!openingHours) return null

  const todayIndex = new Date().getDay()

  return (
    <div className="w-full">
      <div className={`divide-y divide-gray-100 ${compact ? '' : 'rounded-xl border border-gray-100'}`}>
        {DAYS.map(({ key, label }) => {
          const hours = openingHours[key]
          const isToday = DAY_INDEX[key] === todayIndex
          const isClosed = !hours || hours.closed || !hours.open

          return (
            <div
              key={key}
              className={`flex items-center justify-between px-3 py-2 ${
                isToday ? 'bg-[#F4F9F0]' : ''
              } ${compact ? 'text-xs' : 'text-sm'}`}
            >
              <span
                className={`font-medium ${
                  isToday ? 'text-[#3D7A22]' : 'text-gray-700'
                }`}
              >
                {isToday ? `${label} (heute)` : label}
              </span>
              <span
                className={
                  isClosed
                    ? 'text-gray-400'
                    : isToday
                    ? 'text-[#3D7A22] font-semibold'
                    : 'text-gray-600'
                }
              >
                {isClosed ? 'Geschlossen' : `${hours!.open} - ${hours!.close} Uhr`}
              </span>
            </div>
          )
        })}
      </div>
      {note && (
        <p className="mt-2 text-xs text-gray-400 px-1">{note}</p>
      )}
    </div>
  )
}
