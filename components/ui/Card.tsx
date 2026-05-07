import { forwardRef } from 'react'

type CardVariant = 'default' | 'glass' | 'dark'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  hover?: boolean
}

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-white shadow-sm border border-charcoal/5',
  glass:
    'bg-white/60 backdrop-blur-md border border-white/40 shadow-lg',
  dark: 'bg-charcoal text-white border border-white/10',
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', hover = false, className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={[
          'rounded-2xl overflow-hidden',
          variantClasses[variant],
          hover
            ? 'transition-all duration-200 hover:scale-[1.02] hover:shadow-md cursor-pointer'
            : '',
          className,
        ].join(' ')}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export { Card }
export type { CardProps, CardVariant }
