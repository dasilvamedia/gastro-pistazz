/**
 * Industry configuration.
 *
 * The loyalty mechanic (scan QR → post → earn points → claim reward) is not
 * specific to restaurants. Every entry here re-paints and re-words the landing
 * page for one niche. Adding a niche means adding an entry — nothing else.
 *
 * `theme` is written straight into the --ind-* custom properties declared in
 * app/globals.css, so switching industry recolours the whole page. Copy is
 * per language because the landing page ships de/pt/en.
 */

import type { Lang } from './translations'

export type IndustryTheme = {
  primary: string
  primaryDark: string
  primaryDeep: string
  primaryLight: string
  primaryPale: string
  accent: string
  surface: string
  surfaceSoft: string
  surfaceEdge: string
}

export type IndustryCopy = {
  /** Switcher tab label */
  label: string
  /** Hero headline, line 2 is painted in the industry colour */
  heroLine1: string
  heroLine2: string
  heroSub: string
  /** "Built for X, Y and Z" */
  heroNote: string
  /** Body of the third how-it-works step ("claim your reward") */
  stepReward: string
  /** Concrete reward examples — the most persuasive part per niche */
  rewards: [string, string, string, string]
}

export type Industry = {
  slug: string
  emoji: string
  /** Begriffs-Ersetzungen: passt alle Landing-Texte automatisch an die Branche an */
  vocab?: Record<string, string>
  /** German meta, used by the per-industry SEO routes */
  metaTitle: string
  metaDescription: string
  theme: IndustryTheme
  copy: Record<Lang, IndustryCopy>
}

export const INDUSTRIES: Industry[] = [
  {
    slug: 'gastro',
    emoji: '🍽️',
    metaTitle: 'Gastro - Mehr Stammgäste durch Social-Media-Loyalty',
    metaDescription:
      'Digitale Stempelkarten und Social-Media-Loyalty für Restaurants, Bars und Cafés. Gäste posten, sammeln Punkte und kommen wieder.',
    theme: {
      primary: '#8BB06A',
      primaryDark: '#6D9450',
      primaryDeep: '#577A3D',
      primaryLight: '#D4E8C2',
      primaryPale: '#EEF5E6',
      accent: '#E5B84C',
      surface: '#F8FAF5',
      surfaceSoft: '#F0F5EB',
      surfaceEdge: '#E2EDD6',
    },
    copy: {
      de: {
        label: 'Gastro',
        heroLine1: 'Deine Gäste werden dein',
        heroLine2: 'bestes Marketing',
        heroSub:
          'Social-Media-Loyalty, digitale Stempelkarten und Gäste-CRM in einer Plattform. Null Aufwand, maximale Reichweite durch echte Gäste.',
        heroNote: 'Gebaut für Restaurants, Bars, Cafés und Biergärten',
        stepReward:
          'Gratis-Cocktail, Snack-Upgrade, Rabatt oder Gewinnspiel. Der Gast wählt, du bindest.',
        rewards: ['Gratis-Cocktail', 'Snack-Upgrade', 'Dessert aufs Haus', 'Happy-Hour-Bonus'],
      },
      pt: {
        label: 'Gastronomia',
        heroLine1: 'Seus clientes se tornam seu',
        heroLine2: 'melhor marketing',
        heroSub:
          'Fidelidade social, cartões de carimbo digitais e CRM de clientes em uma plataforma. Zero esforço, alcance máximo por clientes reais.',
        heroNote: 'Feito para restaurantes, bares, cafés e biergartens',
        stepReward:
          'Drink grátis, upgrade de petisco, desconto ou sorteio. O cliente escolhe, você fideliza.',
        rewards: ['Drink grátis', 'Upgrade de petisco', 'Sobremesa cortesia', 'Bônus happy hour'],
      },
      en: {
        label: 'Hospitality',
        heroLine1: 'Your guests become your',
        heroLine2: 'best marketing',
        heroSub:
          'Social loyalty, digital stamp cards and guest CRM in one platform. Zero effort, maximum reach through real guests.',
        heroNote: 'Built for restaurants, bars, cafés and beer gardens',
        stepReward:
          'Free cocktail, snack upgrade, discount or prize draw. Your guest picks, you build loyalty.',
        rewards: ['Free cocktail', 'Snack upgrade', 'Dessert on the house', 'Happy-hour bonus'],
      },
    },
  },

  {
    slug: 'barbershop',
    vocab: {
      "Stammgästen": "Stammkunden",
      "Stammgäste": "Stammkunden",
      "Gästen": "Kunden",
      "Gäste": "Kunden",
      "Gast": "Kunde",
      "Restaurants": "Barbershops",
      "Restaurant": "Barbershop",
      "Betriebe": "Shops",
      "Gastro-Betriebe": "Barbershops",
      "Speisekarte": "Preisliste",
      "Gastronomie": "Barber-Welt"
    },
    emoji: '💈',
    metaTitle: 'Barbershop & Friseur - Digitale Stempelkarte statt Papierkarte',
    metaDescription:
      'Die digitale Stempelkarte für Barbershops und Friseure. Jeder Schnitt zählt, jeder Post bringt neue Kunden.',
    theme: {
      primary: '#B08A5A',
      primaryDark: '#8F6E43',
      primaryDeep: '#6B5231',
      primaryLight: '#E8D6BC',
      primaryPale: '#F6F0E7',
      accent: '#2E3440',
      surface: '#FAF7F2',
      surfaceSoft: '#F3EDE3',
      surfaceEdge: '#E5D9C7',
    },
    copy: {
      de: {
        label: 'Barbershop',
        heroLine1: 'Jeder Schnitt zählt.',
        heroLine2: 'Jeder Post bringt Kunden.',
        heroSub:
          'Digitale Stempelkarte statt Pappkarte im Portemonnaie. Deine Kunden posten ihren frischen Cut und holen dir die nächsten rein.',
        heroNote: 'Gebaut für Barbershops, Friseure und Herrensalons',
        stepReward:
          'Der 10. Schnitt gratis, Bart-Upgrade oder Pflegeprodukt. Der Klassiker, nur ohne verlorene Pappkarte.',
        rewards: ['10. Schnitt gratis', 'Bart-Upgrade', 'Pflegeprodukt', 'Hot-Towel-Shave'],
      },
      pt: {
        label: 'Barbearia',
        heroLine1: 'Cada corte conta.',
        heroLine2: 'Cada post traz clientes.',
        heroSub:
          'Cartão de carimbo digital em vez de papel na carteira. Seus clientes postam o corte novo e trazem os próximos.',
        heroNote: 'Feito para barbearias, cabeleireiros e salões masculinos',
        stepReward:
          'O 10º corte grátis, upgrade de barba ou produto de cuidado. O clássico, sem cartão perdido.',
        rewards: ['10º corte grátis', 'Upgrade de barba', 'Produto de cuidado', 'Barbear com toalha'],
      },
      en: {
        label: 'Barbershop',
        heroLine1: 'Every cut counts.',
        heroLine2: 'Every post brings clients.',
        heroSub:
          'A digital stamp card instead of cardboard in a wallet. Your clients post their fresh cut and bring the next ones in.',
        heroNote: 'Built for barbershops, hairdressers and men’s salons',
        stepReward:
          'Every 10th cut free, a beard upgrade or a grooming product. The classic, minus the lost paper card.',
        rewards: ['10th cut free', 'Beard upgrade', 'Grooming product', 'Hot-towel shave'],
      },
    },
  },

  {
    slug: 'spa',
    vocab: {
      "Stammgästen": "Stammkunden",
      "Stammgäste": "Stammkunden",
      "Gästen": "Kunden",
      "Gäste": "Kunden",
      "Gast": "Kunde",
      "Restaurants": "Spas",
      "Restaurant": "Spa",
      "Betriebe": "Spas",
      "Speisekarte": "Anwendungsliste",
      "Gastronomie": "Wellness-Welt"
    },
    emoji: '💆',
    metaTitle: 'Spa & Wellness - Treueprogramm für Ruhe-Momente',
    metaDescription:
      'Loyalty für Spas, Saunen und Wellness-Studios. Gäste sammeln Punkte für jeden Besuch und teilen ihre Auszeit.',
    theme: {
      primary: '#7C9A88',
      primaryDark: '#5F7D6B',
      primaryDeep: '#455C4E',
      primaryLight: '#CFE0D5',
      primaryPale: '#EDF3EF',
      accent: '#C9A227',
      surface: '#F9FAF8',
      surfaceSoft: '#EFF4F0',
      surfaceEdge: '#DCE7E0',
    },
    copy: {
      de: {
        label: 'Spa & Wellness',
        heroLine1: 'Aus einer Auszeit wird',
        heroLine2: 'eine Gewohnheit.',
        heroSub:
          'Treuepunkte für jeden Besuch, geteilt in den Feeds deiner Gäste. Ruhig im Auftritt, wirksam im Ergebnis.',
        heroNote: 'Gebaut für Spas, Saunen, Massage- und Wellness-Studios',
        stepReward:
          'Gratis-Aufguss, verlängerte Massage oder Pflegeprodukt. Kleine Geste, große Bindung.',
        rewards: ['Gratis-Aufguss', 'Massage-Upgrade', '15 Minuten extra', 'Pflegeprodukt'],
      },
      pt: {
        label: 'Spa & Bem-estar',
        heroLine1: 'Uma pausa vira',
        heroLine2: 'um hábito.',
        heroSub:
          'Pontos de fidelidade a cada visita, compartilhados nos feeds dos seus clientes. Discreto na forma, eficaz no resultado.',
        heroNote: 'Feito para spas, saunas, massagem e estúdios de bem-estar',
        stepReward:
          'Sessão de sauna grátis, massagem estendida ou produto de cuidado. Gesto pequeno, vínculo grande.',
        rewards: ['Sauna grátis', 'Upgrade de massagem', '15 minutos extras', 'Produto de cuidado'],
      },
      en: {
        label: 'Spa & Wellness',
        heroLine1: 'A moment off turns into',
        heroLine2: 'a habit.',
        heroSub:
          'Loyalty points for every visit, shared across your guests’ feeds. Calm in tone, effective in result.',
        heroNote: 'Built for spas, saunas, massage and wellness studios',
        stepReward:
          'A free sauna session, an extended massage or a care product. Small gesture, strong bond.',
        rewards: ['Free sauna round', 'Massage upgrade', '15 extra minutes', 'Care product'],
      },
    },
  },

  {
    slug: 'fitness',
    vocab: {
      "Stammgästen": "Stammmitgliedern",
      "Stammgäste": "Stammmitglieder",
      "Gästen": "Mitgliedern",
      "Gäste": "Mitglieder",
      "Gast": "Mitglied",
      "Restaurants": "Studios",
      "Restaurant": "Studio",
      "Betriebe": "Studios",
      "Speisekarte": "Kursplan",
      "Gastronomie": "Fitness-Welt"
    },
    emoji: '💪',
    metaTitle: 'Fitness & Gym - Mitglieder halten statt neu werben',
    metaDescription:
      'Loyalty fürs Gym: Jedes Training zählt, jeder Post bringt Reichweite. Weniger Kündigungen, mehr Empfehlungen.',
    theme: {
      primary: '#3FBF8F',
      primaryDark: '#2E9C73',
      primaryDeep: '#1F7355',
      primaryLight: '#B9EBD8',
      primaryPale: '#E8F8F1',
      accent: '#1C1F1A',
      surface: '#F6FBF9',
      surfaceSoft: '#ECF7F2',
      surfaceEdge: '#D3EDE1',
    },
    copy: {
      de: {
        label: 'Fitness',
        heroLine1: 'Jedes Training zählt.',
        heroLine2: 'Jeder Post zieht mit.',
        heroSub:
          'Belohne Dranbleiben statt nur Neuabschlüsse. Deine Mitglieder posten ihren Fortschritt und werben nebenbei für dich.',
        heroNote: 'Gebaut für Gyms, Boxen, Yoga- und Functional-Studios',
        stepReward:
          'Personal-Training, Shake gratis oder ein Monat Rabatt. Belohnung genau dann, wenn die Motivation kippt.',
        rewards: ['Personal-Training', 'Shake gratis', 'Probemonat für Freunde', 'Merch-Shirt'],
      },
      pt: {
        label: 'Fitness',
        heroLine1: 'Cada treino conta.',
        heroLine2: 'Cada post ajuda.',
        heroSub:
          'Premie a constância, não só a matrícula. Seus alunos postam o progresso e divulgam você de quebra.',
        heroNote: 'Feito para academias, boxes, yoga e estúdios funcionais',
        stepReward:
          'Personal, shake grátis ou um mês com desconto. A recompensa chega quando a motivação cai.',
        rewards: ['Personal trainer', 'Shake grátis', 'Mês teste para amigos', 'Camiseta da casa'],
      },
      en: {
        label: 'Fitness',
        heroLine1: 'Every session counts.',
        heroLine2: 'Every post pulls its weight.',
        heroSub:
          'Reward showing up, not just signing up. Your members post their progress and market you along the way.',
        heroNote: 'Built for gyms, boxes, yoga and functional studios',
        stepReward:
          'A personal training session, a free shake or a discounted month. The reward lands exactly when motivation dips.',
        rewards: ['Personal training', 'Free shake', 'Trial month for friends', 'Branded shirt'],
      },
    },
  },

  {
    slug: 'beauty',
    vocab: {
      "Stammgästen": "Stammkunden",
      "Stammgäste": "Stammkunden",
      "Gästen": "Kundinnen",
      "Gäste": "Kundinnen",
      "Gast": "Kundin",
      "Restaurants": "Salons",
      "Restaurant": "Salon",
      "Betriebe": "Salons",
      "Speisekarte": "Preisliste",
      "Gastronomie": "Beauty-Welt"
    },
    emoji: '💅',
    metaTitle: 'Beauty & Nails - Jeder Termin wird zum Post',
    metaDescription:
      'Loyalty für Nagel- und Kosmetikstudios. Kundinnen und Kunden zeigen ihr Ergebnis, du gewinnst neue Termine.',
    theme: {
      primary: '#D98BA6',
      primaryDark: '#BC6C88',
      primaryDeep: '#8F4E67',
      primaryLight: '#F5D3DF',
      primaryPale: '#FBEEF3',
      accent: '#8B6BB0',
      surface: '#FDF9FB',
      surfaceSoft: '#F9EFF4',
      surfaceEdge: '#EFD9E3',
    },
    copy: {
      de: {
        label: 'Beauty & Nails',
        heroLine1: 'Dein Ergebnis ist',
        heroLine2: 'die beste Anzeige.',
        heroSub:
          'Nach jedem Termin entsteht ein Bild, das ohnehin geteilt wird. Belohne es und mach daraus deinen Terminkalender.',
        heroNote: 'Gebaut für Nagelstudios, Kosmetik und Beauty-Salons',
        stepReward:
          'Design-Upgrade, Gratis-Behandlung oder Rabatt auf den nächsten Termin.',
        rewards: ['Design-Upgrade', 'Gratis-Behandlung', 'Pflegeset', 'Rabatt für Freundinnen'],
      },
      pt: {
        label: 'Beleza & Unhas',
        heroLine1: 'Seu resultado é',
        heroLine2: 'o melhor anúncio.',
        heroSub:
          'Depois de cada atendimento nasce uma foto que já seria postada. Premie isso e transforme em agenda cheia.',
        heroNote: 'Feito para nail designers, estética e salões de beleza',
        stepReward:
          'Upgrade de design, procedimento grátis ou desconto no próximo horário.',
        rewards: ['Upgrade de design', 'Procedimento grátis', 'Kit de cuidados', 'Desconto para amigas'],
      },
      en: {
        label: 'Beauty & Nails',
        heroLine1: 'Your result is',
        heroLine2: 'the best advert.',
        heroSub:
          'Every appointment ends in a photo that gets shared anyway. Reward it and turn it into a full calendar.',
        heroNote: 'Built for nail bars, aesthetics and beauty salons',
        stepReward:
          'A design upgrade, a free treatment or a discount on the next appointment.',
        rewards: ['Design upgrade', 'Free treatment', 'Care kit', 'Discount for friends'],
      },
    },
  },

  {
    slug: 'tattoo',
    vocab: {
      "Stammgästen": "Stammkunden",
      "Stammgäste": "Stammkunden",
      "Gästen": "Kunden",
      "Gäste": "Kunden",
      "Gast": "Kunde",
      "Restaurants": "Studios",
      "Restaurant": "Studio",
      "Betriebe": "Studios",
      "Speisekarte": "Preisliste",
      "Gastronomie": "Tattoo-Szene"
    },
    emoji: '🖤',
    metaTitle: 'Tattoo & Piercing - Empfehlungen statt Stempelkarte',
    metaDescription:
      'Loyalty für Tattoo- und Piercing-Studios: Bei seltenen Besuchen zählt die Weiterempfehlung mehr als jede Stempelkarte.',
    theme: {
      primary: '#9AA3AD',
      primaryDark: '#6E7681',
      primaryDeep: '#464C54',
      primaryLight: '#D7DCE2',
      primaryPale: '#EFF1F4',
      accent: '#C8402F',
      surface: '#F8F9FA',
      surfaceSoft: '#EFF1F3',
      surfaceEdge: '#DDE1E6',
    },
    copy: {
      de: {
        label: 'Tattoo',
        heroLine1: 'Dein Kunde kommt einmal.',
        heroLine2: 'Sein Post bleibt.',
        heroSub:
          'Bei seltenen Terminen zieht keine Stempelkarte. Hier zählt die Weiterempfehlung, und genau die belohnst du.',
        heroNote: 'Gebaut für Tattoo-, Piercing- und Ink-Studios',
        stepReward:
          'Punkte fürs Mitbringen: Wer jemanden bringt, bekommt Rabatt aufs nächste Piece oder ein Aftercare-Set.',
        rewards: ['Rabatt aufs nächste Piece', 'Aftercare-Set', 'Gratis-Touch-up', 'Flash-Slot'],
      },
      pt: {
        label: 'Tatuagem',
        heroLine1: 'Seu cliente vem uma vez.',
        heroLine2: 'O post dele fica.',
        heroSub:
          'Com visitas raras, cartão de carimbo não funciona. Aqui vale a indicação, e é isso que você premia.',
        heroNote: 'Feito para estúdios de tatuagem, piercing e ink',
        stepReward:
          'Pontos por indicar: quem traz alguém ganha desconto na próxima peça ou um kit de cicatrização.',
        rewards: ['Desconto na próxima peça', 'Kit de cicatrização', 'Retoque grátis', 'Vaga de flash'],
      },
      en: {
        label: 'Tattoo',
        heroLine1: 'Your client comes once.',
        heroLine2: 'Their post stays.',
        heroSub:
          'With rare appointments a stamp card gets you nowhere. Here the referral is what counts, so reward exactly that.',
        heroNote: 'Built for tattoo, piercing and ink studios',
        stepReward:
          'Points for bringing someone: a referral earns a discount on the next piece or an aftercare kit.',
        rewards: ['Discount on next piece', 'Aftercare kit', 'Free touch-up', 'Flash slot'],
      },
    },
  },
]

export const DEFAULT_INDUSTRY = INDUSTRIES[0]

export function getIndustry(slug: string | undefined | null): Industry {
  if (!slug) return DEFAULT_INDUSTRY
  return INDUSTRIES.find((industry) => industry.slug === slug) ?? DEFAULT_INDUSTRY
}

/** Maps an industry theme onto the --ind-* custom properties. */
export function industryCssVars(industry: Industry): Record<string, string> {
  const { theme } = industry
  return {
    '--ind-primary': theme.primary,
    '--ind-primary-dark': theme.primaryDark,
    '--ind-primary-deep': theme.primaryDeep,
    '--ind-primary-light': theme.primaryLight,
    '--ind-primary-pale': theme.primaryPale,
    '--ind-accent': theme.accent,
    '--ind-surface': theme.surface,
    '--ind-surface-soft': theme.surfaceSoft,
    '--ind-surface-edge': theme.surfaceEdge,
  }
}
