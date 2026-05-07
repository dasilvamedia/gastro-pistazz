import { TIER_CONFIG } from '@/types'
import type { UserTier } from '@/types'

interface TierBadgeProps {
  tier: UserTier
  className?: string
}

export function TierBadge({ tier, className = '' }: TierBadgeProps) {
  const config = TIER_CONFIG[tier]

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white border',
        className,
      ].join(' ')}
      style={{ borderColor: `${config.color}40`, color: config.color }}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: config.color }}
      />
      {config.label}
    </span>
  )
}
