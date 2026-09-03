'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { silentReregister } from '@/lib/push/client'

// Glocke mit Ungelesen-Badge. Zaehlt per count(head) beim Laden, bei
// Rueckkehr in die App und nach einem Push. Kein globales Realtime.
export function NotificationBell({ className = '' }: { className?: string }) {
  const router = useRouter()
  const [unread, setUnread] = useState(0)

  const refresh = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false)
    setUnread(count ?? 0)
  }, [])

  useEffect(() => {
    refresh()
    silentReregister(url => router.push(url))
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pz:push-received', refresh)
    window.addEventListener('pz:notifications-read', refresh)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pz:push-received', refresh)
      window.removeEventListener('pz:notifications-read', refresh)
    }
  }, [refresh, router])

  return (
    <button onClick={() => router.push('/benachrichtigungen')} aria-label="Benachrichtigungen" className={`relative ${className}`}>
      <Bell size={18} className="text-white" />
      {unread > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#E86B5A] text-white text-[10px] font-bold flex items-center justify-center border-2 border-[#8BB06A]">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  )
}
