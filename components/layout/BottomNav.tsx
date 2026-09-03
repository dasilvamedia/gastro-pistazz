'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Gift, User, Heart, Store, Shield } from 'lucide-react'
import { useRole } from '@/lib/hooks/useRole'

// Das Herz sitzt bewusst in der MITTE als erhabener Pistazz-Button
// (Tinder-Style-Restaurant-Swipe unter /favoriten).
// Inhaber bekommen zusaetzlich "Mein Restaurant", Admins "Admin": so laeuft
// das komplette Dashboard in der App, ohne Computer.
type Item = { href: string; label: string; icon: typeof Home; isHeart?: boolean }

const baseItems: Item[] = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/entdecken', label: 'Entdecken', icon: Search },
  { href: '/favoriten', label: '', icon: Heart, isHeart: true },
  { href: '/deals', label: 'Deals', icon: Gift },
  { href: '/profil', label: 'Profil', icon: User },
]

export function BottomNav() {
  const pathname = usePathname()
  const { isOwner, isAdmin } = useRole()

  if (['/onboarding', '/story/submit', '/story/create', '/stempel'].some(p => pathname.startsWith(p))) return null

  const navItems: Item[] = [...baseItems]
  if (isAdmin) navItems.push({ href: '/admin/dashboard', label: 'Admin', icon: Shield })
  else if (isOwner) navItems.push({ href: '/dashboard', label: 'Restaurant', icon: Store })

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Blur backdrop - Farben via CSS-Variablen, damit der Dark Mode greift */}
      <div
        className="absolute inset-x-0 top-0 backdrop-blur-2xl"
        style={{
          // Bis 60px UNTER die Leiste ziehen: deckt auf jedem Geraet die
          // Safe-Area/Gesten-Zone ab, nie wieder ein durchsichtiger Streifen.
          bottom: -60,
          background: 'linear-gradient(to top, var(--nav-bg-a) 0%, var(--nav-bg-b) 100%), linear-gradient(var(--nav-bg-a), var(--nav-bg-a))',
          borderTop: '1px solid var(--nav-border)',
          boxShadow: '0 -12px 40px rgba(0,0,0,0.08)',
        }}
      />

      <div className="relative flex items-center justify-around px-2 h-[62px]">
        {navItems.map(({ href, label, icon: Icon, isHeart }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          if (isHeart) {
            return (
              <Link
                key={href}
                href={href}
                aria-label="Favoriten"
                className="flex items-center justify-center flex-1 relative"
              >
                <span
                  className="flex items-center justify-center w-[52px] h-[52px] rounded-full -mt-6 transition-transform active:scale-90"
                  style={{
                    background: 'linear-gradient(135deg, #8BB06A 0%, #6D9450 100%)',
                    boxShadow: '0 6px 18px rgba(139,176,106,0.45), 0 0 0 4px var(--nav-bg-a)',
                  }}
                >
                  <Heart
                    className="text-white"
                    style={{ width: 26, height: 26, fill: isActive ? '#fff' : 'transparent', strokeWidth: 2.2 }}
                  />
                </span>
              </Link>
            )
          }
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 relative min-w-0"
            >
              {isActive && (
                <span
                  className="absolute inset-x-1 top-0.5 bottom-0.5 rounded-2xl"
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
                  className="text-[10px] font-medium transition-all duration-200 truncate max-w-[64px]"
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
