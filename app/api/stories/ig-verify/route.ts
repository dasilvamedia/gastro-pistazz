import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Extrahiert den Instagram-Username aus der Story/Post/Reel-URL.
function parseInstagramUsername(url: string, type: string): string | null {
  try {
    const u = new URL(url)
    if (!u.hostname.includes('instagram.com')) return null
    const parts = u.pathname.split('/').filter(Boolean)

    if (type === 'instagram_story' && parts[0] === 'stories') {
      return parts[1]?.toLowerCase() ?? null // /stories/{username}/{id}
    }
    if (type === 'instagram_post' && parts.length >= 2 && parts[1] === 'p') {
      return parts[0].toLowerCase() // /{username}/p/{id}
    }
    if (type === 'instagram_reel') {
      const reelIdx = parts.indexOf('reel')
      // /{username}/reel/{id} → username ist parts[0]
      return reelIdx > 0 ? parts[0].toLowerCase() : null
    }
    return null
  } catch {
    return null
  }
}

// Prüft via Instagram oEmbed ob ein öffentlicher Post/Reel existiert und wer der Autor ist.
// Kein API-Key erforderlich (öffentliche oEmbed API).
async function checkOEmbed(permalink: string): Promise<{ exists: boolean; author: string | null }> {
  try {
    const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(permalink)}&omitscript=true`
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return { exists: false, author: null }
    const data = await res.json() as { author_name?: string }
    return { exists: true, author: data.author_name?.toLowerCase() ?? null }
  } catch {
    return { exists: false, author: null }
  }
}

export async function POST(request: Request) {
  try {
    // Nur intern aufrufbar (Server -> Server). Ohne diesen Guard konnte jeder
    // die Pruefergebnisse beliebiger Einreichungen ueberschreiben.
    const secret = process.env.INTERNAL_NOTIFY_SECRET
    if (!secret || request.headers.get('x-internal-secret') !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { submission_id } = await request.json()
    if (!submission_id) {
      return NextResponse.json({ error: 'submission_id required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Submission + Restaurant-Handle + User-Handle laden
    const { data: sub, error: subErr } = await admin
      .from('story_submissions')
      .select(`
        *,
        restaurant:restaurants(name, instagram_handle),
        profile:profiles(instagram_handle)
      `)
      .eq('id', submission_id)
      .single()

    if (subErr || !sub) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    const userHandle = (sub.profile as { instagram_handle: string | null } | null)?.instagram_handle?.toLowerCase() ?? null
    const permalink = sub.instagram_permalink as string | null
    const type = sub.type as string

    const igChecks: Record<string, boolean | string | null> = {
      url_user_match: null,
      has_restaurant_tag: false,
      is_recent: false,
      oembed_verified: null,
      user_handle: null,
    }

    // 1. URL-Username-Match
    if (permalink && userHandle) {
      const urlUsername = parseInstagramUsername(permalink, type)
      igChecks.user_handle = urlUsername
      if (urlUsername !== null) {
        igChecks.url_user_match = urlUsername === userHandle
      }
      // Kein Username in URL extrahierbar (z.B. Reel ohne Username) → null
    }

    // 2. oEmbed-Check (nur öffentliche Posts und Reels — Stories sind privat/ephemer)
    if (permalink && (type === 'instagram_post' || type === 'instagram_reel')) {
      const oembed = await checkOEmbed(permalink)
      igChecks.oembed_verified = oembed.exists

      // Extra-Signal: oEmbed-Autor stimmt mit User-Handle überein
      if (oembed.author && userHandle && igChecks.url_user_match === null) {
        igChecks.url_user_match = oembed.author === userHandle
        igChecks.user_handle = oembed.author
      }
    }

    // ig_checks in DB speichern
    await admin
      .from('story_submissions')
      .update({ ig_checks: igChecks })
      .eq('id', submission_id)

    // AI-Analyse async triggern (sie liest screenshot_url + ig_checks aus der DB)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gastro.pistazz.io'
    fetch(`${baseUrl}/api/stories/ai-analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-secret': secret },
      body: JSON.stringify({ submission_id }),
    }).catch(err => console.error('AI analyze trigger error:', err))

    return NextResponse.json({ ok: true, ig_checks: igChecks })
  } catch (err) {
    console.error('POST /api/stories/ig-verify error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
