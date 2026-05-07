import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { ImpersonateBanner } from '@/components/admin/ImpersonateBanner'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let role: string | null = null

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      role = profile?.role ?? null
    }
  } catch {
    // In development or if supabase is unavailable, role stays null
  }

  const cookieStore = await cookies()
  const raw = cookieStore.get('admin_impersonating')?.value
  let impersonating: { restaurant_name: string; target_user_id: string } | null = null
  if (raw) {
    try { impersonating = JSON.parse(raw) } catch { /* ignore */ }
  }

  return (
    <div className="flex min-h-screen bg-pale">
      <AdminSidebar role={role} />
      <main className="ml-[250px] flex-1 overflow-y-auto min-h-screen">
        {impersonating && (
          <ImpersonateBanner restaurantName={impersonating.restaurant_name} />
        )}
        {children}
      </main>
    </div>
  )
}
