import { NextResponse } from 'next/server'

// Universal Links: JEDE gastro.pistazz.io-URL (NFC-Tag, geteilter Link,
// QR-Code, OAuth-Redirect) oeffnet die installierte App statt Safari. Vorher
// war nur /auth/callback* freigegeben - alle anderen Links (Stempel, Story,
// Restaurant) landeten im Browser. paths:["*"] deckt alles ab; die
// In-WebView-Navigation der App selbst ist davon nicht betroffen (Universal
// Links greifen nur bei Aufrufen von AUSSERHALB der App).
export function GET() {
  return NextResponse.json(
    {
      applinks: {
        apps: [],
        details: [
          {
            appID: '33SPWG2R8C.io.pistazz.gastro',
            paths: ['*'],
          },
        ],
      },
    },
    {
      headers: {
        'Content-Type': 'application/json',
        // iOS soll die Datei nicht ewig cachen, damit Aenderungen zuegig greifen
        'Cache-Control': 'public, max-age=3600',
      },
    }
  )
}
