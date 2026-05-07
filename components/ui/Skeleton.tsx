type SkeletonVariant = 'text' | 'rect' | 'circle' | 'card'

interface SkeletonProps {
  variant?: SkeletonVariant
  width?: string
  height?: string
  className?: string
}

const variantDefaults: Record<SkeletonVariant, string> = {
  text: 'h-4 w-full rounded',
  rect: 'rounded-xl',
  circle: 'rounded-full',
  card: 'rounded-2xl h-48 w-full',
}

function Skeleton({ variant = 'rect', width, height, className = '' }: SkeletonProps) {
  const style: React.CSSProperties = {}
  if (width) style.width = width
  if (height) style.height = height

  return (
    <div
      className={['skeleton', variantDefaults[variant], className].join(' ')}
      style={style}
      aria-hidden="true"
    />
  )
}

function SkeletonList({ count = 3, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={['flex flex-col gap-3', className].join(' ')}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant="text" />
      ))}
    </div>
  )
}

export { Skeleton, SkeletonList }
export type { SkeletonProps, SkeletonVariant }
