'use client'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { TRIGGER_CONFIG } from '@/types'
import type { Deal } from '@/types'

interface DealCardProps {
  deal: Deal
  onRedeem?: (deal: Deal) => void
  className?: string
}

const rewardLabel = (deal: Deal): string => {
  switch (deal.reward_type) {
    case 'discount_percent':
      return `${deal.reward_value}% Rabatt`
    case 'discount_fixed':
      return `${deal.reward_value}€ Rabatt`
    case 'free_item':
      return deal.reward_value ?? 'Gratis-Artikel'
    case 'bogo':
      return '2 für 1'
    default:
      return deal.reward_value ?? 'Belohnung'
  }
}

export function DealCard({ deal, onRedeem, className = '' }: DealCardProps) {
  const trigger = TRIGGER_CONFIG[deal.trigger]
  const reward = rewardLabel(deal)

  return (
    <div
      className={[
        'bg-white rounded-2xl border border-charcoal/5 shadow-sm p-4 flex flex-col gap-3 transition-all duration-200 hover:shadow-md hover:scale-[1.01]',
        className,
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          {deal.badge_text && (
            <Badge
              variant="custom"
              label={deal.badge_text}
              color={deal.badge_color || '#8BB06A'}
              className="mb-2"
            />
          )}
          <h3 className="font-semibold text-charcoal text-sm leading-snug">{deal.title}</h3>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-pale rounded-xl px-3 py-2">
        <span className="text-lg">{trigger.emoji}</span>
        <div>
          <p className="text-xs text-charcoal/50">{trigger.label}</p>
          <p className="text-sm font-semibold text-dark">{reward}</p>
        </div>
      </div>

      {deal.points_required > 0 && (
        <p className="text-xs text-charcoal/50 flex items-center gap-1">
          <span>🏆</span>
          <span>{deal.points_required.toLocaleString('de-DE')} Punkte erforderlich</span>
        </p>
      )}

      {onRedeem && (
        <Button
          variant="primary"
          size="sm"
          className="w-full mt-1"
          onClick={() => onRedeem(deal)}
        >
          Deal einlösen
        </Button>
      )}
    </div>
  )
}
