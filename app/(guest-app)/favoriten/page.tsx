'use client'

/**
 * Favoriten: Tinder-Style-Swipe durch alle Restaurants.
 * - Rechts = Favorit (DB, ueberall verfuegbar), links = uninteressant (lokal)
 * - Tippen auf die Karte oeffnet ein Detail-Sheet mit mehr Infos und
 *   grossen Like/Nope-Buttons - die Entscheidung schliesst das Sheet und
 *   wischt die Karte sofort weg (zurueck im Stapel, ohne Umweg)
 * - Drag laeuft imperativ ueber style.transform (60fps, kein Re-Render
 *   pro Fingerbewegung)
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Heart, X, MapPin, Star, RotateCcw, AtSign, ChevronRight } from 'lucide-react'
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
  const [detail, setDetail] = useState<Restaurant | null>(null)
  const [flyOut, setFlyOut] = useState<null | 'left' | 'right'>(null)

  // Imperatives Draggen: Transform direkt am Element, React bleibt ruhig
  const cardRef = useRef<HTMLDivElement | null>(null)
  const likeRef = useRef<HTMLDivElement | null>(null)
  const nopeRef = useRef<HTMLDivElement | null>(null)
  const dragStart = useRef<{ x: number; y: number; t: number } | null>(null)
  const dragX = useRef(0)

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
    // Huebsche Pistazz-Pille UNTEN (ueber der Taskleiste), gut lesbar -
    // der Standard-Toast sass oben unter der Notch
    toast(`${r.name} ist jetzt ein Favorit`, {
      duration: 1400,
      position: 'bottom-center',
      icon: '💚',
      style: {
        background: 'linear-gradient(135deg, #8BB06A 0%, #6D9450 100%)',
        color: '#fff',
        fontWeight: 700,
        fontSize: '14px',
        borderRadius: '9999px',
        padding: '10px 18px',
        boxShadow: '0 8px 24px rgba(139,176,106,0.45)',
        marginBottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)',
      },
    })
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

  const setCardTransform = (x: number, y: number, animate: boolean) => {
    const el = cardRef.current
    if (!el) return
    el.style.transition = animate ? 'transform 0.28s cubic-bezier(0.22, 0.9, 0.36, 1)' : 'none'
    el.style.transform = `translate3d(${x}px, ${y / 3}px, 0) rotate(${x / 14}deg)`
    if (likeRef.current) likeRef.current.style.opacity = String(Math.min(1, Math.max(0, x / 90)))
    if (nopeRef.current) nopeRef.current.style.opacity = String(Math.min(1, Math.max(0, -x / 90)))
  }

  // Karte wegfliegen lassen, danach Aktion ausfuehren
  const swipe = useCallback((dir: 'left' | 'right') => {
    if (!top || flyOut) return
    setFlyOut(dir)
    setCardTransform(dir === 'right' ? 640 : -640, 0, true)
    if (likeRef.current && dir === 'right') likeRef.current.style.opacity = '1'
    if (nopeRef.current && dir === 'left') nopeRef.current.style.opacity = '1'
    setTimeout(() => {
      if (dir === 'right') addFavorite(top)
      else dismiss(top)
      setFlyOut(null)
      dragX.current = 0
      // Neue oberste Karte startet sauber in der Mitte
      requestAnimationFrame(() => setCardTransform(0, 0, false))
    }, 270)
  }, [top, flyOut, addFavorite, dismiss])

  // ── Gesten: Ziehen = Swipe, kurzer Tap = Detail-Sheet ───────────────────
  const onPointerDown = (e: React.PointerEvent) => {
    if (flyOut) return
    dragStart.current = { x: e.clientX, y: e.clientY, t: Date.now() }
    dragX.current = 0
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current || flyOut) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    dragX.current = dx
    setCardTransform(dx, dy, false)
  }
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragStart.current) return
    const { x, y, t } = dragStart.current
    dragStart.current = null
    const dx = e.clientX - x
    const dy = e.clientY - y
    const dt = Date.now() - t
    // Kurzer Tap ohne Bewegung: mehr Infos zeigen (wie bei Tinder)
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && dt < 350) {
      setCardTransform(0, 0, true)
      if (top) setDetail(top)
      return
    }
    if (dx > 90) swipe('right')
    else if (dx < -90) swipe('left')
    else setCardTransform(0, 0, true)
  }

  // Entscheidung aus dem Detail-Sheet: Sheet zu, Karte fliegt sofort
  const decideFromDetail = (dir: 'left' | 'right') => {
    setDetail(null)
    requestAnimationFrame(() => swipe(dir))
  }

  const favList = restaurants.filter(r => favIds.has(r.id))

  const cardInner = (r: Restaurant, isTop: boolean) => (
    <>
      <div className="absolute inset-0">
        {r.cover_url || r.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.cover_url ?? r.logo_url ?? ''} alt={r.name} className="w-full h-full object-cover" draggable={false} />
        ) : (
          <div className="w-full h-full gradient-primary-soft flex items-center justify-center text-6xl">🍽️</div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
      </div>

      {isTop && (
        <>
          <div ref={likeRef} className="absolute top-6 left-5 px-3 py-1.5 rounded-xl border-4 border-[#8BB06A] text-[#8BB06A] text-2xl font-black rotate-[-14deg]" style={{ opacity: 0 }}>
            ❤️ FAVORIT
          </div>
          <div ref={nopeRef} className="absolute top-6 right-5 px-3 py-1.5 rounded-xl border-4 border-red-400 text-red-400 text-2xl font-black rotate-[14deg]" style={{ opacity: 0 }}>
            NOPE
          </div>
        </>
      )}

      {/* Kurzinfo wie bei Tinder: Name gross, eine Zeile Fakten, kurze Bio */}
      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[26px] font-bold leading-tight truncate" style={{ fontFamily: 'DM Serif Display, serif' }}>
              {r.name}
            </p>
            <p className="flex items-center gap-2.5 text-[13px] text-white/85 mt-1 flex-wrap">
              <span>{TYPE_LABEL[r.type] ?? r.type}</span>
              {r.city && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{r.city}</span>}
              {r.google_rating != null && (
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-[#E5B84C] text-[#E5B84C]" />{Number(r.google_rating).toFixed(1)}
                </span>
              )}
            </p>
            {r.description && <p className="text-[13px] text-white/60 mt-1.5 line-clamp-2">{r.description}</p>}
          </div>
          {/* Info-Affordanz: hier gibt es mehr */}
          <span className="shrink-0 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-serif font-bold">
            i
          </span>
        </div>
        {r.points_per_story > 0 && (
          <span className="inline-block mt-2.5 px-3 py-1 rounded-full text-[12px] font-bold" style={{ background: 'rgba(139,176,106,0.9)' }}>
            +{r.points_per_story} Punkte pro Story
          </span>
        )}
      </div>
    </>
  )

  return (
    <div
      className={`bg-[#F5F9F0] ${tab === 'swipe' ? 'fixed inset-0 overflow-hidden flex flex-col' : 'min-h-dvh pb-28'}`}
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)', ...(tab === 'swipe' ? { paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 76px)' } : {}) }}
    >
      <div className={`max-w-md w-full mx-auto px-4 ${tab === 'swipe' ? 'flex-1 flex flex-col min-h-0' : ''}`}>

        <h1 className="text-2xl text-[#1C1F1A] mb-4" style={{ fontFamily: 'DM Serif Display, serif' }}>
          {tab === 'swipe' ? 'Entdecke deine Lieblinge' : 'Meine Favoriten'}
        </h1>
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
            <div className="relative flex-1 min-h-0 select-none">
              {top ? (
                <>
                  {next && (
                    <div key={next.id} className="absolute inset-0 rounded-3xl overflow-hidden bg-white shadow-xl border border-[#EEF5E6]" style={{ transform: 'scale(0.95) translateY(14px)', zIndex: 1 }}>
                      {cardInner(next, false)}
                    </div>
                  )}
                  <div
                    key={top.id}
                    ref={cardRef}
                    className="absolute inset-0 rounded-3xl overflow-hidden bg-white shadow-xl border border-[#EEF5E6]"
                    style={{ touchAction: 'none', zIndex: 2, willChange: 'transform' }}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                  >
                    {cardInner(top, true)}
                  </div>
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
              Wischen zum Entscheiden · Tippen für mehr Infos
            </p>
          </>
        ) : (
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

      {/* ── Detail-Sheet: mehr Infos im Tinder-Kontext, Entscheidung geht
             sofort zurueck in den Stapel ── */}
      {/* Portal auf Body-Ebene: die Seiten-Einblende-Animation erzeugt einen
          Transform-Kontext, der 'fixed' einfaengt - im Portal liegt das Sheet
          garantiert VOR der Taskleiste und buendig am unteren Rand */}
      {detail && createPortal(
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setDetail(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <div
            className="relative w-full max-w-md mx-auto bg-white rounded-t-3xl overflow-hidden max-h-[86dvh] flex flex-col"
            style={{ animation: 'sheetUp 0.28s cubic-bezier(0.22, 0.9, 0.36, 1)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="relative h-44 shrink-0">
              {detail.cover_url || detail.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={detail.cover_url ?? detail.logo_url ?? ''} alt={detail.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full gradient-primary-soft flex items-center justify-center text-5xl">🍽️</div>
              )}
              <button
                onClick={() => setDetail(null)}
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/45 backdrop-blur-sm text-white flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* flex-1 + min-h-0: der Textbereich scrollt intern und kann die
                Entscheidungs-Buttons NIE aus dem Bild schieben */}
            <div className="px-5 pt-4 pb-2 overflow-y-auto flex-1 min-h-0">
              <p className="text-[24px] font-bold text-[#1C1F1A] leading-tight" style={{ fontFamily: 'DM Serif Display, serif' }}>
                {detail.name}
              </p>
              <p className="flex items-center gap-2.5 text-[13px] text-[#6D7A6D] mt-1 flex-wrap">
                <span>{TYPE_LABEL[detail.type] ?? detail.type}</span>
                {detail.city && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{[detail.address, detail.city].filter(Boolean).join(', ')}</span>}
              </p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {detail.google_rating != null && (
                  <span className="flex items-center gap-1 text-[13px] font-semibold text-[#1C1F1A]">
                    <Star className="w-4 h-4 fill-[#E5B84C] text-[#E5B84C]" />
                    {Number(detail.google_rating).toFixed(1)}
                    {detail.google_review_count ? <span className="text-[#6D7A6D] font-normal">({detail.google_review_count})</span> : null}
                  </span>
                )}
                {detail.instagram_handle && (
                  <span className="flex items-center gap-1 text-[13px] text-[#6D7A6D]">
                    <AtSign className="w-3.5 h-3.5" />@{detail.instagram_handle.replace(/^@+/, '')}
                  </span>
                )}
                {detail.points_per_story > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#EEF5E6] text-[#577A3D] text-[12px] font-bold">
                    +{detail.points_per_story} Punkte pro Story
                  </span>
                )}
              </div>
              {detail.description && (
                <p className="text-[14px] text-[#1C1F1A]/70 leading-relaxed mt-3">{detail.description}</p>
              )}
              <button
                onClick={() => router.push(`/restaurant/${detail.id}`)}
                className="mt-3 mb-1 flex items-center gap-1 text-[13px] font-bold text-[#577A3D]"
              >
                Komplettes Profil ansehen<ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Entscheidung: schliesst das Sheet und wischt die Karte sofort */}
            <div
              className="flex items-center justify-center gap-8 px-5 pt-3 shrink-0 border-t border-[#EEF5E6]"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 12px) + 14px)' }}
            >
              <button
                onClick={() => decideFromDetail('left')}
                className="w-16 h-16 rounded-full bg-white border-2 border-red-200 text-red-400 flex items-center justify-center shadow-md active:scale-90 transition-transform"
              >
                <X className="w-8 h-8" strokeWidth={2.5} />
              </button>
              <button
                onClick={() => decideFromDetail('right')}
                className="w-16 h-16 rounded-full gradient-primary text-white flex items-center justify-center shadow-lg shadow-[#8BB06A]/40 active:scale-90 transition-transform"
              >
                <Heart className="w-8 h-8 fill-white" />
              </button>
            </div>
          </div>
          <style>{`@keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
        </div>,
        document.body
      )}
    </div>
  )
}
