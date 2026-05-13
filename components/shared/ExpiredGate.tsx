'use client'

import { useSubscription } from '@/lib/hooks/useSubscription'

export function ExpiredGate({
  children,
  restaurantId,
}: {
  children: React.ReactNode
  restaurantId: string | null
}) {
  const { isExpired, loading } = useSubscription(restaurantId ?? undefined)

  if (loading || !isExpired) return <>{children}</>

  return (
    <div className="relative min-h-64">
      <div className="blur-sm pointer-events-none select-none opacity-25 max-h-96 overflow-hidden">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border border-gray-100">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-[#1C1F1A] mb-2">Testphase abgelaufen</h2>
          <p className="text-[#6B7265] text-sm mb-6">
            Deine kostenlose Testphase ist beendet. Wähle ein Paket, um dein Dashboard, deine Deals und deine Kundendaten weiter zu nutzen.
          </p>
          <a href="/dashboard/einstellungen?tab=plan"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#8BB06A] text-white rounded-full font-bold hover:bg-[#6D9450] transition-all text-sm">
            Paket auswählen →
          </a>
          <p className="text-xs text-gray-400 mt-4">Deine Daten bleiben 30 Tage gespeichert.</p>
        </div>
      </div>
    </div>
  )
}
