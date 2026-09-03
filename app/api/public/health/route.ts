import { NextResponse } from 'next/server'

// Health-Check fuer Load-Balancer, Uptime-Monitor und den Umzugs-Smoke-Test.
export function GET() {
  return NextResponse.json({ ok: true, at: new Date().toISOString(), pid: process.pid })
}
