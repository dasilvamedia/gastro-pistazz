import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_BYTES = 20 * 1024 * 1024 // 20 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/heic']
const BUCKET = 'restaurant-media'

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const path = formData.get('path') as string | null

  if (!file || !path) {
    return NextResponse.json({ error: 'Datei oder Pfad fehlt' }, { status: 400 })
  }

  // Size check
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Datei zu groß. Maximal 20 MB erlaubt (diese Datei: ${(file.size / 1024 / 1024).toFixed(1)} MB)` },
      { status: 413 }
    )
  }

  // Type check
  const mime = file.type.toLowerCase()
  if (!ALLOWED_TYPES.some(t => mime.startsWith(t.split('/')[0]) && mime.includes(t.split('/')[1]))) {
    return NextResponse.json(
      { error: 'Nur Bilder erlaubt (JPG, PNG, WebP, GIF)' },
      { status: 415 }
    )
  }

  // Sanitise path — prevent directory traversal, lock to user's restaurant
  const safePath = path.replace(/\.\./g, '').replace(/^\/+/, '')

  const admin = createAdminClient()

  // Ensure bucket exists (idempotent)
  const { data: buckets } = await admin.storage.listBuckets()
  if (!buckets?.find(b => b.name === BUCKET)) {
    await admin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: MAX_BYTES })
  }

  const arrayBuffer = await file.arrayBuffer()
  const { error, data } = await admin.storage
    .from(BUCKET)
    .upload(safePath, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    })

  if (error) {
    console.error('[upload] Supabase error:', error)
    return NextResponse.json({ error: 'Speichern fehlgeschlagen: ' + error.message }, { status: 500 })
  }

  const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(data.path)
  // Bust CDN cache with timestamp
  const url = publicUrl + `?t=${Date.now()}`

  return NextResponse.json({ url })
}
