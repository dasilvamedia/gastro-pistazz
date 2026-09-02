'use client'

import { useEffect } from 'react'

export default function DashboardError({
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
    <div style={{ padding: 24, fontFamily: 'monospace' }}>
      <h2 style={{ color: 'red' }}>Dashboard-Fehler, bitte Screenshot senden</h2>
      <pre style={{ background: '#fee', padding: 16, borderRadius: 8, fontSize: 12, whiteSpace: 'pre-wrap' }}>
        {error.message}
        {'\n\n'}
        {error.stack}
      </pre>
      <button onClick={reset} style={{ marginTop: 16, padding: '8px 16px' }}>Nochmal versuchen</button>
    </div>
  )
}
