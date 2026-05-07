import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Admin password gate — stored securely in ADMIN_PASSWORD env var (never in source)
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    const adminPassword = process.env.ADMIN_PASSWORD
    if (!adminPassword) {
      return NextResponse.json({ error: 'Admin password not configured' }, { status: 500 })
    }

    if (password !== adminPassword) {
      // Small delay to slow brute-force
      await new Promise(r => setTimeout(r, 800))
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    // Set a secure HTTP-only session cookie (24h)
    const cookieStore = await cookies()
    cookieStore.set('admin_session', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}
