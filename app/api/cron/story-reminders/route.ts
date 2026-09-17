import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyUser } from '@/lib/notifyUser'

// Alle 15 Minuten per Server-Crontab:
//   */15 * * * * /home/marcio/gastro-pistazz/scripts/cron.sh story-reminders
//
// Erinnert Gaeste an den fehlenden Kassenbon ihrer Story-Einreichung:
//   Stufe 1 (~1 h): "Kassenbon hochladen, dann gibt es die Punkte."
//   Stufe 2 (5 h):  "Fenster vorbei - beim naechsten Besuch per Pistazz-Karte
//                    (NFC) vor Ort bestaetigen."
// Der partielle Index idx_story_pending_receipt (035) haelt den Scan winzig.

const REMIND_AFTER_MS = 40 * 60 * 1000        // 40 Minuten (Wunsch: 30-45)
const PROOF_WINDOW_MS = 5 * 60 * 60 * 1000    // 5 Stunden

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: subs, error } = await admin
    .from('story_submissions')
    .select('id, user_id, created_at, proof_reminder_stage, restaurant:restaurants(name, slug)')
    .eq('status', 'pending')
    .eq('type', 'instagram_story')
    .is('receipt_url', null)
    .is('nfc_confirmed_at', null)
    .lt('proof_reminder_stage', 2)
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) {
    console.error('cron story-reminders query error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let reminded = 0
  let expiredNotified = 0
  const now = Date.now()

  for (const sub of subs ?? []) {
    const rest = sub.restaurant as unknown as { name: string; slug: string } | null
    const age = now - new Date(sub.created_at).getTime()
    const stage = sub.proof_reminder_stage ?? 0

    try {
      if (age >= PROOF_WINDOW_MS && stage < 2) {
        await notifyUser(sub.user_id, {
          title: 'Kassenbon vergessen? Kein Problem',
          body: `Zeig deine Story${rest ? ` bei ${rest.name}` : ''} einfach beim nächsten Besuch und tippe dort die Pistazz-Karte an. Damit ist sie bestätigt und du bekommst deine Punkte.`,
          url: '/profil/punkte',
        })
        await admin.from('story_submissions').update({ proof_reminder_stage: 2 }).eq('id', sub.id)
        expiredNotified++
      } else if (age >= REMIND_AFTER_MS && age < PROOF_WINDOW_MS && stage < 1) {
        const deadline = new Date(new Date(sub.created_at).getTime() + PROOF_WINDOW_MS)
        await notifyUser(sub.user_id, {
          title: 'Kassenbon nicht vergessen!',
          body: `Deine Story${rest ? ` bei ${rest.name}` : ''} wartet. Lade deinen Kassenbon bis ${deadline.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr hoch, dann gehören die Punkte dir.`,
          url: `/story/submit?submission=${sub.id}${rest?.slug ? `&restaurant=${rest.slug}` : ''}`,
        })
        await admin.from('story_submissions').update({ proof_reminder_stage: 1 }).eq('id', sub.id)
        reminded++
      }
    } catch (e) {
      console.error('cron story-reminders notify error:', sub.id, e)
    }
  }

  // ── Selbstheilung: haengengebliebene KI-Pruefungen nachholen ──
  // Die Pruefkette (proof -> ig-verify -> ai-analyze) laeuft fire-and-forget
  // und stirbt z.B. bei einem pm2-Reload mitten im Deploy. Alles, was Beweise
  // hat (Bon oder NFC) aber nie analysiert wurde, wird hier neu angestossen.
  let reanalyzed = 0
  const { data: stuck } = await admin
    .from('story_submissions')
    .select('id, receipt_url, nfc_confirmed_at')
    .eq('status', 'pending')
    .is('ai_analyzed_at', null)
    .gte('created_at', since)
    .lt('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
    .limit(20)

  const secret = process.env.INTERNAL_NOTIFY_SECRET ?? ''
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gastro.pistazz.io'
  for (const s of stuck ?? []) {
    if (!s.receipt_url && !s.nfc_confirmed_at) continue // wartet noch auf Beweis
    try {
      await fetch(`${baseUrl}/api/stories/ig-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-secret': secret },
        body: JSON.stringify({ submission_id: s.id }),
      })
      reanalyzed++
    } catch (e) {
      console.error('cron story-reminders reanalyze error:', s.id, e)
    }
  }

  return NextResponse.json({ reminded, expiredNotified, reanalyzed, scanned: subs?.length ?? 0, at: new Date().toISOString() })
}
