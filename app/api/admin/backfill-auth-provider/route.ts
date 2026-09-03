import { NextResponse } from 'next/server'
import { assertSuperAdmin } from '@/lib/adminAuth'

// Einmalig nach Migration 030: profiles.auth_provider fuer Bestandsnutzer
// aus den Auth-Identitaeten fuellen (seitenweise, nicht alles auf einmal).
export async function POST() {
  const auth = await assertSuperAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { admin } = auth

  let page = 1, updated = 0, scanned = 0
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 500 })
    if (error) return NextResponse.json({ error: error.message, updated }, { status: 500 })
    const users = data?.users ?? []
    if (users.length === 0) break
    scanned += users.length
    for (const u of users) {
      const provider = (u.app_metadata?.provider as string | undefined) ?? u.identities?.[0]?.provider ?? 'email'
      const { error: upErr } = await admin.from('profiles').update({ auth_provider: provider }).eq('id', u.id).is('auth_provider', null)
      if (!upErr) updated++
    }
    if (users.length < 500) break
    page++
  }
  return NextResponse.json({ ok: true, scanned, updated })
}
