// Adresse -> Koordinaten. Google Places, wenn ein Key da ist (liefert
// zusaetzlich place_id, Rating, Website, Telefon), sonst Nominatim (OSM).

export interface GeocodeResult {
  lat: number
  lng: number
  source: 'google' | 'nominatim'
  place_id?: string
  formatted_address?: string
  rating?: number
  review_count?: number
  website?: string
  phone?: string
}

const NOMINATIM_HEADERS = { 'User-Agent': 'gastro-pistazz/1.0 (info@pistazz.io)' }

export function googlePlacesKey(): string | null {
  return process.env.GOOGLE_PLACES_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? null
}

async function nominatim(query: string): Promise<GeocodeResult | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: NOMINATIM_HEADERS, signal: AbortSignal.timeout(8000) },
    )
    const data = await res.json()
    if (data?.[0]?.lat) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), source: 'nominatim' }
  } catch { /* unten Fallback */ }
  return null
}

async function googleFindPlace(text: string): Promise<GeocodeResult | null> {
  const key = googlePlacesKey()
  if (!key) return null
  try {
    const fields = 'place_id,formatted_address,geometry,rating,user_ratings_total'
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(text)}&inputtype=textquery&fields=${fields}&language=de&key=${key}`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const json = await res.json()
    const c = json?.candidates?.[0]
    if (!c?.geometry?.location) return null
    const out: GeocodeResult = {
      lat: c.geometry.location.lat, lng: c.geometry.location.lng, source: 'google',
      place_id: c.place_id, formatted_address: c.formatted_address,
      rating: c.rating, review_count: c.user_ratings_total,
    }
    // Details fuer Website/Telefon (ein zweiter Call, nur bei Treffer)
    if (c.place_id) {
      const det = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${c.place_id}&fields=website,formatted_phone_number&language=de&key=${key}`,
        { signal: AbortSignal.timeout(8000) },
      ).then(r => r.json()).catch(() => null)
      if (det?.result?.website) out.website = det.result.website
      if (det?.result?.formatted_phone_number) out.phone = det.result.formatted_phone_number
    }
    return out
  } catch {
    return null
  }
}

/** Beste verfuegbare Geokodierung: Google (Name + Stadt), sonst Nominatim (Adresse, dann Name + Stadt) */
export async function geocodeRestaurant(input: { name: string; city: string; address?: string | null; zip?: string | null }): Promise<GeocodeResult | null> {
  const g = await googleFindPlace(`${input.name} ${input.address ?? ''} ${input.city}`.replace(/\s+/g, ' ').trim())
  if (g) return g
  if (input.address) {
    const n = await nominatim(`${input.address}, ${input.zip ?? ''} ${input.city}, Germany`)
    if (n) return n
  }
  return nominatim(`${input.name} ${input.city}`)
}
