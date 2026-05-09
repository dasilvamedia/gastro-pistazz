'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useLayoutEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
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
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const ownerNavItems = [
  { href: '/dashboard',               label: 'Dashboard',         icon: LayoutDashboard },
  { href: '/dashboard/deals',         label: 'Deals',             icon: Gift },
  { href: '/dashboard/stories',       label: 'Stories prüfen',    icon: ImageIcon },
  { href: '/dashboard/kunden',        label: 'Kunden',            icon: Users },
  { href: '/dashboard/nachrichten',   label: 'Nachrichten',       icon: MessageSquare },
  { href: '/dashboard/analytics',     label: 'Analytics',         icon: BarChart3 },
  { href: '/dashboard/stempelkarte',  label: 'Stempelkarte',      icon: Star },
  { href: '/dashboard/qr-codes',      label: 'QR-Codes',          icon: QrCode },
  { href: '/dashboard/profil',        label: 'Restaurant-Profil', icon: Store },
  { href: '/dashboard/einstellungen', label: 'Einstellungen',     icon: Settings },
]

const superAdminNavItems = [
  { href: '/admin/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/admin/restaurants',   label: 'Restaurants',   icon: Building2 },
  { href: '/admin/leads',         label: 'Leads & CRM',   icon: Users },
  { href: '/admin/angebote',      label: 'Angebote',      icon: FileText },
  { href: '/admin/accounts',      label: 'Accounts',      icon: UserCog },
  { href: '/admin/analytics',     label: 'Analytics',     icon: BarChart3 },
  { href: '/admin/einstellungen', label: 'Einstellungen', icon: Settings },
]

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return m ? decodeURIComponent(m[1]) : null
}

interface AdminSidebarProps {
  role?: string | null
  /** Server-side prop for direct loads (may be stale on client-nav — cookie is the source of truth) */
  impersonatingName?: string | null
}

export function AdminSidebar({ role: initialRole, impersonatingName: serverName }: AdminSidebarProps = {}) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  const [impersonatingName, setImpersonatingName] = useState<string | null>(serverName ?? null)
  const [userName,  setUserName]  = useState<string>('')
  const [collapsed, setCollapsed] = useState(false)

  // useLayoutEffect: runs synchronously after DOM mutation, before browser paint
  // This ensures the correct nav is shown immediately without a flash
  useLayoutEffect(() => {
    const id   = readCookie('impersonate_restaurant_id')
    const name = readCookie('impersonate_restaurant_name')
    if (id && name) {
      setImpersonatingName(name)
    } else if (!id) {
      setImpersonatingName(null)
    }
  }, [pathname]) // re-check whenever route changes

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
      if (profile) setUserName(profile.full_name ?? user.email ?? '')
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const exitImpersonation = () => {
    document.cookie = 'impersonate_restaurant_id=; path=/; max-age=0'
    document.cookie = 'impersonate_restaurant_name=; path=/; max-age=0'
    setImpersonatingName(null)
    router.push('/admin/restaurants')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isSuperAdmin    = initialRole === 'super_admin' || initialRole === 'admin'
  const isImpersonating = !!impersonatingName
  const navItems        = isImpersonating
    ? ownerNavItems
    : (isSuperAdmin ? superAdminNavItems : ownerNavItems)

  const w = collapsed ? 64 : 250

  return (
    <>
      <aside
        className="fixed top-0 left-0 h-full bg-charcoal flex flex-col z-30 transition-all duration-300 overflow-hidden"
        style={{ width: w }}
      >
        {/* ── Header ── */}
        <div className="px-3 py-5 border-b border-white/8 shrink-0 flex items-start justify-between gap-2">
          {!collapsed && (
            <div className="min-w-0">
              <span className="font-serif text-2xl">
                <span className="text-primary">pistazz</span>
                <span className="text-white">.io</span>
              </span>

              {isImpersonating ? (
                <div className="mt-2 space-y-1.5">
                  <div
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: 'rgba(255,107,53,0.22)', color: '#FF6B35' }}
                  >
                    👁️ Kundenansicht
                  </div>
                  <p className="text-white text-xs font-semibold truncate leading-snug">
                    {impersonatingName}
                  </p>
                  <button
                    onClick={exitImpersonation}
                    className="flex items-center gap-1.5 text-white/45 hover:text-white/80 text-[11px] transition-colors mt-1"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Zurück zu Admin
                  </button>
                </div>
              ) : (
                <>
                  {isSuperAdmin && (
                    <div className="mt-1 inline-flex items-center gap-1.5 bg-yellow-500/20 px-2 py-0.5 rounded-full">
                      <Trophy className="w-3 h-3 text-yellow-400" />
                      <span className="text-yellow-400 text-[10px] font-semibold">Super Admin</span>
                    </div>
                  )}
                  {userName && <p className="text-white/40 text-xs mt-2 truncate">{userName}</p>}
                </>
              )}
            </div>
          )}

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="shrink-0 mt-1 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
            title={collapsed ? 'Sidebar aufklappen' : 'Sidebar zuklappen'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* ── Nav ── */}
        <nav className="flex-1 px-2 py-4 overflow-y-auto">
          <ul className="flex flex-col gap-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = (href === '/dashboard' || href === '/admin/dashboard')
                ? pathname === href
                : pathname === href || pathname.startsWith(href + '/')
              return (
                <li key={href}>
                  <Link
                    href={href}
                    title={collapsed ? label : undefined}
                    className={[
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                      collapsed ? 'justify-center' : '',
                      isActive
                        ? 'bg-primary/20 text-primary'
                        : 'text-white/60 hover:text-white hover:bg-white/8',
                    ].join(' ')}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {!collapsed && <span>{label}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* ── Footer ── */}
        <div className="px-2 py-4 border-t border-white/8 shrink-0">
          <button
            onClick={handleLogout}
            title={collapsed ? 'Abmelden' : undefined}
            className={[
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-red-400 hover:bg-red-400/10 transition-all w-full',
              collapsed ? 'justify-center' : '',
            ].join(' ')}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Abmelden</span>}
          </button>
        </div>
      </aside>

      {/* Push main content when expanded/collapsed */}
      <style>{`main { margin-left: ${w}px !important; transition: margin-left 0.3s; }`}</style>
    </>
  )
}
