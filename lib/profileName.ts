import type { SupabaseClient } from '@supabase/supabase-js'

type AuthUserLike = { id: string; user_metadata?: Record<string, unknown> | null }

// Vor-/Nachname aus den Auth-Metadaten (Google: given_name/family_name,
// eigene Felder first_name/last_name, sonst full_name/name splitten).
// Wird nach jedem Login genutzt, um LEERE Profilfelder nachzufuellen.
export function namesFromMeta(meta: Record<string, unknown> | undefined | null) {
  const m = meta ?? {}
  const str = (k: string) => (typeof m[k] === 'string' && (m[k] as string).trim()) ? (m[k] as string).trim() : null
  const full = str('full_name') ?? str('name')
  let first = str('first_name') ?? str('given_name')
  let last = str('last_name') ?? str('family_name')
  if (!first && full) {
    const [f, ...rest] = full.split(/\s+/)
    first = f || null
    last = last ?? (rest.join(' ') || null)
  }
  return {
    first_name: first,
    last_name: last,
    full_name: full ?? ([first, last].filter(Boolean).join(' ') || null),
    avatar_url: str('avatar_url') ?? str('picture'),
    provider: (m['provider'] as string | undefined) ?? null,
  }
}

/** Leere Profilfelder aus den Auth-Metadaten fuellen (nie ueberschreiben) */
export async function syncNameFromAuth(
  supabase: SupabaseClient,
  user: AuthUserLike,
  profile: { full_name?: string | null; first_name?: string | null; last_name?: string | null; avatar_url?: string | null } | null,
) {
  const n = namesFromMeta(user.user_metadata)
  const patch: Record<string, string> = {}
  if (!profile?.first_name && n.first_name) patch.first_name = n.first_name
  if (!profile?.last_name && n.last_name) patch.last_name = n.last_name
  if (!profile?.full_name && n.full_name) patch.full_name = n.full_name
  if (!profile?.avatar_url && n.avatar_url) patch.avatar_url = n.avatar_url
  if (Object.keys(patch).length === 0) return null
  await supabase.from('profiles').update(patch).eq('id', user.id).then(undefined, () => {})
  return patch
}

/** Anrede: Vorname, sonst erstes Wort des vollen Namens, sonst null */
export function greetingName(p: { first_name?: string | null; full_name?: string | null } | null | undefined): string | null {
  if (!p) return null
  return p.first_name?.trim() || p.full_name?.trim().split(/\s+/)[0] || null
}
