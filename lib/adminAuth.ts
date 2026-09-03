import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Super-Admin-Guard fuer /api/admin/*: liefert userId + Service-Role-Client
// oder null. 'admin' bleibt aus Kompatibilitaet erlaubt.
export async function assertSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: p } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (p?.role !== 'super_admin' && p?.role !== 'admin') return null
  return { userId: user.id, admin, role: p.role as string }
}
