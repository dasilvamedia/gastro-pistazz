import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Star } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { RESTAURANT_TYPE_LABELS } from '@/types'
import type { Restaurant } from '@/types'

interface RestaurantCardProps {
  restaurant: Restaurant
  distance?: number
  className?: string
}

export function RestaurantCard({ restaurant, distance, className = '' }: RestaurantCardProps) {
  const {
    id,
    name,
    type,
    logo_url,
    cover_url,
    avg_rating,
    city,
    is_featured,
    is_verified,
  } = restaurant

  return (
    <Link href={`/restaurant/${id}`} className="block group">
      <div
        className={[
          'bg-white rounded-2xl overflow-hidden border border-charcoal/5 shadow-sm transition-all duration-200 group-hover:scale-[1.02] group-hover:shadow-[0_8px_30px_rgba(139,176,106,0.18)]',
          className,
        ].join(' ')}
      >
        <div className="relative h-40 bg-gradient-to-br from-light to-pale overflow-hidden">
          {cover_url ? (
            <Image
              src={cover_url}
              alt={name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 400px"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-light via-pale to-primary/10" />
          )}
          <div className="absolute top-3 left-3 flex gap-1.5">
            {is_featured && <Badge variant="featured" label="Featured" />}
            {is_verified && <Badge variant="verified" label="Verifiziert" />}
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              {logo_url ? (
                <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-charcoal/8 shrink-0">
                  <Image src={logo_url} alt={`${name} Logo`} fill className="object-cover" sizes="40px" />
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
            <div className="flex items-center gap-1 shrink-0">
              <Star className="w-3.5 h-3.5 text-gold fill-gold" />
              <span className="text-xs font-semibold text-charcoal">{avg_rating.toFixed(1)}</span>
            </div>
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
