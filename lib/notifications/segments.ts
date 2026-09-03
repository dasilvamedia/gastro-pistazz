// Kunden-Segmente fuer Kampagnen. Eingabe = Zeilen der RPC
// restaurant_customers (032). Route-Dateien duerfen nur Handler exportieren,
// deshalb liegt die Logik hier.
export type SegmentCustomer = {
  user_id: string
  tier: string | null
  last_activity_at: string | null
  current_stamps: number | null
  stamps_total: number | null
}

const THIRTY_DAYS = 30 * 86400000

export function filterSegment(customers: SegmentCustomer[], segment: string): string[] {
  const now = Date.now()
  return customers.filter(c => {
    const age = c.last_activity_at ? now - new Date(c.last_activity_at).getTime() : Infinity
    switch (segment) {
      case 'alle': return true
      case 'bronze': case 'silber': case 'gold': case 'platin': return c.tier === segment
      case 'inaktiv': return age > THIRTY_DAYS
      case 'aktiv': return age <= THIRTY_DAYS
      case 'stempel_fast_voll':
        return c.current_stamps != null && c.stamps_total != null && c.current_stamps > 0 && c.stamps_total - c.current_stamps <= 2
      default: return false
    }
  }).map(c => c.user_id)
}

export const SEGMENT_KEYS = ['alle', 'bronze', 'silber', 'gold', 'platin', 'aktiv', 'inaktiv', 'stempel_fast_voll'] as const
