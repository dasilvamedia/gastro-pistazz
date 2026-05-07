'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Tag,
  ImageIcon,
  Users,
  MessageSquare,
  BarChart3,
  Store,
  Star,
  Settings,
  LogOut,
  Gift,
  Building2,
  FileText,
  UserCog,
  QrCode,
  Trophy,
} from 'lucide-react'

const ownerNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/deals', label: 'Deals', icon: Gift },
  { href: '/dashboard/stories', label: 'Stories pruefen', icon: ImageIcon },
  { href: '/dashboard/kunden', label: 'Kunden', icon: Users },
  { href: '/dashboard/nachrichten', label: 'Nachrichten', icon: MessageSquare },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/stempelkarte', label: 'Stempelkarte', icon: Star },
  { href: '/dashboard/qr-codes', label: 'QR-Codes', icon: QrCode },
  { href: '/dashboard/profil', label: 'Restaurant-Profil', icon: Store },
  { href: '/dashboard/einstellungen', label: 'Einstellungen', icon: Settings },
]

const superAdminNavItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/restaurants', label: 'Restaurants', icon: Building2 },
  { href: '/admin/leads', label: 'Leads & CRM', icon: Users },
  { href: '/admin/angebote', label: 'Angebote', icon: FileText },
  { href: '/admin/accounts', label: 'Accounts', icon: UserCog },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/einstellungen', label: 'Einstellungen', icon: Settings },
]

interface AdminSidebarProps {
  role?: string | null
}

export function AdminSidebar({ role: initialRole }: AdminSidebarProps = {}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [role, setRole] = useState<string | null>(initialRole ?? null)
  const [userName, setUserName] = useState<string>('')

  useEffect(() => {
    // Only fetch client-side if role wasn't provided by server layout
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single()
      if (profile) {
        setRole(profile.role)
        setUserName(profile.full_name ?? user.email ?? '')
      }
    })
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isSuperAdmin = role === 'super_admin' || role === 'admin'
  const navItems = isSuperAdmin ? superAdminNavItems : ownerNavItems

  return (
    <aside className="fixed top-0 left-0 h-full w-[250px] bg-charcoal flex flex-col z-30">
      <div className="px-6 py-6 border-b border-white/8">
        <span className="font-serif text-2xl">
          <span className="text-primary">pistazz</span>
          <span className="text-white">.io</span>
        </span>
        {isSuperAdmin && (
          <div className="mt-1 inline-flex items-center gap-1.5 bg-yellow-500/20 px-2 py-0.5 rounded-full">
            <Trophy className="w-3 h-3 text-yellow-400" />
            <span className="text-yellow-400 text-[10px] font-semibold">Super Admin</span>
          </div>
        )}
        {userName && (
          <p className="text-white/40 text-xs mt-2 truncate">{userName}</p>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="flex flex-col gap-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = href === '/dashboard' || href === '/admin/dashboard'
              ? pathname === href
              : pathname === href || pathname.startsWith(href + '/')
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={[
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-primary/20 text-primary'
                      : 'text-white/60 hover:text-white hover:bg-white/8',
                  ].join(' ')}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="px-3 py-4 border-t border-white/8">
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-red-400 hover:bg-red-400/10 transition-all w-full">
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Abmelden</span>
        </button>
      </div>
    </aside>
  )
}
