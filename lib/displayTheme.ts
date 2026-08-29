// Anzeige-Einstellung der App: 'light' (Standard), 'dark' oder 'system'.
// Steuert aktuell, welche der beiden Restaurant-Ansichten gezeigt wird
// (helle /restaurant/[id] vs. dunkle /r/[slug]).
export type DisplayTheme = 'system' | 'light' | 'dark'

const KEY = 'display-theme'

export function getDisplayTheme(): DisplayTheme {
  if (typeof window === 'undefined') return 'light'
  const v = localStorage.getItem(KEY)
  return v === 'dark' || v === 'system' ? v : 'light'
}

export function setDisplayTheme(t: DisplayTheme) {
  localStorage.setItem(KEY, t)
  // ThemeApplier lauscht darauf und setzt data-theme sofort neu
  window.dispatchEvent(new Event('display-theme-change'))
}

/** true = dunkle Ansicht anzeigen (aufgeloest inkl. Systemeinstellung) */
export function resolveDark(t: DisplayTheme = getDisplayTheme()): boolean {
  if (t === 'dark') return true
  if (t === 'light') return false
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}
