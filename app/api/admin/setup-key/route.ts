import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeFileSync, readFileSync } from 'fs'
import { execSync } from 'child_process'
import path from 'path'

export async function POST(request: NextRequest) {
  // Only allow super_admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  const { data: role } = await supabase.rpc('get_my_role')
  if (role !== 'super_admin' && role !== 'admin') {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
  }

  const { service_role_key } = await request.json()
  if (!service_role_key || !service_role_key.startsWith('eyJ')) {
    return NextResponse.json({ error: 'Ungültiger Key (muss mit eyJ... beginnen)' }, { status: 400 })
  }

  try {
    const envPath = path.join(process.cwd(), '.env.local')
    let content = readFileSync(envPath, 'utf8')

    if (content.includes('SUPABASE_SERVICE_ROLE_KEY=')) {
      content = content.replace(/SUPABASE_SERVICE_ROLE_KEY=.*/g, `SUPABASE_SERVICE_ROLE_KEY=${service_role_key}`)
    } else {
      content += `\nSUPABASE_SERVICE_ROLE_KEY=${service_role_key}\n`
    }

    writeFileSync(envPath, content, 'utf8')

    // Restart service
    execSync('sudo systemctl restart gastro-pistazz', { timeout: 10000 })

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
