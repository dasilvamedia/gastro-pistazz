import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const contentType = request.headers.get('content-type') ?? ''
    let restaurant_id: string
    let type: string
    let instagram_permalink: string | undefined
    let media_url: string | undefined
    let screenshot_url: string | undefined
    let caption: string | undefined
    let file: File | null = null
    let screenshotFile: File | null = null

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      restaurant_id = formData.get('restaurant_id') as string
      type = formData.get('type') as string
      instagram_permalink = (formData.get('instagram_permalink') as string) || undefined
      caption = (formData.get('caption') as string) || undefined
      file = (formData.get('file') as File) || null
      screenshotFile = (formData.get('screenshot') as File) || null
    } else {
      const body = await request.json()
      restaurant_id = body.restaurant_id
      type = body.type
      instagram_permalink = body.instagram_permalink
      media_url = body.media_url
      screenshot_url = body.screenshot_url
      caption = body.caption
    }

    if (!restaurant_id || !type) {
      return NextResponse.json({ error: 'restaurant_id and type are required' }, { status: 400 })
    }
    // Caption Längenbegrenzung gegen DoS
    if (caption && caption.length > 2000) {
      return NextResponse.json({ error: 'Caption zu lang (max. 2000 Zeichen)' }, { status: 400 })
    }

    const validTypes = ['instagram_story', 'instagram_reel', 'instagram_post', 'google_review', 'receipt']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: restaurant, error: restaurantError } = await admin
      .from('restaurants')
      .select('id')
      .eq('id', restaurant_id)
      .eq('is_active', true)
      .single()

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    // Haupt-Datei hochladen (z.B. Kassenbon)
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']
    const MAX_SIZE = 50 * 1024 * 1024 // 50MB
    if (file && file.size > 0) {
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: 'Datei zu groß (max. 50 MB)' }, { status: 400 })
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: 'Ungültiger Dateityp. Nur Bilder erlaubt.' }, { status: 400 })
      }
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${user.id}/${restaurant_id}/${Date.now()}.${ext}`
      const arrayBuffer = await file.arrayBuffer()
      const { data: uploadData, error: uploadError } = await admin.storage
        .from('story-media')
        .upload(path, arrayBuffer, { contentType: file.type, upsert: false })

      if (!uploadError && uploadData) {
        const { data: urlData } = admin.storage.from('story-media').getPublicUrl(uploadData.path)
        media_url = urlData.publicUrl
      } else if (uploadError) {
        console.error('Storage upload error:', uploadError)
      }
    }

    // Screenshot hochladen (für Instagram-Verifikation)
    if (screenshotFile && screenshotFile.size > 0 && screenshotFile.size <= MAX_SIZE && ALLOWED_TYPES.includes(screenshotFile.type)) {
      const ext = screenshotFile.name.split('.').pop() ?? 'jpg'
      const path = `screenshots/${user.id}/${restaurant_id}/${Date.now()}.${ext}`
      const arrayBuffer = await screenshotFile.arrayBuffer()
      const { data: uploadData, error: uploadError } = await admin.storage
        .from('story-media')
        .upload(path, arrayBuffer, { contentType: screenshotFile.type, upsert: false })

      if (!uploadError && uploadData) {
        const { data: urlData } = admin.storage.from('story-media').getPublicUrl(uploadData.path)
        screenshot_url = urlData.publicUrl
      } else if (uploadError) {
        console.error('Screenshot upload error:', uploadError)
      }
    }

    const { data: submission, error: insertError } = await admin
      .from('story_submissions')
      .insert({
        user_id: user.id,
        restaurant_id,
        type,
        status: 'pending',
        instagram_permalink: instagram_permalink ?? null,
        media_url: media_url ?? null,
        screenshot_url: screenshot_url ?? null,
        caption: caption ?? null,
        ai_verdict: 'pending',
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Story submission insert error:', insertError)
      return NextResponse.json({ error: 'Failed to submit story' }, { status: 500 })
    }

    // Instagram-Verifikation triggern (URL-Match + oEmbed + dann AI-Analyse)
    // Für nicht-Instagram-Typen direkt AI-Analyse triggern
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gastro.pistazz.io'
    const isInstagram = ['instagram_story', 'instagram_reel', 'instagram_post'].includes(type)

    if (isInstagram) {
      fetch(`${baseUrl}/api/stories/ig-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_id: submission.id }),
      }).catch(err => console.error('IG verify trigger error:', err))
    } else {
      fetch(`${baseUrl}/api/stories/ai-analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_id: submission.id }),
      }).catch(err => console.error('AI analyze trigger error:', err))
    }

    return NextResponse.json({ success: true, submission_id: submission.id }, { status: 201 })
  } catch (err) {
    console.error('POST /api/stories/submit error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
