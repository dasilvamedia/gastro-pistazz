import type { Restaurant } from '@/types'

/**
 * Formats a point value as a German-locale string.
 * Example: 1234 → "1.234 Punkte"
 */
export function formatPoints(n: number): string {
  return `${n.toLocaleString('de-DE')} Punkte`
}

/**
 * Formats an ISO date string as a German short date.
 * Example: "2025-01-12" → "12. Jan. 2025"
 */
export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Returns a relative time string in German.
 * Example: "vor 2 Stunden"
 */
export function timeAgo(date: string): string {
  const now = Date.now()
  const then = new Date(date).getTime()
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHours = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)

  if (diffSec < 60) return 'gerade eben'
  if (diffMin < 60) return `vor ${diffMin} ${diffMin === 1 ? 'Minute' : 'Minuten'}`
  if (diffHours < 24) return `vor ${diffHours} ${diffHours === 1 ? 'Stunde' : 'Stunden'}`
  if (diffDays < 7) return `vor ${diffDays} ${diffDays === 1 ? 'Tag' : 'Tagen'}`
  if (diffWeeks < 5) return `vor ${diffWeeks} ${diffWeeks === 1 ? 'Woche' : 'Wochen'}`
  if (diffMonths < 12) return `vor ${diffMonths} ${diffMonths === 1 ? 'Monat' : 'Monaten'}`
  return `vor ${diffYears} ${diffYears === 1 ? 'Jahr' : 'Jahren'}`
}

/**
 * Returns the initials from a full name.
 * Example: "Maria Koch" → "MK"
 */
export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .slice(0, 2)
    .join('')
}

const DAY_LABELS: Record<number, string> = {
  0: 'So',
  1: 'Mo',
  2: 'Di',
  3: 'Mi',
  4: 'Do',
  5: 'Fr',
  6: 'Sa',
}

/**
 * Returns a short German day label.
 * Example: 0 → "So", 1 → "Mo", ..., 6 → "Sa"
 */
export function getDayLabel(day: number): string {
  return DAY_LABELS[day] ?? ''
}

/**
 * Returns the points awarded for a given submission type from a restaurant config.
 */
export function getPointsForType(
  restaurant: Pick<
    Restaurant,
    | 'points_per_story'
    | 'points_per_reel'
    | 'points_per_google_review'
    | 'points_per_receipt'
    | 'points_per_post'
  >,
  type: 'instagram_story' | 'instagram_reel' | 'instagram_post' | 'google_review' | 'receipt'
): number {
  switch (type) {
    case 'instagram_story':
      return restaurant.points_per_story
    case 'instagram_reel':
      return restaurant.points_per_reel
    case 'instagram_post':
      return restaurant.points_per_post
    case 'google_review':
      return restaurant.points_per_google_review
    case 'receipt':
      return restaurant.points_per_receipt
    default:
      return 0
  }
}

/**
 * Generates an 8-character uppercase alphanumeric redemption code.
 * Excludes ambiguous characters (0, O, I, 1).
 */
export function generateRedemptionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}
