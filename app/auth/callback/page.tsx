'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // The browser client with detectSessionInUrl:true automatically exchanges
    // the ?code= parameter using the PKCE verifier it stored in cookies.
    // We listen for the SIGNED_IN event to know when it's done.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const handleUser = async (user: { id: string; user_metadata?: Record<string, string> }) => {
          subscription.unsubscribe()

          // Sync name + avatar from Google/OAuth metadata into profile
          const meta = user.user_metadata ?? {}
          const fullName = meta.full_name ?? meta.name ?? null
          const avatarUrl = meta.avatar_url ?? meta.picture ?? null

          // Use RPC to get role — bypasses RLS recursion issues
          const { data: roleData } = await supabase.rpc('get_my_role')
          const role = roleData as string | null

          // Also get profile for onboarding check + name sync
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, onboarding_completed, full_name')
            .eq('id', user.id)
            .single()

          // Update name/avatar if missing
          if (profile && (!profile.full_name || profile.full_name === '') && fullName) {
            await supabase
              .from('profiles')
              .update({ full_name: fullName, avatar_url: avatarUrl })
              .eq('id', user.id)
          }

          // Determine effective role (RPC is more reliable than direct select)
          const effectiveRole = role ?? profile?.role ?? null
          const isNoRow = profileError?.code === 'PGRST116'

          if (!effectiveRole && isNoRow) {
            // Genuinely new user
            await supabase.from('profiles').upsert({
              id: user.id,
              full_name: fullName,
              avatar_url: avatarUrl,
              role: 'guest',
              onboarding_completed: false,
            })
            router.replace('/onboarding')
          } else if (effectiveRole === 'super_admin' || effectiveRole === 'admin') {
            router.replace('/admin/dashboard')
          } else if (effectiveRole === 'restaurant_owner') {
            router.replace('/dashboard')
          } else if (profile && !profile.onboarding_completed) {
            router.replace('/onboarding')
          } else {
            router.replace('/home')
          }
        }

        if (event === 'SIGNED_IN' && session?.user) {
          await handleUser(session.user as Parameters<typeof handleUser>[0])
        } else if (event === 'INITIAL_SESSION') {
          // detectSessionInUrl already exchanged the code — check current session
          const { data: { session: currentSession } } = await supabase.auth.getSession()
          if (currentSession?.user) {
            await handleUser(currentSession.user as Parameters<typeof handleUser>[0])
          }
        }
      }
    )

    // Fallback: if no auth event fires after 8s, something went wrong
    const timeout = setTimeout(() => {
      subscription.unsubscribe()
      router.replace('/login?error=timeout')
    }, 8000)

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [router])

  return (
    <div className="min-h-screen bg-[#EEF5E6] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-[#8BB06A] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#1C1F1A]/60 text-sm">Anmeldung wird verarbeitet…</p>
      </div>
    </div>
  )
}
