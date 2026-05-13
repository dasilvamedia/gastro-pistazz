import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { message, stack, digest } = await req.json()
    console.error('[CLIENT ERROR]', message)
    if (stack) console.error('[CLIENT STACK]', stack)
    if (digest) console.error('[CLIENT DIGEST]', digest)
  } catch { /* silent */ }
  return NextResponse.json({ ok: true })
}
