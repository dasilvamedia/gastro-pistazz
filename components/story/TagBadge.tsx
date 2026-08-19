'use client'

interface TagBadgeProps {
  restaurantHandle: string | null | undefined
}

export function TagBadge({ restaurantHandle }: TagBadgeProps) {
  const handles = [
    restaurantHandle ? `@${restaurantHandle.replace(/^@/, '')}` : null,
    '@gastro.pistazz.io.io',
  ].filter(Boolean).join('  ')

  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold text-[#1C1F1A] select-none"
      style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(8px)' }}
    >
      <span className="text-[#E1306C]">▲</span>
      {handles}
    </div>
  )
}
