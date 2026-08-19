import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LandingShell } from '@/components/landing/LandingShell'
import { INDUSTRIES } from '@/lib/industries'

type Params = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return INDUSTRIES.map((industry) => ({ slug: industry.slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const industry = INDUSTRIES.find((item) => item.slug === slug)
  if (!industry) return {}
  return {
    title: industry.metaTitle,
    description: industry.metaDescription,
    alternates: { canonical: `/branche/${industry.slug}` },
  }
}

/** Every industry gets a real URL so it can be shared and indexed on its own. */
export default async function IndustryLandingPage({ params }: Params) {
  const { slug } = await params
  if (!INDUSTRIES.some((item) => item.slug === slug)) notFound()
  return <LandingShell industrySlug={slug} />
}
