'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useLayoutEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSubscription } from '@/lib/hooks/useSubscription'
import {
  LayoutDashboard, ImageIcon, Users, MessageSquare, BarChart3,
  Store, Star, Settings, LogOut, Gift, Building2, FileText,
  UserCog, QrCode, Trophy, ArrowLeft, ChevronLeft, ChevronRight, Menu, X, ScanLine,
} from 'lucide-react'

const ownerNavItems = [
  { href: '/dashboard',               label: 'Dashboard',         icon: LayoutDashboard },
  { href: '/dashboard/deals',         label: 'Deals',             icon: Gift },
  { href: '/dashboard/einloesen',     label: 'Einloesen',         icon: ScanLine },
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
  { href: '/admin/nutzer',        label: 'Nutzer',        icon: Users },
  { href: '/admin/leads',         label: 'Leads & CRM',   icon: Users },
  { href: '/admin/angebote',      label: 'Angebote',      icon: FileText },
  { href: '/admin/accounts',      label: 'Accounts',      icon: UserCog },
  { href: '/admin/stories',       label: 'Story-Pruefung', icon: ImageIcon },
  { href: '/admin/stempelkarte',  label: 'Stempelkarten', icon: Star },
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
  impersonatingName?: string | null
}

export function AdminSidebar({ role: initialRole, impersonatingName: serverName }: AdminSidebarProps = {}) {
  const pathname = usePathname()
  const router   = useRouter()

  const [impersonatingName, setImpersonatingName] = useState<string | null>(serverName ?? null)
  const [userName,  setUserName]  = useState<string>('')
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile]   = useState(false)

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

  useLayoutEffect(() => {
    const id   = readCookie('impersonate_restaurant_id')
    const name = readCookie('impersonate_restaurant_name')
    if (id && name) setImpersonatingName(name)
    else if (!id) setImpersonatingName(null)
  }, [pathname])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      if (profile) setUserName(profile.full_name ?? user.email ?? '')
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync main margin (desktop only)
  const w = isMobile ? 0 : (collapsed ? 64 : 250)
  useEffect(() => {
    const main = document.querySelector('main')
    if (main) {
      main.style.marginLeft = `${w}px`
      main.style.transition = 'margin-left 0.3s cubic-bezier(0.4,0,0.2,1)'
    }
  }, [w])

  const isSuperAdmin    = initialRole === 'super_admin' || initialRole === 'admin'
  const isImpersonating = !!impersonatingName
  const isOwner = !isSuperAdmin || isImpersonating
  const { isTrialActive, isTrialExpired, isTrialEndingSoon, trialDaysRemaining } = useSubscription(isOwner ? undefined : null)

  const exitImpersonation = useCallback(() => {
    document.cookie = 'impersonate_restaurant_id=; path=/; max-age=0'
    document.cookie = 'impersonate_restaurant_name=; path=/; max-age=0'
    setImpersonatingName(null)
    router.push('/admin/restaurants')
  }, [router])

  const handleLogout = useCallback(async () => {
    await createClient().auth.signOut()
    router.push('/login')
  }, [router])

  const navItems = isImpersonating ? ownerNavItems : (isSuperAdmin ? superAdminNavItems : ownerNavItems)

  // On mobile, show full-width when open; on desktop use collapse
  const sidebarW = isMobile ? 280 : (collapsed ? 64 : 250)
  const sidebarVisible = isMobile ? mobileOpen : true
  const translateX = isMobile ? (mobileOpen ? 0 : -280) : 0

  const NavContent = (
    <>
      {/* ── Header ── */}
      <div className="px-3 py-5 border-b border-white/8 shrink-0 flex items-start justify-between gap-2">
        {(!collapsed || isMobile) && (
          <div className="min-w-0">
            <span className="font-serif text-2xl">
              <span className="text-primary">pistazz</span>
              <span className="text-white">.io</span>
            </span>

            {isImpersonating ? (
              <div className="mt-2 space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(255,107,53,0.22)', color: '#FF6B35' }}>
                  👁️ Kundenansicht
                </div>
                <p className="text-white text-xs font-semibold truncate leading-snug">{impersonatingName}</p>
                <button onClick={exitImpersonation} className="flex items-center gap-1.5 text-white/45 hover:text-white/80 text-[11px] transition-colors mt-1">
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

        {/* Desktop collapse / Mobile close */}
        <button
          onClick={() => isMobile ? setMobileOpen(false) : setCollapsed(c => !c)}
          className="shrink-0 mt-1 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
          title={isMobile ? 'Schließen' : (collapsed ? 'Aufklappen' : 'Zuklappen')}
        >
          {isMobile
            ? <X className="w-5 h-5" />
            : collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />
          }
        </button>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto overscroll-contain">
        <ul className="flex flex-col gap-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = (href === '/dashboard' || href === '/admin/dashboard')
              ? pathname === href
              : pathname === href || pathname.startsWith(href + '/')
            return (
              <li key={href}>
                <Link
                  href={href}
                  title={collapsed && !isMobile ? label : undefined}
                  className={[
                    'flex items-center gap-3 px-3 rounded-xl text-sm font-medium transition-all duration-150 min-h-[44px]',
                    collapsed && !isMobile ? 'justify-center' : '',
                    isActive
                      ? 'bg-primary/20 text-primary'
                      : 'text-white/60 hover:text-white hover:bg-white/8 active:bg-white/15',
                  ].join(' ')}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {(!collapsed || isMobile) && <span className="truncate">{label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* ── Footer ── */}
      <div className="px-2 py-4 border-t border-white/8 shrink-0 space-y-1">
        {isOwner && (isTrialActive || isTrialExpired) && (
          <Link
            href="/dashboard/einstellungen?tab=plan"
            title={collapsed && !isMobile ? (isTrialExpired ? 'Abgelaufen' : `${trialDaysRemaining} Tage Test`) : undefined}
            className={[
              'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all w-full min-h-[44px]',
              collapsed && !isMobile ? 'justify-center' : '',
              isTrialExpired
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : isTrialEndingSoon
                  ? 'bg-amber-400/20 text-amber-300 hover:bg-amber-400/30'
                  : 'bg-[#8BB06A]/15 text-[#8BB06A] hover:bg-[#8BB06A]/25',
            ].join(' ')}
          >
            <span className="shrink-0">{isTrialExpired ? '🔒' : isTrialEndingSoon ? '⚠️' : '🧪'}</span>
            {(!collapsed || isMobile) && (
              <span className="truncate">
                {isTrialExpired ? 'Testphase abgelaufen' : `${trialDaysRemaining} ${trialDaysRemaining === 1 ? 'Tag' : 'Tage'} Test`}
              </span>
            )}
          </Link>
        )}
        <button
          onClick={handleLogout}
          title={collapsed && !isMobile ? 'Abmelden' : undefined}
          className={[
            'flex items-center gap-3 px-3 rounded-xl text-sm font-medium text-white/60 hover:text-red-400 hover:bg-red-400/10 active:bg-red-400/20 transition-all w-full min-h-[44px]',
            collapsed && !isMobile ? 'justify-center' : '',
          ].join(' ')}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {(!collapsed || isMobile) && <span className="truncate">Abmelden</span>}
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger button */}
      {isMobile && !mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed top-3 left-3 z-50 w-10 h-10 flex items-center justify-center rounded-xl bg-charcoal text-white shadow-lg active:scale-95 transition-transform"
          aria-label="Menü öffnen"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Mobile overlay backdrop */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className="fixed top-0 left-0 h-full bg-charcoal flex flex-col z-50 overflow-hidden"
        style={{
          width: sidebarVisible || !isMobile ? sidebarW : 0,
          transform: `translateX(${translateX}px)`,
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1), width 0.3s cubic-bezier(0.4,0,0.2,1)',
          willChange: 'transform',
          visibility: isMobile && !mobileOpen ? 'hidden' : 'visible',
        }}
      >
        {NavContent}
      </aside>
    </>
  )
}
