import Link from 'next/link'
import Image from 'next/image'
import { MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { RESTAURANT_TYPE_LABELS } from '@/types'
import type { Restaurant } from '@/types'

interface RestaurantCardProps {
  restaurant: Restaurant
  distance?: number
  className?: string
}

function GoogleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 18 18" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  )
}

export function RestaurantCard({ restaurant, distance, className = '' }: RestaurantCardProps) {
  const {
    id,
    name,
    type,
    logo_url,
    cover_url,
    avg_rating,
    google_rating,
    google_review_count,
    city,
    is_featured,
    is_verified,
    primary_color,
  } = restaurant

  const hasGoogle = google_rating != null && google_rating > 0

  return (
    <Link href={`/restaurant/${id}`} className="block group">
      <div
        className={[
          'bg-white rounded-2xl overflow-hidden border border-charcoal/5 shadow-sm transition-all duration-200 group-hover:scale-[1.02] group-hover:shadow-[0_8px_30px_rgba(139,176,106,0.18)]',
          className,
        ].join(' ')}
      >
        {/* Cover image */}
        <div className="relative h-40 overflow-hidden">
          {cover_url ? (
            <Image
              src={cover_url}
              alt={name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 400px"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: primary_color
                  ? `linear-gradient(135deg, ${primary_color}99, ${primary_color})`
                  : 'linear-gradient(135deg, #8BB06A, #577A3D)',
              }}
            />
          )}
          {/* Dark overlay for readability when cover exists */}
          {cover_url && <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />}

          <div className="absolute top-3 left-3 flex gap-1.5">
            {is_featured && <Badge variant="featured" label="Featured" />}
            {is_verified && <Badge variant="verified" label="Verifiziert" />}
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              {logo_url ? (
                <div className="w-10 h-10 rounded-xl border border-charcoal/8 shrink-0 bg-white flex items-center justify-center">
                  <img src={logo_url} alt={`${name} Logo`} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '3px', display: 'block' }} />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-light flex items-center justify-center shrink-0">
                  <span className="text-lg font-serif text-dark">{name[0]}</span>
                </div>
              )}
              <div>
                <h3 className="font-semibold text-charcoal text-sm leading-tight">{name}</h3>
                <span className="text-xs text-charcoal/50">{RESTAURANT_TYPE_LABELS[type]}</span>
              </div>
            </div>

            {/* Google rating badge or fallback */}
            {hasGoogle ? (
              <div className="flex items-center gap-1 shrink-0 bg-gray-50 rounded-lg px-2 py-1">
                <GoogleIcon />
                <span className="text-xs font-bold text-[#1C1F1A]">{google_rating!.toFixed(1)}</span>
                {google_review_count != null && google_review_count > 0 && (
                  <span className="text-[10px] text-gray-400">
                    ({google_review_count >= 1000 ? `${(google_review_count / 1000).toFixed(1)}k` : google_review_count})
                  </span>
                )}
              </div>
            ) : avg_rating > 0 ? (
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[#FBBC04]">★</span>
                <span className="text-xs font-semibold text-charcoal">{avg_rating.toFixed(1)}</span>
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-charcoal/50">
            {city && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {city}
              </span>
            )}
            {distance !== undefined && (
              <span className="font-medium text-primary">{distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
