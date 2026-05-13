'use client'

import { useSubscription } from '@/lib/hooks/useSubscription'

export function TrialBanner({ restaurantId }: { restaurantId: string | null }) {
  const { isTrialActive, isTrialExpired, isTrialEndingSoon, trialDaysRemaining } = useSubscription(restaurantId ?? undefined)

  if (!isTrialActive && !isTrialExpired) return null

  if (isTrialEndingSoon) {
    return (
      <div className="bg-[#FFF8E1] border-b border-[#E8D9A8] px-6 py-2.5 flex items-center gap-3">
        <span className="text-base">⚠️</span>
        <p className="text-sm font-bold text-[#8B6914]">
          Nur noch {trialDaysRemaining} {trialDaysRemaining === 1 ? 'Tag' : 'Tage'} in der Testphase!
          <span className="font-normal ml-2 text-[#8B6914]/70">Kontaktiere uns, damit du keine Daten verlierst.</span>
        </p>
      </div>
    )
  }

  if (isTrialActive) {
    return (
      <div className="bg-[#EEF5E6] border-b border-[#D4E8C2] px-6 py-2.5 flex items-center gap-3">
        <span className="text-base">🧪</span>
        <p className="text-sm font-semibold text-[#577A3D]">
          Testphase läuft — noch {trialDaysRemaining} {trialDaysRemaining === 1 ? 'Tag' : 'Tage'} kostenlos
        </p>
      </div>
    )
  }

  // Expired
  return (
    <div className="bg-[#FFEBEE] border-b border-[#EF9A9A] px-6 py-2.5 flex items-center gap-3">
      <span className="text-base">🔒</span>
      <p className="text-sm font-bold text-[#C62828]">
        Testphase abgelaufen
        <span className="font-normal ml-2 text-[#C62828]/70">Dein Dashboard ist eingeschränkt.</span>
      </p>
    </div>
  )
}
