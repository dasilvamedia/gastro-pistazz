// Welche Restaurant-Spalten duerfen ueber welche Route geschrieben werden.
// Owner (/api/dashboard/restaurant) und Admin (/api/admin/restaurants/[id])
// teilen sich diese Listen, damit sie nicht auseinanderlaufen.

// Spalten, die immer existieren
export const RESTAURANT_ALLOWED_CORE = [
  'name', 'type', 'description', 'address', 'zip', 'city',
  'phone', 'email', 'website', 'instagram_handle', 'google_place_id',
  'points_per_story', 'points_per_reel', 'points_per_post',
  'points_per_google_review', 'points_per_receipt',
  'opening_hours',
  'logo_url', 'cover_url', 'primary_color',
  'stamp_card_enabled', 'stamp_card_total', 'stamp_card_reward',
] as const

// Spalten aus spaeteren Migrationen (graceful retry, falls noch nicht migriert)
export const RESTAURANT_ALLOWED_OPTIONAL = [
  'google_rating', 'google_review_count', 'opening_hours_note', 'cuisine', 'dietary',
] as const

// Nur der Super-Admin darf diese setzen
export const RESTAURANT_ADMIN_ONLY = [
  'slug', 'latitude', 'longitude', 'is_active', 'is_verified', 'is_featured', 'owner_id',
] as const

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
