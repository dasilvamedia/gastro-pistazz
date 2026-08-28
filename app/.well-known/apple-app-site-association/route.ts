import { NextResponse } from 'next/server'

// Universal Link: laesst Safari nach dem OAuth-Redirect (Google/Apple ueber
// Supabase) direkt in die native App zurueckspringen statt in Safari haengen
// zu bleiben. Ohne das landet der Login-Callback in einer isolierten
// Safari-Session, die die Capacitor-WebView nie erreicht.
export function GET() {
  return NextResponse.json(
    {
      applinks: {
        apps: [],
        details: [
          {
            appID: '33SPWG2R8C.io.pistazz.gastro',
            paths: ['/auth/callback*'],
          },
        ],
      },
    },
    { headers: { 'Content-Type': 'application/json' } }
  )
}
