import { LangProvider } from '@/lib/lang-context'
import { Navbar } from './Navbar'
import { HeroSection } from './HeroSection'
import { IndustryProvider } from './IndustryContext'
import { IndustrySwitcher } from './IndustrySwitcher'
import { HowItWorksSection } from './HowItWorksSection'
import { FeaturesSection } from './FeaturesSection'
import { PricingSection } from './PricingSection'
import { ROISection } from './ROISection'
import { GuaranteeSection } from './GuaranteeSection'
import { FAQSection } from './FAQSection'
import { CTASection } from './CTASection'
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
          <HowItWorksSection />
          <FeaturesSection />
          <PricingSection />
          <ROISection />
          <GuaranteeSection />
          <FAQSection />
          <CTASection />
        </main>
        <Footer />
      </IndustryProvider>
    </LangProvider>
  )
}
