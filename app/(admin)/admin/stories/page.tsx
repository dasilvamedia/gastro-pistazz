'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { StorySubmission, SubmissionStatus, TRIGGER_CONFIG } from '@/types'
import { MOCK_STORIES, IS_MOCK_MODE } from '@/lib/mock-data'

type Tab = SubmissionStatus

const TABS: { key: Tab; label: string }[] = [
  { key: 'pending', label: 'Ausstehend' },
  { key: 'approved', label: 'Genehmigt' },
  { key: 'rejected', label: 'Abgelehnt' },
]

function timeAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60) return 'gerade eben'
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min.`
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std.`
  return `vor ${Math.floor(diff / 86400)} Tagen`
}

type StoryWithUser = StorySubmission & {
  user: { full_name: string | null; instagram_handle: string | null } | null
}

export default function StoriesPage() {
  const supabase = createClient()
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [stories, setStories] = useState<StoryWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('pending')
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const fetchStories = useCallback(async (rid: string) => {
    const { data } = await supabase
      .from('story_submissions')
      .select('*, user:profiles(full_name, instagram_handle)')
      .eq('restaurant_id', rid)
      .order('created_at', { ascending: false })
    setStories((data ?? []) as StoryWithUser[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    if (IS_MOCK_MODE) {
      setStories(MOCK_STORIES.map(s => ({ ...s, user: (s as any).user ?? null })) as StoryWithUser[])
      setLoading(false)
      return
    }
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: rest } = await supabase.from('restaurants').select('id').eq('owner_id', user.id).single()
      if (rest) { setRestaurantId(rest.id); fetchStories(rest.id) }
    })
  }, [fetchStories, supabase])

  useEffect(() => {
    if (!restaurantId) return
    const channel = supabase
      .channel('story_submissions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'story_submissions', filter: `restaurant_id=eq.${restaurantId}` },
        () => fetchStories(restaurantId))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [restaurantId, fetchStories, supabase])

  const approve = async (id: string) => {
    const { error } = await supabase.from('story_submissions').update({ status: 'approved', verified_at: new Date().toISOString() }).eq('id', id)
    if (error) { toast.error('Fehler'); return }
    setStories(prev => prev.map(s => s.id === id ? { ...s, status: 'approved' } : s))
    toast.success('Story genehmigt')
  }

  const reject = async () => {
    if (!rejectId) return
    const { error } = await supabase.from('story_submissions').update({ status: 'rejected', rejection_reason: rejectReason }).eq('id', rejectId)
    if (error) { toast.error('Fehler'); return }
    setStories(prev => prev.map(s => s.id === rejectId ? { ...s, status: 'rejected' } : s))
    setRejectId(null)
    setRejectReason('')
    toast.success('Story abgelehnt')
  }

  const filtered = stories.filter(s => s.status === tab)
  const pendingCount = stories.filter(s => s.status === 'pending').length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-[#1C1F1A]">Story-Pruefung</h1>
        {pendingCount > 0 && (
          <span className="bg-[#E86B5A] text-white text-sm px-2.5 py-0.5 rounded-full font-medium">{pendingCount}</span>
        )}
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-[#8BB06A] text-[#8BB06A]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label} {t.key === 'pending' && pendingCount > 0 && `(${pendingCount})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-64 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p>Keine Einreichungen</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(story => {
            const trigger = TRIGGER_CONFIG[story.type as keyof typeof TRIGGER_CONFIG]
            return (
              <div key={story.id} className="glass rounded-xl overflow-hidden">
                <div className="h-40 bg-gray-100 relative flex items-center justify-center">
                  {story.media_url ? (
                    <img src={story.media_url} alt="Story" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-5xl">{trigger?.emoji ?? '📸'}</span>
                  )}
                  <span className="absolute top-2 left-2 text-xs bg-white/90 px-2 py-0.5 rounded-full font-medium">
                    {trigger?.emoji} {trigger?.label ?? story.type}
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-sm font-bold">
                      {(story.user?.full_name ?? 'U')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#1C1F1A]">{story.user?.full_name ?? 'Unbekannt'}</p>
                      {story.user?.instagram_handle && (
                        <p className="text-xs text-gray-400">@{story.user.instagram_handle}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{timeAgo(story.created_at)}</span>
                    <span className="bg-[#EEF5E6] text-[#6D9450] px-2 py-0.5 rounded-full font-medium">
                      +{story.points_awarded} Punkte
                    </span>
                  </div>
                  {story.instagram_permalink && (
                    <a href={story.instagram_permalink} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-[#8BB06A] underline hover:no-underline">
                      Instagram ansehen
                    </a>
                  )}
                  {tab === 'pending' && (
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => approve(story.id)}
                        className="flex-1 px-3 py-2 rounded-lg bg-[#8BB06A] text-white text-xs font-medium hover:opacity-90">
                        Genehmigen
                      </button>
                      <button onClick={() => setRejectId(story.id)}
                        className="flex-1 px-3 py-2 rounded-lg bg-[#E86B5A] text-white text-xs font-medium hover:opacity-90">
                        Ablehnen
                      </button>
                    </div>
                  )}
                  {story.status === 'rejected' && story.rejection_reason && (
                    <p className="text-xs text-[#E86B5A]">Grund: {story.rejection_reason}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {rejectId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-[#1C1F1A] mb-3">Story ablehnen</h3>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="Ablehnungsgrund (optional)" rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#E86B5A] mb-4 resize-none" />
            <div className="flex gap-3">
              <button onClick={() => setRejectId(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm hover:bg-gray-50">
                Abbrechen
              </button>
              <button onClick={reject}
                className="flex-1 px-4 py-2 rounded-lg bg-[#E86B5A] text-white text-sm hover:opacity-90">
                Ablehnen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
