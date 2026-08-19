'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  DEFAULT_INDUSTRY,
  getIndustry,
  industryCssVars,
  type Industry,
  type IndustryCopy,
} from '@/lib/industries'
import { useLang } from '@/lib/lang-context'

type IndustryCtx = {
  industry: Industry
  /** Copy for the active industry in the active language */
  copy: IndustryCopy
  setIndustry: (slug: string) => void
}

const IndustryContext = createContext<IndustryCtx>({
  industry: DEFAULT_INDUSTRY,
  copy: DEFAULT_INDUSTRY.copy.de,
  setIndustry: () => {},
})

export function useIndustry() {
  return useContext(IndustryContext)
}

/**
 * Holds the selected industry and paints its palette onto a wrapper element.
 * Every landing component reads colour from --ind-* rather than a fixed hex,
 * so changing the wrapper's style restyles the entire page at once.
 */
export function IndustryProvider({
  initialSlug,
  children,
}: {
  initialSlug?: string
  children: React.ReactNode
}) {
  const [slug, setSlug] = useState(initialSlug ?? DEFAULT_INDUSTRY.slug)
  const { lang } = useLang()

  const industry = useMemo(() => getIndustry(slug), [slug])
  const copy = industry.copy[lang] ?? industry.copy.de

  const setIndustry = useCallback((next: string) => {
    setSlug(next)
    // Keep the URL shareable without navigating — a real route change would
    // remount the page and throw away the transition we just animated.
    if (typeof window !== 'undefined') {
      const path = next === DEFAULT_INDUSTRY.slug ? '/' : `/branche/${next}`
      window.history.replaceState(null, '', path)
    }
  }, [])

  const value = useMemo(
    () => ({ industry, copy, setIndustry }),
    [industry, copy, setIndustry]
  )

  return (
    <IndustryContext.Provider value={value}>
      <div
        data-industry={industry.slug}
        style={industryCssVars(industry) as CSSProperties}
      >
        {children}
      </div>
    </IndustryContext.Provider>
  )
}

/**
 * Drop-in-Ersatz fuer useLang in Landing-Sektionen: liefert das komplette
 * Uebersetzungsobjekt, in dem alle Gastro-Begriffe durch das Vokabular
 * der aktiven Branche ersetzt sind (Kunden, Mitglieder, Studios ...).
 */
export function useIndustryT() {
  const { industry } = useIndustry()
  const lang_ctx = useLang()
  const { t: rawT, lang } = lang_ctx as unknown as { t: unknown; lang: string }

  const t = useMemo(() => {
    const vocab = industry.vocab
    if (!vocab || lang !== 'de') return rawT
    const entries = Object.entries(vocab)
    const swap = (text: string): string => {
      let out = text
      for (const [from, to] of entries) out = out.split(from).join(to)
      return out
    }
    const walk = (node: unknown): unknown => {
      if (typeof node === 'string') return swap(node)
      if (Array.isArray(node)) return node.map(walk)
      if (node && typeof node === 'object') {
        return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, walk(v)]))
      }
      return node
    }
    return walk(rawT)
  }, [rawT, industry, lang])

  return { ...lang_ctx, t } as typeof lang_ctx
}
