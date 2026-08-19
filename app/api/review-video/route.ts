import { NextRequest, NextResponse } from 'next/server'
import { createWriteStream } from 'fs'
import { readFile, stat, rename, unlink } from 'fs/promises'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'

export const maxDuration = 600
export const dynamic = 'force-dynamic'

const DIR = '/home/marcio/gastro-pistazz/uploads'
const STORE = `${DIR}/review-demo.mp4`
const TMP = `${DIR}/review-demo.part`
const SECRET = 'zx91-video-drop'

// Upload des Prüf-Videos: roher Body wird direkt auf die Platte gestreamt,
// damit auch grosse Dateien ohne Speicherlast durchgehen.
export async function POST(req: NextRequest) {
  if (req.nextUrl.searchParams.get('s') !== SECRET) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  if (!req.body) return NextResponse.json({ error: 'no body' }, { status: 400 })

  const expected = Number(req.headers.get('content-length') || 0)
  await pipeline(Readable.fromWeb(req.body as never), createWriteStream(TMP))
  const part = await stat(TMP)

  // Abgebrochene Uploads nicht als Erfolg durchwinken
  if (expected > 0 && part.size !== expected) {
    await unlink(TMP).catch(() => {})
    return NextResponse.json(
      { error: `unvollstaendig: ${part.size} von ${expected} bytes` },
      { status: 400 },
    )
  }

  await rename(TMP, STORE)
  return NextResponse.json({ ok: true, mb: (part.size / 1048576).toFixed(1) })
}

// Öffentlicher Abruf für die Apple-Prüfung
export async function GET() {
  try {
    const info = await stat(STORE)
    const buf = await readFile(STORE)
    return new NextResponse(buf as unknown as BodyInit, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': String(info.size),
        'Content-Disposition': 'inline; filename="pistazz-demo.mp4"',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'no video yet' }, { status: 404 })
  }
}
