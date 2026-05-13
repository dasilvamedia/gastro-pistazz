export type PlanKey = 'starter' | 'professional' | 'enterprise'
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled'

export interface Plan {
  key: PlanKey
  name: string
  subtitle: string
  target: string
  price_monthly: number
  setup_fee: number
  features: string[]
  bestseller?: boolean
  color: string
  bg: string
  cardBg: string
  textColor: string
}

export const PLANS: Record<PlanKey, Plan> = {
  starter: {
    key: 'starter',
    name: 'Starter',
    subtitle: 'Für den Einstieg',
    target: 'Cafés · Eisdielen · Biergärten',
    price_monthly: 79,
    setup_fee: 1200,
    features: [
      '1 QR-Code',
      'Bis zu 3 aktive Deals',
      'KI-Story-Verifizierung',
      'Basis-Dashboard',
      'Bis zu 200 Gäste',
      'E-Mail-Support',
    ],
    color: '#6B7280',
    bg: '#F3F4F6',
    cardBg: '#FFFFFF',
    textColor: '#1C1F1A',
  },
  professional: {
    key: 'professional',
    name: 'Professional',
    subtitle: 'Unser Bestseller',
    target: 'Restaurants · Bars · Bistros',
    price_monthly: 129,
    setup_fee: 1899,
    features: [
      'Unbegrenzte QR-Codes',
      'Unbegrenzte Deals',
      'KI-Story-Prüfung',
      'Kundendatenbank & CRM',
      'Analytics Dashboard',
      'Digitale Stempelkarten',
      'Google-Bewertungs-Booster',
      'Bis zu 1.000 Gäste',
      'Priority Support',
    ],
    bestseller: true,
    color: '#1D4ED8',
    bg: '#EFF6FF',
    cardBg: '#5B8A3C',
    textColor: '#FFFFFF',
  },
  enterprise: {
    key: 'enterprise',
    name: 'Premium',
    subtitle: 'Für Marktführer',
    target: 'Ketten · Hotels · Fine Dining',
    price_monthly: 179,
    setup_fee: 3999,
    features: [
      'Unbegrenzte QR-Codes',
      'Unbegrenzte Deals',
      'KI-Story-Prüfung',
      'Kundendatenbank & CRM',
      'Analytics Dashboard',
      'Digitale Stempelkarten',
      'Google-Bewertungs-Booster',
      'Unbegrenzte Gäste',
      'Priority Support',
      'Multi-Standort-Support',
      'Custom Integrationen',
      'Monatlicher Performance-Report',
      'Persönlicher Ansprechpartner',
      'Individuelles Onboarding',
    ],
    color: '#7C3AED',
    bg: '#F5F3FF',
    cardBg: '#1C1F1A',
    textColor: '#FFFFFF',
  },
}

export interface PlanLimits {
  max_qr_codes: number | null     // null = unlimited
  max_active_deals: number | null
  max_guests: number | null
  has_analytics: boolean
  has_stempelkarte: boolean
}

export const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
  starter: {
    max_qr_codes: 1,
    max_active_deals: 3,
    max_guests: 200,
    has_analytics: false,
    has_stempelkarte: false,
  },
  professional: {
    max_qr_codes: null,
    max_active_deals: null,
    max_guests: 1000,
    has_analytics: true,
    has_stempelkarte: true,
  },
  enterprise: {
    max_qr_codes: null,
    max_active_deals: null,
    max_guests: null,
    has_analytics: true,
    has_stempelkarte: true,
  },
}

export const STATUS_LABEL: Record<SubscriptionStatus, { label: string; color: string; bg: string; emoji: string }> = {
  trial:     { label: 'Testphase',  color: '#3D7A22', bg: '#EEF5E6', emoji: '🧪' },
  active:    { label: 'Aktiv',      color: '#065F46', bg: '#D1FAE5', emoji: '✅' },
  expired:   { label: 'Abgelaufen', color: '#991B1B', bg: '#FEE2E2', emoji: '🔴' },
  cancelled: { label: 'Gekündigt',  color: '#6B7280', bg: '#F3F4F6', emoji: '⛔' },
}
