import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Instagram-Webhook (Meta-App "gastro pistazz.io", App-ID 1100803475748097).
// Empfaengt story_mentions in Echtzeit: Sobald jemand @gastropistazz in einer
// Story erwaehnt, meldet Meta Username + Story-Bild. Damit vergeben wir Punkte
// automatisch, ohne Link-Eingabe und ohne Screenshot.
const VERIFY_TOKEN = 'pistazz-webhook-2026-zx91'

// Meta-Verifizierung des Endpunkts (einmalig beim Speichern der Callback-URL)
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  if (sp.get('hub.mode') === 'subscribe' && sp.get('hub.verify_token') === VERIFY_TOKEN) {
    return new NextResponse(sp.get('hub.challenge') ?? '', { status: 200 })
  }
  return NextResponse.json({ error: 'verification failed' }, { status: 403 })
}

type StoryMention = {
  senderIgId: string
  cdnUrl: string | null
  timestamp: number
}

function extractStoryMentions(body: unknown): StoryMention[] {
  const out: StoryMention[] = []
  const entries = (body as { entry?: unknown[] })?.entry ?? []
  for (const entry of entries as Array<Record<string, unknown>>) {
    const messagings = (entry.messaging ?? entry.standby ?? []) as Array<Record<string, unknown>>
    for (const m of messagings) {
      const sender = (m.sender as { id?: string })?.id
      const message = m.message as { attachments?: Array<{ type?: string; payload?: { url?: string } }> } | undefined
      for (const att of message?.attachments ?? []) {
        if (att.type === 'story_mention') {
          out.push({
            senderIgId: sender ?? 'unknown',
            cdnUrl: att.payload?.url ?? null,
            timestamp: Number(m.timestamp ?? Date.now()),
          })
        }
      }
    }
  }
  return out
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const admin = createAdminClient()

    const mentions = extractStoryMentions(body)

    // Jede Erwaehnung protokollieren; die Punkte-Zuordnung folgt, sobald das
    // Instagram-Konto verbunden ist und wir IG-IDs zu Nutzern aufloesen koennen.
    for (const mention of mentions) {
      await admin.from('instagram_mentions').insert({
        sender_ig_id: mention.senderIgId,
        media_url: mention.cdnUrl,
        mentioned_at: new Date(mention.timestamp).toISOString(),
        raw_payload: body,
        status: 'received',
      })
    }

    if (mentions.length === 0) {
      // Unbekannte Ereignisse ebenfalls festhalten (Debugging der Feld-Abos)
      await admin.from('instagram_mentions').insert({
        sender_ig_id: 'event',
        media_url: null,
        mentioned_at: new Date().toISOString(),
        raw_payload: body,
        status: 'other_event',
      })
    }

    // Meta erwartet immer 200, sonst wird der Webhook pausiert
    return NextResponse.json({ received: true })
  } catch {
    return NextResponse.json({ received: true })
  }
}
