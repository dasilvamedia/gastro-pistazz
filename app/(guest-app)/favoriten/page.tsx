'use client'

/**
 * Favoriten: Tinder-Style-Swipe durch alle Restaurants.
 * Rechts = Favorit (in der Datenbank, ueberall verfuegbar),
 * links = uninteressant (nur lokal gemerkt, taucht nicht wieder auf).
 * Zweiter Tab zeigt die eigenen Favoriten als Liste.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, X, MapPin, Star, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import type { Restaurant } from '@/types'

const DISMISS_KEY = 'fav-dismissed'
const LOCAL_FAV_KEY = 'fav-local' // Fallback, falls die DB-Tabelle noch fehlt

function loadIds(key: string): string[] {
  try { return JSON.parse(localStorage.getItem(key) ?? '[]') } catch { return [] }
}
function saveIds(key: string, ids: string[]) {
  try { localStorage.setItem(key, JSON.stringify(ids)) } catch {}
}

// Stabiler Zufall pro Sitzung, damit der Stapel nicht bei jedem Render springt
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const TYPE_LABEL: Record<string, string> = {
  restaurant: 'Restaurant', bar: 'Bar', bistro: 'Bistro', cafe: 'Café',
  imbiss: 'Imbiss', food_truck: 'Foodtruck', hotel: 'Hotel',
  fine_dining: 'Fine Dining', biergarten: 'Biergarten', eisdiele: 'Eisdiele',
}

export default function FavoritenPage() {
  const router = useRouter()
  const supabase = createClient()

  const [tab, setTab] = useState<'swipe' | 'liste'>('swipe')
  const [userId, setUserId] = useState<string | null>(null)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [favIds, setFavIds] = useState<Set<string>>(new Set())
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [dbOk, setDbOk] = useState(true)

  // Swipe-Zustand der obersten Karte
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false })
  const [flyOut, setFlyOut] = useState<null | 'left' | 'right'>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setUserId(user.id)
      setDismissed(new Set(loadIds(DISMISS_KEY)))

      const { data: rs } = await supabase
        .from('restaurants')
        .select('*')
        .eq('is_active', true)
      setRestaurants(shuffle((rs as Restaurant[]) ?? []))

      const { data: favs, error } = await supabase
        .from('favorites')
        .select('restaurant_id')
        .eq('user_id', user.id)
      if (error) {
        // Tabelle (noch) nicht da: lokal weiterarbeiten, nichts geht verloren
        setDbOk(false)
        setFavIds(new Set(loadIds(LOCAL_FAV_KEY)))
      } else {
        setFavIds(new Set((favs ?? []).map(f => f.restaurant_id as string)))
      }
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const deck = restaurants.filter(r => !favIds.has(r.id) && !dismissed.has(r.id))
  const top = deck[0]
  const next = deck[1]

  const addFavorite = useCallback(async (r: Restaurant) => {
    setFavIds(prev => new Set([...prev, r.id]))
    if (dbOk && userId) {
      const { error } = await supabase.from('favorites').insert({ user_id: userId, restaurant_id: r.id })
      if (error && error.code !== '23505') {
        setDbOk(false)
        saveIds(LOCAL_FAV_KEY, [...loadIds(LOCAL_FAV_KEY), r.id])
      }
    } else {
      saveIds(LOCAL_FAV_KEY, [...loadIds(LOCAL_FAV_KEY), r.id])
    }
    toast(`❤️ ${r.name} gemerkt`, { duration: 1200 })
  }, [dbOk, userId, supabase])

  const removeFavorite = useCallback(async (r: Restaurant) => {
    setFavIds(prev => { const s = new Set(prev); s.delete(r.id); return s })
    if (dbOk && userId) await supabase.from('favorites').delete().eq('user_id', userId).eq('restaurant_id', r.id)
    saveIds(LOCAL_FAV_KEY, loadIds(LOCAL_FAV_KEY).filter(id => id !== r.id))
  }, [dbOk, userId, supabase])

  const dismiss = useCallback((r: Restaurant) => {
    setDismissed(prev => {
      const s = new Set([...prev, r.id])
      saveIds(DISMISS_KEY, [...s])
      return s
    })
  }, [])

  // Karte wegfliegen lassen, danach Aktion ausfuehren
  const swipe = useCallback((dir: 'left' | 'right') => {
    if (!top || flyOut) return
    setFlyOut(dir)
    setTimeout(() => {
      if (dir === 'right') addFavorite(top)
      else dismiss(top)
      setFlyOut(null)
      setDrag({ x: 0, y: 0, active: false })
    }, 260)
  }, [top, flyOut, addFavorite, dismiss])

  // ── Drag-Gesten (Pointer deckt Touch + Maus ab) ─────────────────────────
  const onPointerDown = (e: React.PointerEvent) => {
    if (flyOut) return
    dragStart.current = { x: e.clientX, y: e.clientY }
    setDrag(d => ({ ...d, active: true }))
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current || flyOut) return
    setDrag({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y, active: true })
  }
  const onPointerUp = () => {
    if (!dragStart.current) return
    const dx = drag.x
    dragStart.current = null
    if (dx > 90) swipe('right')
    else if (dx < -90) swipe('left')
    else setDrag({ x: 0, y: 0, active: false })
  }

  const rot = flyOut ? (flyOut === 'right' ? 25 : -25) : drag.x / 14
  const tx = flyOut ? (flyOut === 'right' ? 600 : -600) : drag.x
  const likeOpacity = Math.min(1, Math.max(0, (flyOut === 'right' ? 200 : drag.x) / 90))
  const nopeOpacity = Math.min(1, Math.max(0, (flyOut === 'left' ? -200 : drag.x) / -90))

  const favList = restaurants.filter(r => favIds.has(r.id))

  const card = (r: Restaurant, isTop: boolean) => (
    <div
      key={r.id}
      className="absolute inset-0 rounded-3xl overflow-hidden bg-white shadow-xl border border-[#EEF5E6]"
      style={isTop ? {
        transform: `translateX(${tx}px) translateY(${drag.y / 3}px) rotate(${rot}deg)`,
        transition: drag.active && !flyOut ? 'none' : 'transform 0.26s ease-out',
        touchAction: 'none',
        zIndex: 2,
      } : { transform: 'scale(0.95) translateY(14px)', zIndex: 1 }}
      onPointerDown={isTop ? onPointerDown : undefined}
      onPointerMove={isTop ? onPointerMove : undefined}
      onPointerUp={isTop ? onPointerUp : undefined}
      onPointerCancel={isTop ? onPointerUp : undefined}
    >
      {/* Bild */}
      <div className="absolute inset-0">
        {r.cover_url || r.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.cover_url ?? r.logo_url ?? ''} alt={r.name} className="w-full h-full object-cover" draggable={false} />
        ) : (
          <div className="w-full h-full gradient-primary-soft flex items-center justify-center text-6xl">🍽️</div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 to-transparent" />
      </div>

      {/* Like/Nope-Stempel */}
      {isTop && (
        <>
          <div className="absolute top-6 left-5 px-3 py-1.5 rounded-xl border-4 border-[#8BB06A] text-[#8BB06A] text-2xl font-black rotate-[-14deg]" style={{ opacity: likeOpacity }}>
            ❤️ FAVORIT
          </div>
          <div className="absolute top-6 right-5 px-3 py-1.5 rounded-xl border-4 border-red-400 text-red-400 text-2xl font-black rotate-[14deg]" style={{ opacity: nopeOpacity }}>
            NOPE
          </div>
        </>
      )}

      {/* Infos */}
      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-[11px] font-semibold">
            {TYPE_LABEL[r.type] ?? r.type}
          </span>
          {r.google_rating != null && (
            <span className="flex items-center gap-1 text-[12px] font-semibold">
              <Star className="w-3.5 h-3.5 fill-[#E5B84C] text-[#E5B84C]" />{Number(r.google_rating).toFixed(1)}
            </span>
          )}
        </div>
        <p className="text-2xl font-bold leading-tight" style={{ fontFamily: 'DM Serif Display, serif' }}>{r.name}</p>
        {r.city && (
          <p className="flex items-center gap-1 text-sm text-white/80 mt-0.5">
            <MapPin className="w-3.5 h-3.5" />{r.city}
          </p>
        )}
        {r.description && <p className="text-[13px] text-white/65 mt-1.5 line-clamp-2">{r.description}</p>}
      </div>
    </div>
  )

  return (
    <div className="min-h-dvh bg-[#F5F9F0] pb-28" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}>
      <div className="max-w-md mx-auto px-4">

        {/* Kopf + Tabs */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl text-[#1C1F1A]" style={{ fontFamily: 'DM Serif Display, serif' }}>
            {tab === 'swipe' ? 'Entdecke deine Lieblinge' : 'Meine Favoriten'}
          </h1>
        </div>
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setTab('swipe')}
            className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-colors ${tab === 'swipe' ? 'gradient-primary text-white' : 'bg-white text-[#6D7A6D] border border-[#D4E8C2]'}`}
          >
            Swipen
          </button>
          <button
            onClick={() => setTab('liste')}
            className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-colors flex items-center justify-center gap-1.5 ${tab === 'liste' ? 'gradient-primary text-white' : 'bg-white text-[#6D7A6D] border border-[#D4E8C2]'}`}
          >
            <Heart className={`w-4 h-4 ${tab === 'liste' ? 'fill-white' : ''}`} />
            Meine Favoriten{favIds.size > 0 ? ` (${favIds.size})` : ''}
          </button>
        </div>

        {loading ? (
          <div className="h-[420px] rounded-3xl skeleton" />
        ) : tab === 'swipe' ? (
          <>
            {/* Kartenstapel */}
            <div className="relative h-[58dvh] max-h-[520px] select-none">
              {top ? (
                <>
                  {next && card(next, false)}
                  {card(top, true)}
                </>
              ) : (
                <div className="absolute inset-0 rounded-3xl bg-white border border-[#D4E8C2] flex flex-col items-center justify-center text-center px-8 gap-3">
                  <span className="text-5xl">🎉</span>
                  <p className="text-lg font-bold text-[#1C1F1A]">Alle durchgeswiped!</p>
                  <p className="text-sm text-[#6D7A6D]">Du hast dir alle Restaurants angesehen. Schau in deine Favoriten oder setz die übersprungenen zurück.</p>
                  <button
                    onClick={() => { saveIds(DISMISS_KEY, []); setDismissed(new Set()) }}
                    className="mt-2 flex items-center gap-2 text-sm font-bold text-[#577A3D]"
                  >
                    <RotateCcw className="w-4 h-4" />Übersprungene zurücksetzen
                  </button>
                </div>
              )}
            </div>

            {/* Aktions-Buttons */}
            {top && (
              <div className="flex items-center justify-center gap-8 mt-6">
                <button
                  onClick={() => swipe('left')}
                  className="w-16 h-16 rounded-full bg-white border-2 border-red-200 text-red-400 flex items-center justify-center shadow-md active:scale-90 transition-transform"
                >
                  <X className="w-8 h-8" strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => swipe('right')}
                  className="w-16 h-16 rounded-full gradient-primary text-white flex items-center justify-center shadow-lg shadow-[#8BB06A]/40 active:scale-90 transition-transform"
                >
                  <Heart className="w-8 h-8 fill-white" />
                </button>
              </div>
            )}
            <p className="text-center text-[12px] text-[#6D7A6D] mt-4">
              Nach rechts wischen = Favorit, nach links = kein Interesse
            </p>
          </>
        ) : (
          /* ── Favoriten-Liste ── */
          favList.length === 0 ? (
            <div className="rounded-3xl bg-white border border-[#D4E8C2] flex flex-col items-center justify-center text-center px-8 py-14 gap-3">
              <Heart className="w-12 h-12 text-[#D4E8C2]" />
              <p className="text-lg font-bold text-[#1C1F1A]">Noch keine Favoriten</p>
              <p className="text-sm text-[#6D7A6D]">Swipe nach rechts, um Restaurants zu deinen Favoriten hinzuzufügen.</p>
              <button onClick={() => setTab('swipe')} className="mt-2 gradient-primary text-white font-bold px-6 py-2.5 rounded-full text-sm">
                Jetzt swipen
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {favList.map(r => (
                <div key={r.id} className="flex items-center gap-3 bg-white rounded-2xl border border-[#EEF5E6] p-3 shadow-sm">
                  <button onClick={() => router.push(`/restaurant/${r.id}`)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-[#EEF5E6]">
                      {r.logo_url || r.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.logo_url ?? r.cover_url ?? ''} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">🍽️</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[#1C1F1A] text-[15px] truncate">{r.name}</p>
                      <p className="text-[12px] text-[#6D7A6D] flex items-center gap-2">
                        {r.city && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{r.city}</span>}
                        {r.google_rating != null && (
                          <span className="flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-[#E5B84C] text-[#E5B84C]" />{Number(r.google_rating).toFixed(1)}
                          </span>
                        )}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => removeFavorite(r)}
                    className="w-10 h-10 rounded-full bg-[#EEF5E6] flex items-center justify-center shrink-0"
                    aria-label="Aus Favoriten entfernen"
                  >
                    <Heart className="w-5 h-5 fill-[#8BB06A] text-[#8BB06A]" />
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}
