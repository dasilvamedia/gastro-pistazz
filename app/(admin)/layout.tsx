import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let role: string | null = null
  let impersonatingName: string | null = null

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

      // Check impersonation cookie server-side — reliable, no client async needed
      const cookieStore = await cookies()
      const impId = cookieStore.get('impersonate_restaurant_id')?.value
      if (impId && (role === 'super_admin' || role === 'admin')) {
        const admin = createAdminClient()
        const { data: rest } = await admin
          .from('restaurants')
          .select('name')
          .eq('id', impId)
          .single()
        impersonatingName = rest?.name ?? null
      }
    }
  } catch {
    // silently fail in dev / when supabase unavailable
  }

  return (
    <div className="flex min-h-screen bg-pale">
      <AdminSidebar role={role} impersonatingName={impersonatingName} />
      <main className="flex-1 overflow-y-auto min-h-screen" style={{ marginLeft: 250 }}>
        {children}
      </main>
    </div>
  )
}
