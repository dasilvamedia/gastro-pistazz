import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

// All-Inkl SMTP (w01c832d)
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST ?? 'w01c832d.kasserver.com',
  port:   Number(process.env.SMTP_PORT ?? 587),
  secure: false,           // STARTTLS auf Port 587
  auth: {
    user: process.env.SMTP_USER ?? 'w01c832d',
    pass: process.env.SMTP_PASS,
  },
  tls: { rejectUnauthorized: true },
})

export async function POST(request: NextRequest) {
  try {
    // Einfache interne Absicherung
    const secret = request.headers.get('x-internal-secret')
    const expectedSecret = process.env.INTERNAL_NOTIFY_SECRET
    if (!expectedSecret || secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email, name, method } = await request.json() as {
      email:  string
      name:   string | null
      method: string
    }

    const methodLabel: Record<string, string> = {
      email:  '📧 E-Mail & Passwort',
      google: '🟦 Google',
      apple:  '🍎 Apple',
    }

    const now = new Date().toLocaleString('de-DE', {
      timeZone:  'Europe/Berlin',
      dateStyle: 'medium',
      timeStyle: 'short',
    })

    await transporter.sendMail({
      from:    `"pistazz" <${process.env.SMTP_FROM ?? 'info@pistazz.io'}>`,
      to:      'info@pistazz.io',
      subject: `🎉 Neuer User: ${name ?? email}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:12px;">
          <div style="background:#8BB06A;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
            <h1 style="color:#fff;margin:0;font-size:20px;">🌿 Neuer Nutzer bei pistazz</h1>
          </div>

          <table style="width:100%;border-collapse:collapse;font-size:14px;color:#1C1F1A;">
            <tr>
              <td style="padding:8px 0;color:#666;width:120px;">Name</td>
              <td style="padding:8px 0;font-weight:600;">${name ?? '—'}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#666;">E-Mail</td>
              <td style="padding:8px 0;font-weight:600;">${email}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#666;">Anmeldung via</td>
              <td style="padding:8px 0;">${methodLabel[method] ?? method}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#666;">Zeitpunkt</td>
              <td style="padding:8px 0;">${now}</td>
            </tr>
          </table>

          <div style="margin-top:20px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;">
            gastro.pistazz.io · automatische Benachrichtigung
          </div>
        </div>
      `,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    // Nicht-kritisch — User wurde trotzdem angelegt
    console.error('POST /api/notify/new-user error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
