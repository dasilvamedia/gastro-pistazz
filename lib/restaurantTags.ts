// Tags fuer Restaurants: Kueche (max. 3, OR-Filter) und Ernaehrung (AND-Filter).
// Werte sind ASCII-Slugs in der DB, Labels deutsch fuer die UI.

export interface TagOption {
  value: string
  label: string
  emoji: string
}

export const CUISINE_OPTIONS: TagOption[] = [
  { value: 'deutsch',       label: 'Deutsch',       emoji: '🥨' },
  { value: 'italienisch',   label: 'Italienisch',   emoji: '🍝' },
  { value: 'tuerkisch',     label: 'Türkisch',      emoji: '🥙' },
  { value: 'griechisch',    label: 'Griechisch',    emoji: '🫒' },
  { value: 'asiatisch',     label: 'Asiatisch',     emoji: '🥢' },
  { value: 'japanisch',     label: 'Japanisch',     emoji: '🍣' },
  { value: 'chinesisch',    label: 'Chinesisch',    emoji: '🥡' },
  { value: 'thailaendisch', label: 'Thailändisch',  emoji: '🍜' },
  { value: 'vietnamesisch', label: 'Vietnamesisch', emoji: '🍲' },
  { value: 'indisch',       label: 'Indisch',       emoji: '🍛' },
  { value: 'mexikanisch',   label: 'Mexikanisch',   emoji: '🌮' },
  { value: 'amerikanisch',  label: 'Amerikanisch',  emoji: '🍔' },
  { value: 'spanisch',      label: 'Spanisch',      emoji: '🥘' },
  { value: 'franzoesisch',  label: 'Französisch',   emoji: '🥐' },
  { value: 'orientalisch',  label: 'Orientalisch',  emoji: '🧆' },
  { value: 'mediterran',    label: 'Mediterran',    emoji: '🍋' },
  { value: 'balkan',        label: 'Balkan',        emoji: '🍢' },
  { value: 'international', label: 'International', emoji: '🌍' },
]

export const DIETARY_OPTIONS: TagOption[] = [
  { value: 'vegan',        label: 'Vegan',        emoji: '🌱' },
  { value: 'vegetarisch',  label: 'Vegetarisch',  emoji: '🥗' },
  { value: 'glutenfrei',   label: 'Glutenfrei',   emoji: '🌾' },
  { value: 'laktosefrei',  label: 'Laktosefrei',  emoji: '🥛' },
  { value: 'halal',        label: 'Halal',        emoji: '☪️' },
  { value: 'koscher',      label: 'Koscher',      emoji: '✡️' },
  { value: 'bio',          label: 'Bio',          emoji: '🌿' },
]

export const MAX_CUISINE = 3

export const CUISINE_LABEL: Record<string, string> = Object.fromEntries(CUISINE_OPTIONS.map(o => [o.value, o.label]))
export const DIETARY_LABEL: Record<string, string> = Object.fromEntries(DIETARY_OPTIONS.map(o => [o.value, o.label]))
export const CUISINE_EMOJI: Record<string, string> = Object.fromEntries(CUISINE_OPTIONS.map(o => [o.value, o.emoji]))
export const DIETARY_EMOJI: Record<string, string> = Object.fromEntries(DIETARY_OPTIONS.map(o => [o.value, o.emoji]))

/** Whitelist, Duplikate raus, Obergrenze. Server- und clientseitig identisch. */
export function sanitizeTags(input: unknown, options: TagOption[], max?: number): string[] {
  if (!Array.isArray(input)) return []
  const allowed = new Set(options.map(o => o.value))
  const out: string[] = []
  for (const v of input) {
    if (typeof v !== 'string') continue
    const s = v.trim().toLowerCase()
    if (allowed.has(s) && !out.includes(s)) out.push(s)
    if (max && out.length >= max) break
  }
  return out
}

/** Suchbegriff gegen Tag-Labels matchen (z.B. "ital" -> italienisch, "vegan") */
export function matchTagValues(term: string): { cuisine: string[]; dietary: string[] } {
  const q = term.trim().toLowerCase()
  if (q.length < 3) return { cuisine: [], dietary: [] }
  const norm = (s: string) => s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
  const nq = norm(q)
  return {
    cuisine: CUISINE_OPTIONS.filter(o => norm(o.label).startsWith(nq) || o.value.startsWith(nq)).map(o => o.value),
    dietary: DIETARY_OPTIONS.filter(o => norm(o.label).startsWith(nq) || o.value.startsWith(nq)).map(o => o.value),
  }
}
