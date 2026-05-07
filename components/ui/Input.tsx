'use client'

import { forwardRef } from 'react'
import type { LucideIcon } from 'lucide-react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leadingIcon?: LucideIcon
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leadingIcon: LeadingIcon, className = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-charcoal"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {LeadingIcon && (
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <LeadingIcon className="w-4 h-4 text-charcoal/40" />
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={[
              'w-full rounded-xl border bg-white px-4 py-3 text-sm text-charcoal placeholder:text-charcoal/40 transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
              error
                ? 'border-coral focus:ring-coral/30 focus:border-coral'
                : 'border-charcoal/10',
              LeadingIcon ? 'pl-10' : '',
              className,
            ].join(' ')}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs text-coral font-medium">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
export type { InputProps }
