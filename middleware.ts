import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

async function getUserRole(supabase: ReturnType<typeof createServerClient>, userId: string): Promise<string | null> {
  // Use RPC to bypass any RLS recursion issues
  try {
    const { data } = await supabase.rpc('get_my_role')
    if (data) return data as string
  } catch { /* fall through */ }

  // Fallback: direct query
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()
  return profile?.role ?? null
}

export async function middleware(request: NextRequest) {
  // DEV BYPASS: allow all routes without auth in development
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // Redirect logged-in users away from auth/landing to their dashboard
  if (user && (path === '/' || path === '/login' || path === '/register' || path === '/restaurant-login')) {
    const role = await getUserRole(supabase, user.id)
    if (role === 'super_admin' || role === 'admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
    if (role === 'restaurant_owner') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    // Check onboarding for guests
    const { data: profile } = await supabase
      .from('profiles').select('onboarding_completed').eq('id', user.id).single()
    if (!profile?.onboarding_completed) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
    return NextResponse.redirect(new URL('/home', request.url))
  }

  // Protected guest routes
  const guestRoutes = ['/home', '/entdecken', '/deals', '/profil', '/story', '/restaurant', '/onboarding']
  if (guestRoutes.some(r => path.startsWith(r)) && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Protected /dashboard/* — restaurant_owner or super_admin
  if (path.startsWith('/dashboard')) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))
    const role = await getUserRole(supabase, user.id)
    if (!role || !['restaurant_owner', 'super_admin', 'admin'].includes(role)) {
      return NextResponse.redirect(new URL('/home', request.url))
    }
  }

  // Protected /admin/* — super_admin only
  if (path.startsWith('/admin') && !path.startsWith('/admin-login')) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))
    const role = await getUserRole(supabase, user.id)
    const isAdmin = role === 'super_admin' || role === 'admin'
    if (!isAdmin) {
      return NextResponse.redirect(new URL(role === 'restaurant_owner' ? '/dashboard' : '/home', request.url))
    }
    // Auto-set admin session cookie
    const adminSession = request.cookies.get('admin_session')?.value
    if (!adminSession || adminSession !== 'authenticated') {
      const res = NextResponse.next({ request })
      res.cookies.set('admin_session', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      })
      return res
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
