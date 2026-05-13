'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { Lang, translations, Translations } from './translations'

interface LangCtx {
  lang: Lang
  setLang: (l: Lang) => void
  t: Translations
}

const LangContext = createContext<LangCtx>({
  lang: 'de',
  setLang: () => {},
  t: translations.de,
})

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('de')

  useEffect(() => {
    const stored = localStorage.getItem('lang') as Lang | null
    if (stored && ['de', 'pt', 'en'].includes(stored)) setLangState(stored)
  }, [])

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('lang', l)
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
