'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Gift, User } from 'lucide-react'

const navItems = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/entdecken', label: 'Entdecken', icon: Search },
  { href: '/deals', label: 'Deals', icon: Gift },
  { href: '/profil', label: 'Profil', icon: User },
]

export function BottomNav() {
  const pathname = usePathname()

  // Hide on full-screen flows — no navigation needed
  if (pathname === '/onboarding' || pathname === '/story/submit') return null

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur-md border-t border-charcoal/8 safe-area-pb">
      <div className="flex items-center justify-around px-2 h-16">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex flex-col items-center justify-center gap-1 flex-1 py-2 rounded-2xl transition-all duration-200',
                isActive ? 'text-primary' : 'text-charcoal/40 hover:text-charcoal/70',
              ].join(' ')}
            >
              <Icon
                className={['w-5 h-5 transition-all', isActive ? 'stroke-[2.5]' : 'stroke-[1.5]'].join(' ')}
              />
              <span className={['text-[10px] font-medium', isActive ? 'font-semibold' : ''].join(' ')}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
