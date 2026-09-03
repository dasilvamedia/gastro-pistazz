'use client'

import Link from 'next/link'
import { useSubscription } from '@/lib/hooks/useSubscription'
import { PLAN_LIMITS, PLANS, DEFAULT_PLAN, minPlanFor, type PlanKey, type BooleanLimitKey } from '@/lib/plans'

interface Props {
  feature: BooleanLimitKey
  children: React.ReactNode
}

const FEATURE_LABEL: Record<BooleanLimitKey, string> = {
  has_analytics: 'Analytics Dashboard',
  has_stempelkarte: 'Digitale Stempelkarten',
  has_messaging: 'Gaeste-Nachrichten',
}

export function PlanGate({ feature, children }: Props) {
  const { plan, loading, subscription } = useSubscription()

  if (loading) {
    return (
      <div className="p-8 space-y-3">
        {[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />)}
      </div>
    )
  }

  const limits = PLAN_LIMITS[plan as PlanKey] ?? PLAN_LIMITS[DEFAULT_PLAN]
  if (limits[feature]) return <>{children}</>

  const featureLabel = FEATURE_LABEL[feature]
  const requiredPlan = PLANS[minPlanFor(feature)].name

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="max-w-sm mx-auto space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[#EEF5E6] flex items-center justify-center mx-auto text-3xl">
          🔒
        </div>
        <h2 className="text-xl font-bold text-[#1C1F1A]">{featureLabel}</h2>
        <p className="text-sm text-gray-500">
          {featureLabel} ist ab dem <strong>{requiredPlan}-Paket</strong> verfuegbar.
          {subscription?.trial_ends_at && (
            <> Du kannst es jetzt in der Testphase ausprobieren, nach Ablauf ist ein Upgrade notwendig.</>
          )}
        </p>
        <Link
          href="/dashboard/einstellungen?tab=plan"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#8BB06A] text-white text-sm font-semibold hover:bg-[#6D9450] transition-all"
        >
          Pakete ansehen
        </Link>
      </div>
    </div>
  )
}
