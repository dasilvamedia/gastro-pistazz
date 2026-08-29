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

  if (['/onboarding', '/story/submit', '/story/create'].some(p => pathname.startsWith(p))) return null

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Blur backdrop - Farben via CSS-Variablen, damit der Dark Mode greift */}
      <div
        className="absolute inset-0 backdrop-blur-2xl"
        style={{
          background: 'linear-gradient(to top, var(--nav-bg-a) 0%, var(--nav-bg-b) 100%)',
          borderTop: '1px solid var(--nav-border)',
          boxShadow: '0 -12px 40px rgba(0,0,0,0.08)',
        }}
      />

      <div className="relative flex items-center justify-around px-3 h-[62px]">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 relative"
            >
              {/* Active pill background */}
              {isActive && (
                <span
                  className="absolute inset-x-2 top-0.5 bottom-0.5 rounded-2xl"
                  style={{ background: 'rgba(139,176,106,0.12)' }}
                />
              )}
              <span className="relative flex flex-col items-center gap-0.5">
                <Icon
                  className="transition-all duration-200"
                  style={{
                    width: 22,
                    height: 22,
                    strokeWidth: isActive ? 2.25 : 1.6,
                    color: isActive ? 'var(--nav-active)' : 'var(--nav-inactive)',
                  }}
                />
                <span
                  className="text-[10px] font-medium transition-all duration-200"
                  style={{ color: isActive ? 'var(--nav-active)' : 'var(--nav-inactive)', fontWeight: isActive ? 600 : 400 }}
                >
                  {label}
                </span>
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
