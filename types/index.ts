export type UserRole = 'guest' | 'restaurant_owner' | 'admin'
export type UserTier = 'bronze' | 'silber' | 'gold' | 'platin'
export type RestaurantType = 'restaurant' | 'bar' | 'bistro' | 'cafe' | 'imbiss' | 'food_truck' | 'hotel' | 'fine_dining' | 'biergarten' | 'eisdiele'
export type DealTrigger = 'instagram_story' | 'instagram_reel' | 'instagram_post' | 'google_review' | 'receipt_upload' | 'stamp_card' | 'custom'
export type DealStatus = 'active' | 'paused' | 'expired' | 'draft'
export type RewardType = 'discount_percent' | 'discount_fixed' | 'free_item' | 'bogo' | 'custom'
export type RedemptionStatus = 'pending' | 'confirmed' | 'used' | 'expired' | 'cancelled'
export type SubmissionType = 'instagram_story' | 'instagram_reel' | 'instagram_post' | 'google_review' | 'receipt'
export type SubmissionStatus = 'pending' | 'approved' | 'rejected'
export type TransactionType = 'earned' | 'spent' | 'bonus' | 'expired' | 'refund'
export type NotificationChannel = 'push' | 'email' | 'whatsapp' | 'in_app'
export type VisitSource = 'qr_scan' | 'story' | 'receipt' | 'manual'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  tier: UserTier
  total_points: number
  available_points: number
  total_visits: number
  total_stories: number
  instagram_handle: string | null
  instagram_connected: boolean
  phone: string | null
  city: string | null
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface Restaurant {
  id: string
  owner_id: string
  name: string
  slug: string
  type: RestaurantType
  description: string | null
  logo_url: string | null
  cover_url: string | null
  address: string | null
  city: string | null
  zip: string | null
  latitude: number | null
  longitude: number | null
  phone: string | null
  email: string | null
  website: string | null
  instagram_handle: string | null
  google_place_id: string | null
  google_rating: number | null
  google_review_count: number | null
  opening_hours: OpeningHours
  opening_hours_note: string | null
  points_per_story: number
  points_per_reel: number
  points_per_google_review: number
  points_per_receipt: number
  points_per_post: number
  stamp_card_enabled: boolean
  stamp_card_total: number
  stamp_card_reward: string | null
  primary_color: string
  is_active: boolean
  is_verified: boolean
  is_featured: boolean
  total_stories: number
  total_reach: number
  total_customers: number
  avg_rating: number
  created_at: string
  updated_at: string
}

export interface OpeningHours {
  [key: string]: { open: string; close: string; closed?: boolean } | undefined
}

export interface Deal {
  id: string
  restaurant_id: string
  restaurant?: Restaurant
  title: string
  description: string | null
  trigger: DealTrigger
  status: DealStatus
  reward_type: RewardType
  reward_value: string | null
  points_required: number
  min_order_value: number | null
  max_redemptions: number | null
  max_per_user: number
  valid_from: string | null
  valid_until: string | null
  valid_days: number[]
  valid_hours_start: string | null
  valid_hours_end: string | null
  total_redemptions: number
  total_reach: number
  sort_order: number
  image_url: string | null
  badge_text: string | null
  badge_color: string
  created_at: string
  updated_at: string
}

export interface DealRedemption {
  id: string
  deal_id: string
  deal?: Deal
  user_id: string
  restaurant_id: string
  status: RedemptionStatus
  points_spent: number
  redeemed_at: string
  used_at: string | null
  expires_at: string | null
  redemption_code: string
}

export interface StorySubmission {
  id: string
  user_id: string
  user?: Profile
  restaurant_id: string
  restaurant?: Restaurant
  type: SubmissionType
  status: SubmissionStatus
  media_url: string | null
  thumbnail_url: string | null
  instagram_media_id: string | null
  instagram_permalink: string | null
  caption: string | null
  verified_at: string | null
  verified_by: string | null
  rejection_reason: string | null
  reach: number
  impressions: number
  likes: number
  points_awarded: number
  created_at: string
  updated_at: string
}

export interface PointsTransaction {
  id: string
  user_id: string
  restaurant_id: string | null
  restaurant?: Restaurant
  type: TransactionType
  amount: number
  balance_after: number
  reference_type: string | null
  reference_id: string | null
  description: string | null
  created_at: string
}

export interface StampCard {
  id: string
  user_id: string
  restaurant_id: string
  restaurant?: Restaurant
  current_stamps: number
  total_stamps_required: number
  is_completed: boolean
  completed_at: string | null
  reward_redeemed: boolean
  created_at: string
  updated_at: string
}

export interface Visit {
  id: string
  user_id: string
  restaurant_id: string
  restaurant?: Restaurant
  visited_at: string
  source: VisitSource
  receipt_url: string | null
}

export interface Notification {
  id: string
  user_id: string
  restaurant_id: string | null
  channel: NotificationChannel
  title: string
  body: string | null
  image_url: string | null
  action_url: string | null
  is_read: boolean
  read_at: string | null
  created_at: string
}

export interface QRCode {
  id: string
  restaurant_id: string
  code: string
  label: string | null
  target_url: string | null
  scan_count: number
  is_active: boolean
  created_at: string
}

// UI helpers
export const TIER_CONFIG: Record<UserTier, { label: string; color: string; minPoints: number; maxPoints: number }> = {
  bronze: { label: 'Bronze', color: '#CD7F32', minPoints: 0, maxPoints: 1499 },
  silber: { label: 'Silber', color: '#9CA3AF', minPoints: 1500, maxPoints: 4999 },
  gold: { label: 'Gold', color: '#E5B84C', minPoints: 5000, maxPoints: 9999 },
  platin: { label: 'Platin', color: '#E2E8F0', minPoints: 10000, maxPoints: Infinity },
}

export const TRIGGER_CONFIG: Record<DealTrigger, { label: string; emoji: string; points: string }> = {
  instagram_story: { label: 'Instagram Story', emoji: '📸', points: '500' },
  instagram_reel: { label: 'Instagram Reel', emoji: '🎬', points: '750' },
  instagram_post: { label: 'Instagram Post', emoji: '📱', points: '400' },
  google_review: { label: 'Google Bewertung', emoji: '⭐', points: '300' },
  receipt_upload: { label: 'Beleg hochladen', emoji: '🧾', points: '100' },
  stamp_card: { label: 'Stempelkarte', emoji: '🃏', points: 'variabel' },
  custom: { label: 'Individuell', emoji: '🎯', points: 'variabel' },
}

export const RESTAURANT_TYPE_LABELS: Record<RestaurantType, string> = {
  restaurant: 'Restaurant',
  bar: 'Bar',
  bistro: 'Bistro',
  cafe: 'Café',
  imbiss: 'Imbiss',
  food_truck: 'Food Truck',
  hotel: 'Hotel',
  fine_dining: 'Fine Dining',
  biergarten: 'Biergarten',
  eisdiele: 'Eisdiele',
}
