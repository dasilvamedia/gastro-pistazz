import { LangProvider } from '@/lib/lang-context'
import { Navbar } from './Navbar'
import { HeroSection } from './HeroSection'
import { IndustryProvider } from './IndustryContext'
import { IndustrySwitcher } from './IndustrySwitcher'
import { ProblemSection, SystemSection, ScenariosSection } from './StorySections'
import { PricingV2, LiveFeedSection, TimelineSection, CompareSection, FaqV2, FinalCTA } from './ProofSections'
import { Footer } from './Footer'

/**
 * One landing page, many industries. `/` renders it with the default industry,
 * `/branche/<slug>` renders the same page pre-themed for that niche.
 */
export function LandingShell({ industrySlug }: { industrySlug?: string }) {
  return (
    <LangProvider>
      <IndustryProvider initialSlug={industrySlug}>
        <Navbar />
        <main>
          <HeroSection />
          <IndustrySwitcher />
          {/* Redaktioneller V2-Aufbau: Problem, System, Für wen, Pakete,
              Live-Feed, Pfad, Vergleich, FAQ, CTA. Der ROI-Rechner der
              Vorlage entfaellt bewusst. */}
          <ProblemSection />
          <SystemSection />
          <ScenariosSection />
          <PricingV2 />
          <LiveFeedSection />
          <TimelineSection />
          <CompareSection />
          <FaqV2 />
          <FinalCTA />
        </main>
        <Footer />
      </IndustryProvider>
    </LangProvider>
  )
}
