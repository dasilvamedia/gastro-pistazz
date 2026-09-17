import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? ''
const MODEL = 'claude-opus-4-5'

type IgChecks = {
  url_user_match: boolean | null
  has_restaurant_tag?: boolean
  has_pistazz_tag?: boolean
  is_recent?: boolean
  oembed_verified?: boolean | null
  user_handle?: string | null
}

type AnalyzeResult = {
  verdict: string
  confidence: number
  notes: string
  ig_updates?: Partial<IgChecks>
  // Kassenbon-Befunde (nur Stories): gehoert der Bon zu DIESEM Restaurant
  // und ist er vom Einreichungstag? null = nicht lesbar/nicht pruefbar.
  receipt_matches_restaurant?: boolean | null
  receipt_is_today?: boolean | null
}

async function analyzeWithClaude(opts: {
  type: string
  permalink: string | null
  mediaUrl: string | null
  screenshotUrl: string | null
  receiptUrl?: string | null
  distanceM?: number | null
  caption: string | null
  restaurantName: string
  restaurantAddress: string | null
  restaurantHandle: string | null
  userHandle: string | null
  igChecks: IgChecks | null
  submittedAt?: string | null
  nfcConfirmed?: boolean
}): Promise<AnalyzeResult> {
  const { type, permalink, mediaUrl, screenshotUrl, receiptUrl, distanceM, caption, restaurantName, restaurantAddress, restaurantHandle, userHandle, igChecks, submittedAt, nfcConfirmed } = opts

  if (!ANTHROPIC_API_KEY) {
    return { verdict: 'pending', confidence: 0, notes: 'Kein API-Schlüssel konfiguriert, manuelle Prüfung erforderlich.' }
  }

  // Wenn URL-Username klar nicht übereinstimmt → sofort suspicious, kein Claude-Call nötig
  if (igChecks?.url_user_match === false) {
    return {
      verdict: 'suspicious',
      confidence: 90,
      notes: `Der Instagram-Handle in der URL (${igChecks.user_handle ?? '?'}) stimmt nicht mit dem registrierten Handle des Nutzers (@${userHandle ?? '?'}) überein.`,
    }
  }

  const contentBlocks: unknown[] = []
  let userMessage = ''

  if (type === 'receipt') {
    if (!mediaUrl) {
      return { verdict: 'rejected', confidence: 95, notes: 'Kein Beleg-Bild vorhanden.' }
    }
    contentBlocks.push({ type: 'image', source: { type: 'url', url: mediaUrl } })
    userMessage = `Analysiere diesen Kassenbon. Prüfe: 1) Ist das ein echter Kassenbon/Quittung? 2) Gibt es Hinweise auf das Restaurant "${restaurantName}"? 3) Sieht das Bild echt und unbearbeitet aus?
${caption ? `Beschreibung des Nutzers: "${caption}"` : ''}`

    const systemPrompt = `Du bist ein strenger KI-Qualitätsprüfer für ein Gastro-Marketing-Programm.
Deine Aufgabe: Prüfe, ob eine eingereichte Aktion echt und regelkonform ist.
Restaurant: "${restaurantName}"
Antwort immer als JSON: {"verdict":"approved"|"suspicious"|"rejected","confidence":0-100,"notes":"Kurze deutsche Begründung (max. 2 Sätze)"}
Sei streng: Lieber suspicious als approved wenn du unsicher bist.`

    contentBlocks.push({ type: 'text', text: userMessage })
    return callClaude(systemPrompt, contentBlocks)

  } else if (type === 'google_review') {
    userMessage = `Prüfe diesen Link für eine Google-Bewertung:
URL: ${permalink ?? '(kein Link)'}
Beschreibung: ${caption ?? '(keine)'}
Ist das ein valider Google Maps / Google Reviews Link? Enthält er Hinweise auf "${restaurantName}"?`

    const systemPrompt = `Du bist ein strenger KI-Qualitätsprüfer für ein Gastro-Marketing-Programm.
Restaurant: "${restaurantName}"
Antwort immer als JSON: {"verdict":"approved"|"suspicious"|"rejected","confidence":0-100,"notes":"Kurze deutsche Begründung (max. 2 Sätze)"}
Sei streng: Lieber suspicious als approved wenn du unsicher bist.`

    contentBlocks.push({ type: 'text', text: userMessage })
    return callClaude(systemPrompt, contentBlocks)

  } else if (['instagram_story', 'instagram_reel', 'instagram_post'].includes(type)) {

    // Mit Screenshot: Claude Vision analysiert den Screenshot
    if (screenshotUrl) {
      const handleInfo = restaurantHandle ? `@${restaurantHandle}` : restaurantName
      const submitTime = submittedAt ? new Date(submittedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : null
      const systemPrompt = `Du bist ein strenger Verifikations-Bot für ein Gastro-Marketing-Programm namens "Pistazz".
Restaurant: "${restaurantName}" | Instagram: ${handleInfo}
${userHandle ? `Nutzer-Handle: @${userHandle}` : ''}
${submitTime ? `Einreichungszeitpunkt: ${submitTime} Uhr (heute)` : ''}

Analysiere den Instagram-Screenshot GENAU. Antworte NUR als JSON ohne weiteren Text:
{
  "verdict": "approved"|"suspicious"|"rejected",
  "confidence": 0-100,
  "has_restaurant_tag": true|false,
  "has_pistazz_tag": true|false,
  "is_recent": true|false,
  "story_username": "<sichtbarer Username im Header oder null>",
  "visible_timestamp": "<sichtbarer Zeitstempel im Screenshot oder null>",
  "notes": "<Kurze deutsche Begründung, max. 2 Sätze>"
}

Regeln:
- has_restaurant_tag: true wenn ${handleInfo} oder der Restaurantname als @Mention, Location-Tag oder deutlich sichtbar im Bild ist
- has_pistazz_tag: true wenn "@gastro.pistazz.io" oder "gastro.pistazz.io" oder "pistazz" als @Mention, Sticker oder Text sichtbar ist
- is_recent: true wenn der Story-Timestamp < 24h zeigt (z.B. "Gerade", "2 Min", "1 Std"), NICHT bei Datum wie "15. Mai" oder "vor 3 Tagen"
- Kein Timestamp sichtbar → is_recent: false, verdict: "suspicious" (manuelle Prüfung)
- Timestamp sichtbar aber alt (> 24h) → verdict: "rejected"
- verdict "rejected": kein Restaurantbezug ODER kein echter Instagram-Screenshot ODER Story älter als 24h
- verdict "suspicious": Restaurantbezug unklar ODER @gastro.pistazz.io fehlt ODER kein Timestamp sichtbar ODER Username nicht lesbar
- verdict "approved": BEIDE Tags sichtbar (Restauranttag UND @gastro.pistazz.io) UND Timestamp zeigt < 24h
Sei streng: lieber suspicious als approved wenn du unsicher bist.`

      contentBlocks.push({ type: 'image', source: { type: 'url', url: screenshotUrl } })
      contentBlocks.push({ type: 'text', text: 'Analysiere diesen Instagram-Screenshot gemäß den Anweisungen.' })

      if (receiptUrl) {
        contentBlocks.push({ type: 'image', source: { type: 'url', url: receiptUrl } })
        contentBlocks.push({
          type: 'text',
          text: receiptCheckInstruction(restaurantName, restaurantAddress, submittedAt),
        })
      }

      const result = await callClaudeStructured(systemPrompt, contentBlocks)

      // ig_checks aus Vision-Antwort übernehmen
      const igUpdates: Partial<IgChecks> = {}
      if (typeof result.has_restaurant_tag === 'boolean') igUpdates.has_restaurant_tag = result.has_restaurant_tag
      if (typeof result.has_pistazz_tag === 'boolean') igUpdates.has_pistazz_tag = result.has_pistazz_tag
      if (typeof result.is_recent === 'boolean') igUpdates.is_recent = result.is_recent

      // Username-Match aus Vision bestätigen/korrigieren falls URL-Match noch null
      if (result.story_username && userHandle && igChecks?.url_user_match === null) {
        const visionUsername = (result.story_username as string).toLowerCase().replace('@', '')
        igUpdates.url_user_match = visionUsername === userHandle
      }

      return {
        verdict: String(result.verdict ?? 'pending'),
        confidence: Number(result.confidence ?? 0),
        notes: String(result.notes ?? ''),
        ig_updates: igUpdates,
        receipt_matches_restaurant: typeof result.receipt_matches_restaurant === 'boolean' ? result.receipt_matches_restaurant : null,
        receipt_is_today: typeof result.receipt_is_today === 'boolean' ? result.receipt_is_today : null,
      }
    }

    // Story ohne Screenshot, aber mit Kassenbon: Der Bon ist dann der einzige
    // Beweis und MUSS selbst geprueft werden - vor allem, ob er wirklich von
    // DIESEM Restaurant stammt (kein fremder Bon fuer fremde Punkte) und vom
    // Einreichungstag ist.
    if (type === 'instagram_story' && receiptUrl) {
      const systemPrompt = `Du bist ein strenger KI-Qualitätsprüfer für ein Gastro-Marketing-Programm.
Gäste bekommen Punkte für eine Instagram-Story über ein Restaurant. Als Beweis für den Besuch reichen sie einen Kassenbon ein. Betrugsversuch Nummer 1: ein fremder Kassenbon von einem anderen Lokal.
Restaurant: "${restaurantName}"${restaurantAddress ? ` | Adresse: ${restaurantAddress}` : ''}
${submittedAt ? `Einreichungsdatum: ${new Date(submittedAt).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' })}` : ''}

Analysiere das Kassenbon-Foto GENAU. Antworte NUR als JSON ohne weiteren Text:
{
  "verdict": "approved"|"suspicious"|"rejected",
  "confidence": 0-100,
  "receipt_matches_restaurant": true|false|null,
  "receipt_is_today": true|false|null,
  "notes": "<Kurze deutsche Begründung, max. 2 Sätze>"
}

Regeln:
- receipt_matches_restaurant: true wenn der Name, die Adresse oder ein klarer Bezug zum Restaurant auf dem Bon steht. Firmennamen weichen oft ab (GmbH, Inhabername, Kurzform) - werte Ähnlichkeit großzügig. false NUR wenn klar ein ANDERER Gastronomiebetrieb draufsteht. null wenn kein Betriebsname lesbar ist.
- receipt_is_today: true wenn das Bon-Datum dem Einreichungsdatum entspricht, false bei klar anderem Datum, null wenn kein Datum lesbar.
- verdict "rejected": kein echter Kassenbon ODER klar ein anderer Betrieb ODER offensichtlich bearbeitet.
- verdict "suspicious": Betriebsname/Datum nicht lesbar ODER Datum weicht ab ODER sonst unsicher (manuelle Prüfung).
- verdict "approved": echter Bon UND passt zum Restaurant UND Datum ist das Einreichungsdatum.
Sei streng: lieber suspicious als approved wenn du unsicher bist.`

      const rContent: unknown[] = [
        { type: 'image', source: { type: 'url', url: receiptUrl } },
        { type: 'text', text: 'Analysiere diesen Kassenbon gemäß den Anweisungen.' },
      ]
      const result = await callClaudeStructured(systemPrompt, rContent)
      return {
        verdict: String(result.verdict ?? 'pending'),
        confidence: Number(result.confidence ?? 0),
        notes: String(result.notes ?? ''),
        receipt_matches_restaurant: typeof result.receipt_matches_restaurant === 'boolean' ? result.receipt_matches_restaurant : null,
        receipt_is_today: typeof result.receipt_is_today === 'boolean' ? result.receipt_is_today : null,
      }
    }

    // Story ohne Screenshot und ohne Bon, aber per NFC-Karte des Restaurants
    // bestaetigt: Das Restaurant selbst hat den Besuch quittiert.
    if (type === 'instagram_story' && nfcConfirmed) {
      return { verdict: 'approved', confidence: 85, notes: 'Vor Ort per Pistazz-Karte (NFC) des Restaurants bestätigt.' }
    }

    // Ohne Screenshot: einfacher URL-Format-Check
    const typeLabel = type === 'instagram_story' ? 'Story' : type === 'instagram_reel' ? 'Reel' : 'Post'
    userMessage = `Prüfe diesen Instagram-${typeLabel}-Link:
URL: ${permalink ?? '(kein Link)'}
Beschreibung: ${caption ?? '(keine)'}
${igChecks?.url_user_match === true ? `✅ Der Link-Username stimmt mit dem registrierten Handle @${userHandle} überein.` : ''}
Ist das ein valider Instagram-Link? Format korrekt? Enthält die Beschreibung Hinweise auf "${restaurantName}"?`

    const systemPrompt = `Du bist ein strenger KI-Qualitätsprüfer für ein Gastro-Marketing-Programm.
Restaurant: "${restaurantName}"
Antwort immer als JSON: {"verdict":"approved"|"suspicious"|"rejected","confidence":0-100,"notes":"Kurze deutsche Begründung (max. 2 Sätze)"}
Sei streng: Ohne Screenshot kann nur das URL-Format und der Restaurantbezug in der Beschreibung geprüft werden. Setze verdict auf "suspicious" wenn keine anderen Signale vorliegen.`

    contentBlocks.push({ type: 'text', text: userMessage })
    return callClaude(systemPrompt, contentBlocks)
  }

  return { verdict: 'pending', confidence: 50, notes: 'Unbekannter Einreichungstyp, manuelle Prüfung erforderlich.' }
}

// Zusatzanweisung, wenn der Kassenbon zusammen mit einem Story-Screenshot
// geprueft wird: Der Bon muss zu DIESEM Restaurant gehoeren und vom
// Einreichungstag sein - fremde Bons anderer Lokale zaehlen nicht.
function receiptCheckInstruction(restaurantName: string, restaurantAddress: string | null, submittedAt?: string | null): string {
  const dateStr = submittedAt ? new Date(submittedAt).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' }) : null
  return `Dies ist zusätzlich der eingereichte Kassenbon. Prüfe streng:
1) Ist es ein echter, unbearbeiteter Kassenbon/Beleg?
2) Gehört er zu "${restaurantName}"${restaurantAddress ? ` (${restaurantAddress})` : ''}? Firmennamen weichen oft ab (GmbH, Inhabername, Kurzform) - werte Ähnlichkeit großzügig, aber ein klar ANDERER Gastronomiebetrieb ist ein Betrugsversuch.
3) Ist das Bon-Datum ${dateStr ? `der ${dateStr}` : 'das heutige Datum'}?
Ergänze deine JSON-Antwort um "receipt_matches_restaurant": true|false|null (null = Betriebsname nicht lesbar), "receipt_is_today": true|false|null und "receipt_notes": "<kurz>". Setze verdict höchstens auf "suspicious", wenn der Bon nicht zum Restaurant passt oder das Datum abweicht.`
}

async function callClaude(systemPrompt: string, contentBlocks: unknown[]): Promise<AnalyzeResult> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 256,
        system: systemPrompt,
        messages: [{ role: 'user', content: contentBlocks }],
      }),
      signal: AbortSignal.timeout(20000),
    })

    if (!res.ok) {
      console.error('Anthropic API error:', await res.text())
      return { verdict: 'pending', confidence: 0, notes: 'KI-Analyse fehlgeschlagen, manuelle Prüfung erforderlich.' }
    }

    const json = await res.json()
    const rawText: string = json.content?.[0]?.text ?? ''
    const match = rawText.match(/\{[\s\S]*?\}/)
    if (!match) throw new Error('No JSON in response')
    const parsed = JSON.parse(match[0]) as { verdict: string; confidence: number; notes: string }
    const validVerdicts = ['approved', 'suspicious', 'rejected']
    return {
      verdict: validVerdicts.includes(parsed.verdict) ? parsed.verdict : 'pending',
      confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 50)),
      notes: parsed.notes ?? '',
    }
  } catch (err) {
    console.error('AI analyze error:', err)
    return { verdict: 'pending', confidence: 0, notes: 'KI-Analyse fehlgeschlagen, manuelle Prüfung erforderlich.' }
  }
}

async function callClaudeStructured(systemPrompt: string, contentBlocks: unknown[]): Promise<Record<string, unknown>> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: 'user', content: contentBlocks }],
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!res.ok) {
      console.error('Anthropic API error:', await res.text())
      return { verdict: 'pending', confidence: 0, notes: 'KI-Analyse fehlgeschlagen, manuelle Prüfung erforderlich.', has_restaurant_tag: false, is_recent: false }
    }

    const json = await res.json()
    const rawText: string = json.content?.[0]?.text ?? ''
    const match = rawText.match(/\{[\s\S]*?\}/)
    if (!match) throw new Error('No JSON in response')
    return JSON.parse(match[0]) as Record<string, unknown>
  } catch (err) {
    console.error('AI structured analyze error:', err)
    return { verdict: 'pending', confidence: 0, notes: 'KI-Analyse fehlgeschlagen, manuelle Prüfung erforderlich.', has_restaurant_tag: false, is_recent: false }
  }
}

export async function POST(request: Request) {
  try {
    // Nur intern aufrufbar (Server -> Server). Ohne diesen Guard konnte jeder
    // ai_verdict / ig_checks beliebiger Einreichungen setzen.
    const secret = process.env.INTERNAL_NOTIFY_SECRET
    if (!secret || request.headers.get('x-internal-secret') !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { submission_id } = await request.json()
    if (!submission_id) return NextResponse.json({ error: 'submission_id required' }, { status: 400 })

    const admin = createAdminClient()

    const { data: sub, error: subErr } = await admin
      .from('story_submissions')
      .select('*, restaurant:restaurants(name, instagram_handle, address, city), profile:profiles(instagram_handle)')
      .eq('id', submission_id)
      .single()

    if (subErr || !sub) return NextResponse.json({ error: 'Submission not found' }, { status: 404 })

    const restRow = sub.restaurant as { name: string; instagram_handle: string | null; address: string | null; city: string | null } | null
    const restaurantName = restRow?.name ?? 'Unbekannt'
    const restaurantHandle = restRow?.instagram_handle ?? null
    const restaurantAddress = [restRow?.address, restRow?.city].filter(Boolean).join(', ') || null
    const userHandle = (sub.profile as { instagram_handle: string | null } | null)?.instagram_handle?.toLowerCase() ?? null

    const result = await analyzeWithClaude({
      type: sub.type,
      permalink: sub.instagram_permalink,
      mediaUrl: sub.media_url,
      screenshotUrl: sub.screenshot_url ?? null,
      receiptUrl: sub.receipt_url ?? null,
      distanceM: sub.location_distance_m ?? null,
      caption: sub.caption,
      restaurantName,
      restaurantAddress,
      restaurantHandle,
      userHandle,
      igChecks: (sub.ig_checks as IgChecks | null) ?? null,
      submittedAt: sub.created_at ?? null,
      nfcConfirmed: !!(sub as { nfc_confirmed_at?: string | null }).nfc_confirmed_at,
    })

    // ig_checks mit Vision-Ergebnissen mergen falls vorhanden
    const igChecksUpdate = result.ig_updates
      ? { ...((sub.ig_checks as object) ?? {}), ...result.ig_updates }
      : undefined

    // ── Hartes Anti-Betrugs-Gate fuer Stories, unabhaengig von der KI-Meinung ──
    // Der Instagram-Zeitstempel beweist nur "gerade gepostet", nicht "Foto
    // gerade aufgenommen" oder "Person ist vor Ort". Kassenbon + Standort sind
    // daher Pflichtbedingungen fuer eine automatische Genehmigung.
    let finalVerdict = result.verdict
    let finalNotes = result.notes
    if (sub.type === 'instagram_story' && finalVerdict === 'approved') {
      const distance = sub.location_distance_m as number | null
      const hasReceipt = !!sub.receipt_url
      // NFC-Bestaetigung: Der Gast hat die Pistazz-Karte des Restaurants
      // physisch angetippt. Das beweist die Anwesenheit vor Ort und ersetzt
      // Kassenbon UND Standort (Fallback, wenn der Bon vergessen wurde).
      const nfcConfirmed = !!(sub as { nfc_confirmed_at?: string | null }).nfc_confirmed_at
      const tooFar = distance == null || distance > 500
      if (!nfcConfirmed) {
        if (!hasReceipt) {
          finalVerdict = 'suspicious'
          finalNotes = 'Kein Kassenbon vorhanden, manuelle Prüfung erforderlich.'
        } else if (tooFar) {
          finalVerdict = 'suspicious'
          finalNotes = distance == null
            ? 'Kein Standort übermittelt, manuelle Prüfung erforderlich.'
            : `Standort war ${distance}m vom Restaurant entfernt, manuelle Prüfung erforderlich.`
        } else if (result.receipt_matches_restaurant === false) {
          // Fremder Bon eines anderen Lokals zaehlt NIE - egal was die KI
          // sonst gut fand. Der Inhaber entscheidet in der manuellen Pruefung.
          finalVerdict = 'suspicious'
          finalNotes = `Der Kassenbon scheint nicht von "${restaurantName}" zu sein, manuelle Prüfung erforderlich.`
        } else if (result.receipt_is_today === false) {
          finalVerdict = 'suspicious'
          finalNotes = 'Das Datum auf dem Kassenbon ist nicht das Einreichungsdatum, manuelle Prüfung erforderlich.'
        }
      }
    }

    const updatePayload: Record<string, unknown> = {
      ai_verdict: finalVerdict,
      ai_confidence: result.confidence,
      ai_notes: finalNotes,
      ai_analyzed_at: new Date().toISOString(),
    }
    if (igChecksUpdate) updatePayload.ig_checks = igChecksUpdate

    await admin.from('story_submissions').update(updatePayload).eq('id', submission_id)

    return NextResponse.json({ success: true, ...result, verdict: finalVerdict, notes: finalNotes })
  } catch (err) {
    console.error('POST /api/stories/ai-analyze error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
