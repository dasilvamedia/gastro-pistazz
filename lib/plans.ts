// Einzige Wahrheit fuer Pakete, Preise, Feature-Listen und Limits.
// Landing, Dashboard, Admin und API lesen ausschliesslich hier.
export type PlanKey = 'professional' | 'premium' | 'enterprise'
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled'

export const PLAN_ORDER: PlanKey[] = ['professional', 'premium', 'enterprise']
export const DEFAULT_PLAN: PlanKey = 'professional'
export const TRIAL_DAYS = 30

export interface Plan {
  key: PlanKey
  name: string
  subtitle: string
  /** Ein Satz fuer die Landing-Karte */
  tagline: string
  target: string
  /** Erste Zeile der Feature-Liste, z.B. "Alles aus Professional, plus:" */
  includes?: string
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
  professional: {
    key: 'professional',
    name: 'Professional',
    subtitle: 'Der Einstieg',
    tagline: 'Alles, was du brauchst, damit Gaeste dich posten und wiederkommen.',
    target: 'Cafes, Bars, Restaurants',
    price_monthly: 49,
    setup_fee: 849,
    features: [
      'Instagram Story, Reel und Post: Punkte fuer jeden Beitrag ueber dich',
      'Google-Bewertungs-Booster mit Punkten',
      'Kassenbon-Upload mit KI-Betrugspruefung',
      'Bis zu 5 aktive Deals und Belohnungen',
      '3 QR-Codes fuer Tisch, Theke und Eingang',
      'Sichtbar in der Pistazz App: Karte, Umkreissuche, Favoriten',
      'Dashboard mit Kunden-CRM bis 1.000 Gaeste',
      'Basis-Statistiken: Stories, Punkte, Einloesungen',
      'Onboarding-Session (60 Min) und QR-Druck-Starterpaket',
      'E-Mail-Support',
    ],
    color: '#6B7280',
    bg: '#F3F4F6',
    cardBg: '#FFFFFF',
    textColor: '#1C1F1A',
  },
  premium: {
    key: 'premium',
    name: 'Premium',
    subtitle: 'Unser Bestseller',
    tagline: 'Fuer Haeuser, die aus jedem Gast einen Stammgast machen wollen.',
    target: 'Restaurants, Bars, Bistros',
    includes: 'Alles aus Professional, plus:',
    price_monthly: 109,
    setup_fee: 1500,
    features: [
      'Unbegrenzte Deals und QR-Codes',
      'NFC-Stempelkarte: ein Tap statt Scan, inkl. 10 NFC-Tags',
      'Analytics: Reichweite, Top-Gaeste, Stosszeiten, Umsatz-Schaetzung',
      'Kunden-CRM ohne Limit plus Gaeste-Nachrichten nach Segmenten',
      'Push-Benachrichtigungen an deine Gaeste',
      'Automatische Instagram-Erkennung ohne Upload',
      'Featured-Platzierung in der App',
      'Druckpaket: 200 Flyer, 2 A2-Plakate, Tischaufsteller',
      'Team-Schulung und 30 Tage Intensiv-Begleitung',
      'Priority-Support per WhatsApp',
    ],
    bestseller: true,
    color: '#1D4ED8',
    bg: '#EFF6FF',
    cardBg: '#5B8A3C',
    textColor: '#FFFFFF',
  },
  enterprise: {
    key: 'enterprise',
    name: 'Enterprise',
    subtitle: 'Fuer Marktfuehrer',
    tagline: 'Mehrere Standorte, eigenes Branding, direkte Anbindung.',
    target: 'Ketten, Hotels, Fine Dining',
    includes: 'Alles aus Premium, plus:',
    price_monthly: 169,
    setup_fee: 2349,
    features: [
      'Multi-Standort: alle Haeuser in einem Dashboard',
      'White-Label: App-Ansicht und Gaeste-Seite in deinem Branding',
      'API-Zugang und Integrationen (Kasse, Reservierung, CRM)',
      'Unbegrenzte Gaeste, Deals, QR-Codes und NFC-Tags',
      'Persoenlicher Account-Manager und monatlicher Performance-Call',
      'Individuelles Onboarding vor Ort',
      'Quartals-Workshop: Kampagnenplanung mit unserem Team',
      'Bevorzugter Zugang zu neuen Features',
      '24/7 Priority-Support mit Reaktionszeit-Garantie',
    ],
    color: '#7C3AED',
    bg: '#F5F3FF',
    cardBg: '#1C1F1A',
    textColor: '#FFFFFF',
  },
}

export interface PlanLimits {
  max_qr_codes: number | null     // null = unbegrenzt
  max_active_deals: number | null
  /** Nur Marketing-Angabe, wird nicht technisch durchgesetzt */
  max_guests: number | null
  has_analytics: boolean
  has_stempelkarte: boolean
  has_messaging: boolean
}

export type BooleanLimitKey = 'has_analytics' | 'has_stempelkarte' | 'has_messaging'

export const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
  professional: {
    max_qr_codes: 3,
    max_active_deals: 5,
    max_guests: 1000,
    has_analytics: false,
    has_stempelkarte: false,
    has_messaging: false,
  },
  premium: {
    max_qr_codes: null,
    max_active_deals: null,
    max_guests: null,
    has_analytics: true,
    has_stempelkarte: true,
    has_messaging: true,
  },
  enterprise: {
    max_qr_codes: null,
    max_active_deals: null,
    max_guests: null,
    has_analytics: true,
    has_stempelkarte: true,
    has_messaging: true,
  },
}

/** Erstes Paket (in Reihenfolge), das das Feature enthaelt */
export function minPlanFor(feature: BooleanLimitKey): PlanKey {
  return PLAN_ORDER.find(k => PLAN_LIMITS[k][feature]) ?? 'enterprise'
}

/** "€ 1.500" im Landing-Stil, ohne Nachkommastellen */
export function formatEuro(n: number): string {
  return `€ ${n.toLocaleString('de-DE', { maximumFractionDigits: 0 })}`
}

export function isPlanKey(v: unknown): v is PlanKey {
  return typeof v === 'string' && (PLAN_ORDER as string[]).includes(v)
}

export const STATUS_LABEL: Record<SubscriptionStatus, { label: string; color: string; bg: string; emoji: string }> = {
  trial:     { label: 'Testphase',  color: '#3D7A22', bg: '#EEF5E6', emoji: '🧪' },
  active:    { label: 'Aktiv',      color: '#065F46', bg: '#D1FAE5', emoji: '✅' },
  expired:   { label: 'Abgelaufen', color: '#991B1B', bg: '#FEE2E2', emoji: '🔴' },
  cancelled: { label: 'Gekuendigt', color: '#6B7280', bg: '#F3F4F6', emoji: '⛔' },
}
