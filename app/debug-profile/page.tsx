'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  id: string
  role: string
  onboarding_completed: boolean
  full_name: string | null
  [key: string]: unknown
}

export default function DebugProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      setUserId(user.id)
      setEmail(user.email ?? null)

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(data as Profile | null)
      setProfileError(error?.message ?? null)
      setLoading(false)
    })
  }, [])

  const pre: React.CSSProperties = { background: '#0a0a0a', padding: 12, borderRadius: 8, color: 'white', marginTop: 4, overflow: 'auto', fontSize: 13 }
  const isAdmin = profile?.role === 'super_admin'

  if (loading) return <div style={{ padding: 40, fontFamily: 'monospace', background: '#1C1F1A', color: 'white', minHeight: '100vh' }}>Lädt...</div>

  return (
    <div style={{ padding: 40, fontFamily: 'monospace', background: '#1C1F1A', color: '#ccc', minHeight: '100vh' }}>
      <h1 style={{ color: 'white', marginBottom: 24 }}>🔍 Debug: Dein Profil</h1>

      <p style={{ color: '#E5B84C' }}>User ID:</p>
      <pre style={pre}>{userId ?? 'Nicht eingeloggt'}</pre>

      <p style={{ color: '#E5B84C', marginTop: 16 }}>E-Mail:</p>
      <pre style={pre}>{email ?? 'null'}</pre>

      <p style={{ color: '#E5B84C', marginTop: 16 }}>Profil (vollständig):</p>
      <pre style={pre}>{JSON.stringify({ profile, profileError }, null, 2)}</pre>

      <div style={{ marginTop: 24, padding: 16, borderRadius: 8, border: `2px solid ${isAdmin ? '#8BB06A' : '#E86B5A'}`, background: '#2a2d2a' }}>
        <strong style={{ color: 'white' }}>Aktuelle Rolle: </strong>
        <span style={{ color: isAdmin ? '#8BB06A' : '#E86B5A', fontSize: 20 }}>
          {profile?.role ?? 'KEIN PROFIL'}
        </span>
        {!isAdmin && (
          <p style={{ color: '#E86B5A', marginTop: 8 }}>
            ❌ Noch nicht super_admin — kopiere deine ID oben und führe das SQL unten aus.
          </p>
        )}
        {isAdmin && (
          <p style={{ color: '#8BB06A', marginTop: 8 }}>✅ Korrekt! Bitte komplett ausloggen und neu einloggen.</p>
        )}
      </div>

      {userId && (
        <div style={{ marginTop: 32 }}>
          <p style={{ color: '#E5B84C' }}>SQL für Supabase SQL Editor (deine ID ist bereits eingetragen):</p>
          <pre style={{ ...pre, color: '#8BB06A', lineHeight: 1.6 }}>
{`-- SCHRITT 1: Enum erweitern
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- SCHRITT 2: Rolle setzen
UPDATE profiles
SET role = 'super_admin', onboarding_completed = true
WHERE id = '${userId}';

-- SCHRITT 3: Prüfen
SELECT id, role, onboarding_completed
FROM profiles
WHERE id = '${userId}';`}
          </pre>
        </div>
      )}
    </div>
  )
}
