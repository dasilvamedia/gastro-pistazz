// PM2-compatible Next.js 16 server wrapper
// In Next.js 16 the httpServer option transfers ownership to next-server —
// it calls server.listen() internally, so we must NOT call it ourselves.
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const port = parseInt(process.env.PORT || '3003', 10)

// Create the HTTP server first and pass it to next() (Next.js 16 pattern)
const server = createServer()

const app = next({
  dev: false,
  port,
  httpServer: server,
})
const handle = app.getRequestHandler()

app.prepare().then(() => {
  server.on('request', (req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  })

  // next-server already called server.listen(port) internally — do NOT call it again.
  // Signal PM2 ready once the server emits 'listening'.
  if (server.listening) {
    console.log(`> gastro-pistazz ready on http://localhost:${port}`)
    if (process.send) process.send('ready')
  } else {
    server.once('listening', () => {
      console.log(`> gastro-pistazz ready on http://localhost:${port}`)
      if (process.send) process.send('ready')
    })
  }

  // ── Graceful shutdown ──────────────────────────────────────────
  function shutdown(signal) {
    console.log(`> Received ${signal} — shutting down gastro-pistazz...`)
    server.close(() => {
      console.log('> HTTP server closed, port released')
      process.exit(0)
    })
    // Force exit after 8 s if close hangs
    setTimeout(() => {
      console.warn('> Force exit after timeout')
      process.exit(1)
    }, 8000).unref()
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT',  () => shutdown('SIGINT'))
})
