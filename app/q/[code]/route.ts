/**
 * /q/[code] — Permanente QR-Code Weiterleitung
 *
 * Alle physischen QR-Codes zeigen auf diese URL.
 * Egal ob sich der Restaurantname, Slug oder Ziel-URL ändert:
 * Der QR-Code bleibt 2 Jahre+ funktionsfähig.
 *
 * Logik:
 *   1. code-Lookup in qr_codes (case-insensitive)
 *   2. scan_count +1 (fire-and-forget, nie blockierend)
 *   3. 302-Redirect auf target_url (nie gecacht)
 *   4. Fallback auf / — niemals Fehlerseite sichtbar
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await params
  const code = (rawCode ?? '').toUpperCase().trim()
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gastro.pistazz.io'

  if (!code) return NextResponse.redirect(base, { status: 302 })

  try {
    const admin = createAdminClient()

    const { data: qr } = await admin
      .from('qr_codes')
      .select('id, target_url, is_active, scan_count')
      .ilike('code', code)
      .single()

    // Unbekannter oder inaktiver Code → Startseite, kein Fehler
    if (!qr || !qr.is_active) {
      return NextResponse.redirect(base, { status: 302 })
    }

    // Scan zählen — fire-and-forget, blockiert nie den Redirect
    admin
      .from('qr_codes')
      .update({ scan_count: (qr.scan_count ?? 0) + 1 })
      .eq('id', qr.id)
      .then(() => { /* ignoriert */ }, () => { /* ignoriert */ })

    const target = qr.target_url.startsWith('http')
      ? qr.target_url
      : `${base}${qr.target_url}`

    return NextResponse.redirect(target, {
      status: 302,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch {
    // Im Fehlerfall IMMER auf Startseite — niemals 404/500 sichtbar
    return NextResponse.redirect(base, { status: 302 })
  }
}
