'use client'

import { useEffect } from 'react'

export default function AdminError({
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
    <div style={{ padding: 24, fontFamily: 'monospace', maxWidth: 900 }}>
      <h2 style={{ color: 'red' }}>Admin-Fehler — bitte Screenshot senden</h2>
      <pre style={{ background: '#fee', padding: 16, borderRadius: 8, fontSize: 11, whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
        {error.message}
        {'\n\n'}
        {error.stack}
      </pre>
      <button onClick={reset} style={{ marginTop: 16, padding: '8px 16px' }}>Nochmal versuchen</button>
    </div>
  )
}
