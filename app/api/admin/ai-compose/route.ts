import { NextRequest, NextResponse } from 'next/server'
import { assertSuperAdmin } from '@/lib/adminAuth'

// KI-Ideen fuer Push-/Inbox-Nachrichten. Nutzt Anthropic, wenn ein Key gesetzt
// ist, sonst kuratierte Vorlagen. Antwort: { ideas: [{title, body}, ...] }.

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? ''
const MODEL = 'claude-opus-4-5'

type Idea = { title: string; body: string }

const AUDIENCE: Record<string, string> = {
  test: 'eine kurze Testnachricht an dich selbst zum Ausprobieren',
  alle: 'alle Gaeste der Pistazz-App (Endkunden, die in Restaurants Punkte sammeln)',
  stadt: 'Gaeste in einer bestimmten Stadt',
  restaurant: 'die Stammgaeste eines bestimmten Restaurants',
  inhaber: 'die Restaurant-Inhaber (B2B), die Pistazz fuer ihr Lokal nutzen',
}

const TEMPLATES: Record<string, Idea[]> = {
  test: [
    { title: 'Test 🚀', body: 'Das ist eine Testnachricht von Pistazz. Wenn du sie siehst, funktioniert Push einwandfrei.' },
    { title: 'Push läuft ✅', body: 'Kurzer Funktionstest: Push und In-App-Inbox sind aktiv. Alles bereit für echte Kampagnen.' },
    { title: 'Hallo von Pistazz 👋', body: 'Testnachricht erfolgreich zugestellt. Du kannst jetzt Nachrichten an echte Segmente senden.' },
  ],
  alle: [
    { title: 'Neue Deals warten auf dich 🍽️', body: 'In deiner Nähe gibt es frische Angebote. Öffne Pistazz, entdecke neue Restaurants und sammle Punkte für Gratis-Extras.' },
    { title: 'Punkte einlösen leicht gemacht 🎁', body: 'Du hast Punkte gesammelt? Jetzt ist der perfekte Moment, sie gegen leckere Belohnungen einzulösen. Schau in die App.' },
    { title: 'Teile deine Story, sammle Punkte 📸', body: 'Poste dein nächstes Restaurant-Erlebnis als Instagram-Story und verdiene sofort Punkte für exklusive Deals.' },
  ],
  stadt: [
    { title: 'Frische Deals in deiner Stadt 📍', body: 'Neue Partnerrestaurants sind da. Entdecke sie in Pistazz und sichere dir Punkte bei deinem nächsten Besuch.' },
    { title: 'Heute schon rausgegangen? 🌿', body: 'In deiner Stadt warten neue Angebote auf dich. Öffne die App, finde ein Lokal in der Nähe und sammle Punkte.' },
    { title: 'Dein Stadt-Guide für Genuss 🍴', body: 'Die besten Restaurants deiner Stadt an einem Ort. Besuchen, Story teilen, Belohnungen kassieren.' },
  ],
  restaurant: [
    { title: 'Wir haben etwas für dich 🎁', body: 'Als Stammgast bekommst du zuerst Bescheid: Es gibt ein neues Angebot. Komm vorbei und löse deine Punkte ein.' },
    { title: 'Schön, dich wiederzusehen 💚', body: 'Lange nicht da gewesen? Wir freuen uns auf deinen Besuch. In der App wartet ein frischer Deal auf dich.' },
    { title: 'Deine Treue lohnt sich ⭐', body: 'Danke, dass du so oft bei uns bist. Sammle weiter Punkte und sichere dir bald deine nächste Belohnung.' },
  ],
  inhaber: [
    { title: 'Neue Funktion in Pistazz 🚀', body: 'Ab sofort könnt ihr eure Gäste direkt per Push erreichen. Meldet euch im Dashboard an und probiert es aus.' },
    { title: 'Tipp für mehr Stammgäste 💡', body: 'Restaurants mit aktiven Stempelkarten sehen deutlich mehr Wiederbesuche. Aktiviert eure Karte im Dashboard.' },
    { title: 'Kurzes Update für euch 📊', body: 'Schaut in eure Analytics: Reichweite, Top-Gäste und Stoßzeiten helfen euch, die richtigen Aktionen zu planen.' },
  ],
}

function fallback(segment: string): Idea[] {
  return TEMPLATES[segment] ?? TEMPLATES.alle
}

export async function POST(request: NextRequest) {
  const auth = await assertSuperAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const segment: string = typeof body.segment === 'string' ? body.segment : 'alle'
  const restaurantName: string = (body.restaurantName ?? '').toString().slice(0, 80)
  const city: string = (body.city ?? '').toString().slice(0, 80)
  const topic: string = (body.topic ?? '').toString().slice(0, 200)

  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ ideas: fallback(segment), source: 'templates' })
  }

  const ctx = [
    `Zielgruppe: ${AUDIENCE[segment] ?? AUDIENCE.alle}.`,
    restaurantName ? `Restaurant: ${restaurantName}.` : '',
    city ? `Stadt: ${city}.` : '',
    topic ? `Anlass/Thema: ${topic}.` : '',
  ].filter(Boolean).join(' ')

  const prompt = `Du bist Marketing-Texter fuer Pistazz, eine Loyalty-App fuer Restaurants.
Schreibe 3 unterschiedliche Push-Nachrichten auf Deutsch. ${ctx}
Regeln: Titel maximal 80 Zeichen, Nachricht maximal 500 Zeichen, freundlich und motivierend, passend 1 bis 2 Emojis, echte deutsche Umlaute (ae/oe/ue sind verboten, nutze ä/ö/ü), keine Gedankenstriche.
Antworte NUR mit reinem JSON in genau diesem Format, ohne Erklaerung:
[{"title":"...","body":"..."},{"title":"...","body":"..."},{"title":"...","body":"..."}]`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) return NextResponse.json({ ideas: fallback(segment), source: 'templates' })
    const data = await res.json()
    const text: string = data?.content?.[0]?.text ?? ''
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return NextResponse.json({ ideas: fallback(segment), source: 'templates' })
    const parsed = JSON.parse(match[0]) as Idea[]
    const ideas = parsed
      .filter(i => i && typeof i.title === 'string' && typeof i.body === 'string')
      .map(i => ({ title: i.title.slice(0, 80), body: i.body.slice(0, 500) }))
      .slice(0, 3)
    if (ideas.length === 0) return NextResponse.json({ ideas: fallback(segment), source: 'templates' })
    return NextResponse.json({ ideas, source: 'ai' })
  } catch {
    return NextResponse.json({ ideas: fallback(segment), source: 'templates' })
  }
}
