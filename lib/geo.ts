// Geo-Helfer fuer Umkreissuche und Standort-Pruefung. Keine Browser-Globals
// auf Modulebene, damit die Datei auch serverseitig importierbar ist.

export type LatLng = { lat: number; lng: number }

export const DEFAULT_RADIUS_KM = 20
export const MIN_RADIUS_KM = 1
export const MAX_RADIUS_KM = 50

const EARTH_RADIUS_KM = 6371

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return Math.round(haversineKm(lat1, lng1, lat2, lng2) * 1000)
}

/** "850 m" unter 1 km, sonst "2,3 km" */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(1, Math.round(km * 1000))} m`
  return `${km.toLocaleString('de-DE', { maximumFractionDigits: km < 10 ? 1 : 0 })} km`
}

/** Bounding-Box als Vorfilter fuer die DB (Breitengrad-/Laengengrad-Grenzen) */
export function boundingBox(lat: number, lng: number, radiusKm: number) {
  const dLat = radiusKm / 111.32
  const dLng = radiusKm / (111.32 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)))
  return { minLat: lat - dLat, maxLat: lat + dLat, minLng: lng - dLng, maxLng: lng + dLng }
}

export type GeoPermissionState = 'granted' | 'prompt' | 'denied' | 'unknown'

export async function getGeoPermissionState(): Promise<GeoPermissionState> {
  try {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return 'unknown'
    if (!navigator.permissions?.query) return 'unknown'
    const p = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
    return p.state as GeoPermissionState
  } catch {
    return 'unknown'
  }
}

export type GeoError = 'denied' | 'unavailable' | 'timeout' | 'unsupported'

const CACHE_KEY = 'pz_last_pos'

export function getCachedPosition(maxAgeMs = 5 * 60_000): LatLng | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { lat, lng, ts } = JSON.parse(raw) as LatLng & { ts: number }
    if (Date.now() - ts > maxAgeMs) return null
    return { lat, lng }
  } catch {
    return null
  }
}

/** Standort holen; wirft einen GeoError-String, damit die UI klar reagieren kann */
export function requestPosition(opts: PositionOptions = {}): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { reject('unsupported' as GeoError); return }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ...p, ts: Date.now() })) } catch { /* egal */ }
        resolve(p)
      },
      err => {
        if (err.code === err.PERMISSION_DENIED) reject('denied' as GeoError)
        else if (err.code === err.TIMEOUT) reject('timeout' as GeoError)
        else reject('unavailable' as GeoError)
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000, ...opts },
    )
  })
}

export type WithDistance<T> = T & { distanceKm?: number }

/** Distanz anhaengen (nur Eintraege mit Koordinaten bekommen einen Wert) */
export function attachDistance<T extends { latitude?: number | null; longitude?: number | null }>(
  list: T[], pos: LatLng | null,
): WithDistance<T>[] {
  if (!pos) return list
  return list.map(r => (
    r.latitude != null && r.longitude != null
      ? { ...r, distanceKm: haversineKm(pos.lat, pos.lng, Number(r.latitude), Number(r.longitude)) }
      : { ...r }
  ))
}
