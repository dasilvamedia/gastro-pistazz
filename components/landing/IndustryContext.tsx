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
