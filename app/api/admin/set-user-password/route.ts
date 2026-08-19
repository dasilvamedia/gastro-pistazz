import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

// Superadmin-Werkzeug: setzt ein neues Zugangs-Passwort fuer einen Nutzer
// und gibt es einmalig zurueck (Klartext-Passwoerter existieren nicht,
// Supabase speichert ausschliesslich Hashes).
export async function POST(req: NextRequest) {
  try {
    const supa = await createServerClient()
    const { data: { user } } = await supa.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )
    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'userId fehlt' }, { status: 400 })

    // Merkbares, sicheres Passwort erzeugen
    const words = ['Minze', 'Pesto', 'Limone', 'Salbei', 'Oliva', 'Basil', 'Cocoa', 'Mango']
    const pw = `${words[Math.floor(Math.random() * words.length)]}-${Math.random().toString(36).slice(2, 8)}-${Math.floor(Math.random() * 90 + 10)}`

    const { error } = await admin.auth.admin.updateUserById(userId, { password: pw })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ password: pw })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
