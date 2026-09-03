export type Lang = 'de' | 'pt' | 'en'

export const translations = {
  de: {
    nav: {
      features: 'Features',
      howItWorks: 'Wie es funktioniert',
      pricing: 'Preise',
      cta: 'Kostenlos starten',
    },
    hero: {
      badge: '🏆 Die Loyalty-Plattform für Gastronomie',
      h1: 'Deine Gäste werden dein',
      h1accent: 'bestes Marketing',
      p: 'Social-Media Loyalty, digitale Stempelkarten & Gäste-CRM in einer Plattform. Null Aufwand, maximale Reichweite durch echte Gäste.',
      ctaPrimary: '🚀 Kostenlos starten',
      ctaSecondary: 'Demo ansehen',
      social: 'Gebaut für Restaurants, Bars, Cafés und Biergärten',
    },
    phone: {
      verified: 'Reel verifiziert',
      pointsEarned: 'Punkte verdient',
      dealUnlocked: 'Deal freigeschaltet!',
      dealSub: 'Gratis Snack deiner Wahl',
      stampCard: 'Stempelkarte',
      stampHint: '2 bis zum Gratis-Cocktail',
      badge1: '🔥 +2.4k Reichweite',
      badge2: '🎁 Gratis-Cocktail',
      badge3: '📸 Story verifiziert',
    },
    footer: {
      features: 'Features',
      howItWorks: 'Wie es funktioniert',
      pricing: 'Preise',
      privacy: 'Datenschutz',
      imprint: 'Impressum',
    },
  },

  pt: {
    nav: {
      features: 'Recursos',
      howItWorks: 'Como funciona',
      pricing: 'Preços',
      cta: 'Começar grátis',
    },
    hero: {
      badge: '🏆 A plataforma de fidelidade para gastronomia',
      h1: 'Seus clientes se tornam seu',
      h1accent: 'melhor marketing',
      p: 'Social Loyalty, cartões de fidelidade digitais e CRM de clientes em uma plataforma. Zero esforço, máximo alcance por clientes reais.',
      ctaPrimary: '🚀 Começar grátis',
      ctaSecondary: 'Ver demo',
      social: 'Feito para restaurantes, bares, cafés e biergartens',
    },
    phone: {
      verified: 'Reel verificado',
      pointsEarned: 'Pontos ganhos',
      dealUnlocked: 'Oferta desbloqueada!',
      dealSub: 'Snack grátis à sua escolha',
      stampCard: 'Cartão de fidelidade',
      stampHint: '2 para o Coquetel Grátis',
      badge1: '🔥 +2.4k de alcance',
      badge2: '🎁 Coquetel Grátis',
      badge3: '📸 Story verificado',
    },
    footer: {
      features: 'Recursos',
      howItWorks: 'Como funciona',
      pricing: 'Preços',
      privacy: 'Privacidade',
      imprint: 'Aviso legal',
    },
  },

  en: {
    nav: {
      features: 'Features',
      howItWorks: 'How it works',
      pricing: 'Pricing',
      cta: 'Start for free',
    },
    hero: {
      badge: '🏆 The loyalty platform for hospitality',
      h1: 'Your guests become your',
      h1accent: 'best marketing',
      p: 'Social Media Loyalty, digital loyalty cards and guest CRM in one platform. Zero effort, maximum reach through real guests.',
      ctaPrimary: '🚀 Start for free',
      ctaSecondary: 'See demo',
      social: 'Built for restaurants, bars, cafés and beer gardens',
    },
    phone: {
      verified: 'Reel verified',
      pointsEarned: 'Points earned',
      dealUnlocked: 'Deal unlocked!',
      dealSub: 'Free snack of your choice',
      stampCard: 'Loyalty card',
      stampHint: '2 until free Cocktail',
      badge1: '🔥 +2.4k reach',
      badge2: '🎁 Free Cocktail',
      badge3: '📸 Story verified',
    },
    footer: {
      features: 'Features',
      howItWorks: 'How it works',
      pricing: 'Pricing',
      privacy: 'Privacy',
      imprint: 'Imprint',
    },
  },
} satisfies Record<Lang, unknown>

export type Translations = typeof translations.de
