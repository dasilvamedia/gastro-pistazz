import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyRestaurantOwner } from '@/lib/notifyUser'

// Kassenbon (und optional Story-Screenshot) zu einer bestehenden Story-
// Einreichung nachreichen. Bezahlt wird oft erst lange nach dem Posten der
// Story, deshalb ist der Beweis zeitlich von der Einreichung entkoppelt.
// Erst wenn der Kassenbon da ist, starten Pruefkette und Inhaber-Info.

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']
const MAX_SIZE = 50 * 1024 * 1024 // 50MB

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const submissionId = formData.get('submission_id') as string
    const receiptFile = (formData.get('receipt') as File) || null
    const screenshotFile = (formData.get('screenshot') as File) || null
    const latRaw = formData.get('lat')
    const lngRaw = formData.get('lng')

    if (!submissionId) {
      return NextResponse.json({ error: 'submission_id fehlt' }, { status: 400 })
    }
    if (!receiptFile || receiptFile.size === 0) {
      return NextResponse.json({ error: 'Kassenbon-Foto fehlt.' }, { status: 400 })
    }
    if (receiptFile.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Datei zu groß (max. 50 MB)' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(receiptFile.type)) {
      return NextResponse.json({ error: 'Ungültiger Dateityp. Nur Bilder erlaubt.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: sub, error: subErr } = await admin
      .from('story_submissions')
      .select('id, user_id, restaurant_id, type, status, receipt_url, screenshot_url, submitted_lat, submitted_lng')
      .eq('id', submissionId)
      .single()

    if (subErr || !sub) {
      return NextResponse.json({ error: 'Einreichung nicht gefunden' }, { status: 404 })
    }
    if (sub.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (sub.type !== 'instagram_story') {
      return NextResponse.json({ error: 'Nur Story-Einreichungen brauchen einen nachgereichten Kassenbon.' }, { status: 400 })
    }
    if (sub.status !== 'pending') {
      return NextResponse.json({ error: 'Diese Einreichung ist schon geprüft.' }, { status: 409 })
    }
    if (sub.receipt_url) {
      return NextResponse.json({ error: 'Dein Kassenbon ist schon da. Die Einreichung wird geprüft.' }, { status: 409 })
    }

    // Kassenbon hochladen
    const ext = receiptFile.name.split('.').pop() ?? 'jpg'
    const path = `receipts/${user.id}/${sub.restaurant_id}/${Date.now()}.${ext}`
    const arrayBuffer = await receiptFile.arrayBuffer()
    const { data: uploadData, error: uploadError } = await admin.storage
      .from('story-media')
      .upload(path, arrayBuffer, { contentType: receiptFile.type, upsert: false })
    if (uploadError || !uploadData) {
      console.error('Receipt upload error:', uploadError)
      return NextResponse.json({ error: 'Upload fehlgeschlagen, bitte nochmal versuchen.' }, { status: 500 })
    }
    const receipt_url = admin.storage.from('story-media').getPublicUrl(uploadData.path).data.publicUrl

    // Optionaler Story-Screenshot (beschleunigt die automatische Genehmigung)
    let screenshot_url: string | undefined
    if (screenshotFile && screenshotFile.size > 0 && screenshotFile.size <= MAX_SIZE && ALLOWED_TYPES.includes(screenshotFile.type)) {
      const sExt = screenshotFile.name.split('.').pop() ?? 'jpg'
      const sPath = `screenshots/${user.id}/${sub.restaurant_id}/${Date.now()}.${sExt}`
      const sBuf = await screenshotFile.arrayBuffer()
      const { data: sUp } = await admin.storage
        .from('story-media')
        .upload(sPath, sBuf, { contentType: screenshotFile.type, upsert: false })
      if (sUp) screenshot_url = admin.storage.from('story-media').getPublicUrl(sUp.path).data.publicUrl
    }

    // Standort nur ergaenzen, wenn er bei der Einreichung gefehlt hat (der
    // Standort vom Story-Zeitpunkt ist der staerkere Beweis und bleibt).
    const patch: Record<string, unknown> = { receipt_url }
    if (screenshot_url && !sub.screenshot_url) patch.screenshot_url = screenshot_url
    if (sub.submitted_lat == null && latRaw != null && lngRaw != null) {
      const lat = Number(latRaw)
      const lng = Number(lngRaw)
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        patch.submitted_lat = lat
        patch.submitted_lng = lng
        const { data: rest } = await admin
          .from('restaurants')
          .select('latitude, longitude')
          .eq('id', sub.restaurant_id)
          .single()
        if (rest?.latitude != null && rest?.longitude != null) {
          const R = 6371000
          const toRad = (d: number) => (d * Math.PI) / 180
          const dLat = toRad(rest.latitude - lat)
          const dLng = toRad(rest.longitude - lng)
          const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat)) * Math.cos(toRad(rest.latitude)) * Math.sin(dLng / 2) ** 2
          patch.location_distance_m = Math.round(2 * R * Math.asin(Math.sqrt(a)))
        }
      }
    }

    const { error: updateErr } = await admin
      .from('story_submissions')
      .update(patch)
      .eq('id', sub.id)
    if (updateErr) {
      console.error('Proof update error:', updateErr)
      return NextResponse.json({ error: 'Speichern fehlgeschlagen' }, { status: 500 })
    }

    // Jetzt (mit vollstaendigen Beweisen) Pruefkette starten + Inhaber informieren
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gastro.pistazz.io'
    fetch(`${baseUrl}/api/stories/ig-verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.INTERNAL_NOTIFY_SECRET ?? '',
      },
      body: JSON.stringify({ submission_id: sub.id }),
    }).catch(err => console.error('IG verify trigger error:', err))

    notifyRestaurantOwner(sub.restaurant_id, {
      title: 'Neue Einreichung zur Pruefung',
      body: 'Ein Gast hat einen Beitrag eingereicht. Freigeben oder ablehnen im Dashboard.',
      url: '/dashboard/stories',
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/stories/proof error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
