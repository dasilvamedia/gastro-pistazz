'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Props {
  restaurantName: string
}

export function ImpersonateBanner({ restaurantName }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleReturn() {
    setLoading(true)
    try {
      await fetch('/api/admin/impersonate', { method: 'DELETE' })
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/admin-login')
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="bg-yellow-400 text-black py-2 px-4 text-sm font-semibold flex items-center justify-center gap-3">
      <span>Eingeloggt als {restaurantName}</span>
      <button
        onClick={handleReturn}
        disabled={loading}
        className="underline hover:no-underline disabled:opacity-60"
      >
        {loading ? 'Abmelden...' : 'Zurück zum Admin'}
      </button>
    </div>
  )
}
