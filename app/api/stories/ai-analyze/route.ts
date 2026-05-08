import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? ''
const MODEL = 'claude-opus-4-5'

/**
 * Calls Claude to analyse a story submission and returns a verdict.
 * Called internally after a submission is created – NOT exposed to users directly.
 */
async function analyzeWithClaude(opts: {
  type: string
  permalink: string | null
  mediaUrl: string | null
  caption: string | null
  restaurantName: string
}): Promise<{ verdict: string; confidence: number; notes: string }> {
  const { type, permalink, mediaUrl, caption, restaurantName } = opts

  if (!ANTHROPIC_API_KEY) {
    return { verdict: 'pending', confidence: 0, notes: 'Kein API-Schlüssel konfiguriert – manuelle Prüfung erforderlich.' }
  }

  // Build content blocks depending on type
  const contentBlocks: unknown[] = []

  // System prompt
  const systemPrompt = `Du bist ein strenger KI-Qualitätsprüfer für ein Gastro-Marketing-Programm.
Deine Aufgabe: Prüfe, ob eine eingereichte Aktion echt und regelkonform ist.
Restaurant: "${restaurantName}"
Antwort immer als JSON: {"verdict":"approved"|"suspicious"|"rejected","confidence":0-100,"notes":"Kurze deutsche Begründung (max. 2 Sätze)"}
Sei streng: Lieber suspicious als approved wenn du unsicher bist.`

  let userMessage = ''

  if (type === 'receipt') {
    if (!mediaUrl) {
      return { verdict: 'rejected', confidence: 95, notes: 'Kein Beleg-Bild vorhanden.' }
    }
    // Vision check for receipt
    contentBlocks.push({
      type: 'image',
      source: { type: 'url', url: mediaUrl },
    })
    userMessage = `Analysiere diesen Kassenbon. Prüfe: 1) Ist das ein echter Kassenbon/Quittung? 2) Gibt es Hinweise auf das Restaurant "${restaurantName}"? 3) Sieht das Bild echt und unbearbeitet aus?
${caption ? `Beschreibung des Nutzers: "${caption}"` : ''}`
  } else if (type === 'google_review') {
    userMessage = `Prüfe diesen Link für eine Google-Bewertung:
URL: ${permalink ?? '(kein Link)'}
Beschreibung: ${caption ?? '(keine)'}
Ist das ein valider Google Maps / Google Reviews Link? Enthält er Hinweise auf "${restaurantName}"?`
  } else if (['instagram_story', 'instagram_reel', 'instagram_post'].includes(type)) {
    const typeLabel = type === 'instagram_story' ? 'Story' : type === 'instagram_reel' ? 'Reel' : 'Post'
    userMessage = `Prüfe diesen Instagram-${typeLabel}-Link:
URL: ${permalink ?? '(kein Link)'}
Beschreibung: ${caption ?? '(keine)'}
Ist das ein valider Instagram-Link? Format korrekt (instagram.com/p/ oder /reel/ oder /stories/)? Enthält die Beschreibung Hinweise auf "${restaurantName}"?`
  } else {
    return { verdict: 'pending', confidence: 50, notes: 'Unbekannter Einreichungstyp – manuelle Prüfung erforderlich.' }
  }

  contentBlocks.push({ type: 'text', text: userMessage })

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
      const errText = await res.text()
      console.error('Anthropic API error:', errText)
      return { verdict: 'pending', confidence: 0, notes: 'KI-Analyse fehlgeschlagen – manuelle Prüfung erforderlich.' }
    }

    const json = await res.json()
    const rawText: string = json.choices?.[0]?.message?.content ?? json.content?.[0]?.text ?? ''

    // Extract JSON from response
    const match = rawText.match(/\{[^}]+\}/)
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
    return { verdict: 'pending', confidence: 0, notes: 'KI-Analyse fehlgeschlagen – manuelle Prüfung erforderlich.' }
  }
}

export async function POST(request: Request) {
  try {
    const { submission_id } = await request.json()
    if (!submission_id) return NextResponse.json({ error: 'submission_id required' }, { status: 400 })

    const admin = createAdminClient()

    // Load submission + restaurant
    const { data: sub, error: subErr } = await admin
      .from('story_submissions')
      .select('*, restaurant:restaurants(name, google_place_id)')
      .eq('id', submission_id)
      .single()

    if (subErr || !sub) return NextResponse.json({ error: 'Submission not found' }, { status: 404 })

    const restaurantName = (sub.restaurant as { name: string } | null)?.name ?? 'Unbekannt'

    const result = await analyzeWithClaude({
      type: sub.type,
      permalink: sub.instagram_permalink,
      mediaUrl: sub.media_url,
      caption: sub.caption,
      restaurantName,
    })

    // Store result
    await admin.from('story_submissions').update({
      ai_verdict: result.verdict,
      ai_confidence: result.confidence,
      ai_notes: result.notes,
      ai_analyzed_at: new Date().toISOString(),
    }).eq('id', submission_id)

    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    console.error('POST /api/stories/ai-analyze error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
