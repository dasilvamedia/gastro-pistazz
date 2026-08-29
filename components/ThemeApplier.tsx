'use client'

import { useEffect } from 'react'
import { getDisplayTheme, resolveDark } from '@/lib/displayTheme'

// Setzt data-theme="dark|light" auf <html> gemaess der Anzeige-Einstellung
// (Hell/Dunkel/System). Die Dark-Palette liegt zentral in globals.css.
export default function ThemeApplier() {
  useEffect(() => {
    const apply = () => {
      document.documentElement.dataset.theme = resolveDark(getDisplayTheme()) ? 'dark' : 'light'
    }
    apply()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    window.addEventListener('display-theme-change', apply)
    return () => {
      mq.removeEventListener('change', apply)
      window.removeEventListener('display-theme-change', apply)
    }
  }, [])
  return null
}
