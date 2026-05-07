import type { UserTier, DealStatus } from '@/types'

type BadgeVariant =
  | 'bronze'
  | 'silber'
  | 'gold'
  | 'platin'
  | 'status-active'
  | 'status-paused'
  | 'status-expired'
  | 'status-draft'
  | 'featured'
  | 'verified'
  | 'custom'

interface BadgeProps {
  variant?: BadgeVariant
  label: string
  color?: string
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  bronze: 'bg-amber-100 text-amber-800',
  silber: 'bg-gray-100 text-gray-600',
  gold: 'bg-yellow-100 text-yellow-700',
  platin: 'bg-slate-100 text-slate-600',
  'status-active': 'bg-green-100 text-green-700',
  'status-paused': 'bg-orange-100 text-orange-700',
  'status-expired': 'bg-red-100 text-red-700',
  'status-draft': 'bg-gray-100 text-gray-500',
  featured: 'bg-primary/10 text-dark',
  verified: 'bg-blue-100 text-blue-700',
  custom: '',
}

function Badge({ variant = 'custom', label, color, className = '' }: BadgeProps) {
  const baseClasses =
    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold'

  if (variant === 'custom' && color) {
    return (
      <span
        className={[baseClasses, className].join(' ')}
        style={{ backgroundColor: `${color}20`, color }}
      >
        {label}
      </span>
    )
  }

  return (
    <span className={[baseClasses, variantStyles[variant], className].join(' ')}>
      {label}
    </span>
  )
}

function TierVariantBadge({ tier }: { tier: UserTier }) {
  const map: Record<UserTier, BadgeVariant> = {
    bronze: 'bronze',
    silber: 'silber',
    gold: 'gold',
    platin: 'platin',
  }
  const labels: Record<UserTier, string> = {
    bronze: 'Bronze',
    silber: 'Silber',
    gold: 'Gold',
    platin: 'Platin',
  }
  return <Badge variant={map[tier]} label={labels[tier]} />
}

function StatusBadge({ status }: { status: DealStatus }) {
  const map: Record<DealStatus, BadgeVariant> = {
    active: 'status-active',
    paused: 'status-paused',
    expired: 'status-expired',
    draft: 'status-draft',
  }
  const labels: Record<DealStatus, string> = {
    active: 'Aktiv',
    paused: 'Pausiert',
    expired: 'Abgelaufen',
    draft: 'Entwurf',
  }
  return <Badge variant={map[status]} label={labels[status]} />
}

export { Badge, TierVariantBadge, StatusBadge }
export type { BadgeProps, BadgeVariant }
