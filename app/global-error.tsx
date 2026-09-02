'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    fetch('/api/log-client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: error.message, stack: error.stack, digest: error.digest }),
    }).catch(() => {})
  }, [error])

  return (
    <html>
      <body style={{ fontFamily: 'monospace', padding: 24 }}>
        <h2 style={{ color: 'red' }}>Globaler Fehler, bitte Screenshot senden</h2>
        <pre style={{ background: '#fee', padding: 16, borderRadius: 8, fontSize: 11, whiteSpace: 'pre-wrap', overflow: 'auto' }}>
          {error.message}
          {'\n\n'}
          {error.stack}
        </pre>
        <button onClick={reset} style={{ marginTop: 16, padding: '8px 16px' }}>Nochmal versuchen</button>
      </body>
    </html>
  )
}
