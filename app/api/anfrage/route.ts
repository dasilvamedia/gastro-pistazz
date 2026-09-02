/**
 * POST /api/anfrage
 * Nimmt Restaurant-Bewerbungen vom öffentlichen Formular entgegen.
 * Speichert in leads-Tabelle + sendet E-Mails (Admin + Bewerber).
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import nodemailer from 'nodemailer'

const schema = z.object({
  name:        z.string().min(2).max(120),
  email:       z.string().email(),
  telefon:     z.string().min(6).max(50),
  betriebsart: z.string().min(2).max(80),
  stadt:       z.string().min(2).max(80),
  groesse:     z.string().max(50).optional(),
  mitarbeiter: z.string().max(30).optional(),
  website:     z.string().url().optional().or(z.literal('')),
  notizen:     z.string().max(1000).optional(),
})

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   ?? 'w01c832d.kasserver.com',
  port:   Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER ?? 'w01c832d',
    pass: process.env.SMTP_PASS,
  },
  tls: { rejectUnauthorized: true },
})

function formatDate() {
  return new Date().toLocaleString('de-DE', {
    timeZone:  'Europe/Berlin',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validierung fehlgeschlagen', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const d = parsed.data
    const now = formatDate()

    // ── Supabase Insert (admin client — bypasses RLS) ──────────────────────
    const admin = createAdminClient()
    const { data: lead, error: dbErr } = await admin
      .from('leads')
      .insert({
        name:        d.name,
        email:       d.email,
        telefon:     d.telefon,
        typ:         d.betriebsart,
        stadt:       d.stadt,
        groesse:     d.groesse   || null,
        mitarbeiter: d.mitarbeiter || null,
        website:     d.website   || null,
        notizen:     d.notizen   || null,
        herkunft:    'website',
        status:      'neu',
        match_rating: 3,
      })
      .select('id')
      .single()

    if (dbErr) {
      console.error('Anfrage DB-Fehler:', dbErr)
      // Trotzdem E-Mails versuchen
    }

    // ── E-Mail an Admin ────────────────────────────────────────────────────
    const adminMail = transporter.sendMail({
      from:    `"pistazz.io" <${process.env.SMTP_FROM ?? 'info@pistazz.io'}>`,
      to:      'info@pistazz.io',
      subject: `🏪 Neue Restaurant-Anfrage: ${d.name} (${d.betriebsart}, ${d.stadt})`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:12px;">
          <div style="background:#8BB06A;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
            <h1 style="color:#fff;margin:0;font-size:20px;">🏪 Neue Anfrage auf pistazz.io</h1>
            <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">${now}</p>
          </div>

          <table style="width:100%;border-collapse:collapse;font-size:14px;color:#1C1F1A;">
            <tr style="background:#fff;border-radius:6px;">
              <td style="padding:10px 12px;color:#6b7280;width:150px;border-bottom:1px solid #f3f4f6;">Name</td>
              <td style="padding:10px 12px;font-weight:600;border-bottom:1px solid #f3f4f6;">${d.name}</td>
            </tr>
            <tr>
              <td style="padding:10px 12px;color:#6b7280;border-bottom:1px solid #f3f4f6;">E-Mail</td>
              <td style="padding:10px 12px;font-weight:600;border-bottom:1px solid #f3f4f6;"><a href="mailto:${d.email}" style="color:#8BB06A;">${d.email}</a></td>
            </tr>
            <tr style="background:#fff;">
              <td style="padding:10px 12px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Telefon</td>
              <td style="padding:10px 12px;font-weight:600;border-bottom:1px solid #f3f4f6;"><a href="tel:${d.telefon}" style="color:#8BB06A;">${d.telefon}</a></td>
            </tr>
            <tr>
              <td style="padding:10px 12px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Betriebsart</td>
              <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;">${d.betriebsart}</td>
            </tr>
            <tr style="background:#fff;">
              <td style="padding:10px 12px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Stadt</td>
              <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;">${d.stadt}</td>
            </tr>
            ${d.groesse ? `<tr><td style="padding:10px 12px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Größe</td><td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;">${d.groesse}</td></tr>` : ''}
            ${d.mitarbeiter ? `<tr style="background:#fff;"><td style="padding:10px 12px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Mitarbeiter</td><td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;">${d.mitarbeiter}</td></tr>` : ''}
            ${d.website ? `<tr><td style="padding:10px 12px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Webseite</td><td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;"><a href="${d.website}" style="color:#8BB06A;">${d.website}</a></td></tr>` : ''}
            ${d.notizen ? `<tr style="background:#fff;"><td style="padding:10px 12px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Notizen</td><td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;">${d.notizen}</td></tr>` : ''}
          </table>

          ${lead?.id ? `
          <div style="margin-top:20px;text-align:center;">
            <a href="https://gastro.pistazz.io/admin/leads/${lead.id}"
               style="display:inline-block;background:#8BB06A;color:#fff;font-weight:700;padding:12px 28px;border-radius:999px;text-decoration:none;font-size:14px;">
              Im CRM öffnen →
            </a>
          </div>` : ''}

          <div style="margin-top:20px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;">
            pistazz.io · automatische Benachrichtigung · Quelle: Website-Formular
          </div>
        </div>
      `,
    })

    // ── Bestätigungs-E-Mail an Bewerber ────────────────────────────────────
    const applicantMail = transporter.sendMail({
      from:    `"pistazz.io" <${process.env.SMTP_FROM ?? 'info@pistazz.io'}>`,
      to:      d.email,
      subject: `✅ Deine Anfrage bei pistazz.io ist eingegangen`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:12px;">
          <div style="background:#1C1F1A;border-radius:8px;padding:20px;margin-bottom:20px;text-align:center;">
            <h1 style="color:#8BB06A;margin:0;font-size:22px;font-family:Georgia,serif;">pistazz.io</h1>
            <p style="color:rgba(255,255,255,0.6);margin:6px 0 0;font-size:13px;">Social Loyalty für Gastronomie</p>
          </div>

          <p style="font-size:16px;color:#1C1F1A;font-weight:600;">Hallo ${d.name},</p>
          <p style="font-size:14px;color:#4b5563;line-height:1.6;">
            vielen Dank für deine Anfrage! Wir haben alles erhalten und melden uns innerhalb von
            <strong>24-48 Stunden</strong> bei dir, persönlich und nicht automatisiert.
          </p>

          <div style="background:#EEF5E6;border-radius:10px;padding:16px 20px;margin:20px 0;border-left:4px solid #8BB06A;">
            <p style="margin:0;font-size:13px;color:#3d5a27;font-weight:600;">📋 Deine Angaben</p>
            <table style="width:100%;margin-top:10px;font-size:13px;color:#1C1F1A;">
              <tr><td style="color:#6b7280;padding:3px 0;width:130px;">Betriebsart</td><td style="font-weight:500;">${d.betriebsart}</td></tr>
              <tr><td style="color:#6b7280;padding:3px 0;">Stadt</td><td style="font-weight:500;">${d.stadt}</td></tr>
              ${d.groesse ? `<tr><td style="color:#6b7280;padding:3px 0;">Größe</td><td style="font-weight:500;">${d.groesse}</td></tr>` : ''}
            </table>
          </div>

          <p style="font-size:14px;color:#4b5563;line-height:1.6;">
            In der Zwischenzeit kannst du dir unsere Plattform schon einmal ansehen:
          </p>

          <div style="text-align:center;margin:24px 0;">
            <a href="https://pistazz.io"
               style="display:inline-block;background:#8BB06A;color:#fff;font-weight:700;padding:12px 28px;border-radius:999px;text-decoration:none;font-size:14px;">
              pistazz.io entdecken →
            </a>
          </div>

          <p style="font-size:13px;color:#9ca3af;text-align:center;">
            Bei Fragen erreichst du uns unter <a href="mailto:info@pistazz.io" style="color:#8BB06A;">info@pistazz.io</a>
          </p>

          <div style="margin-top:20px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;text-align:center;">
            pistazz.io · Social Loyalty Platform · Automatische Bestätigung
          </div>
        </div>
      `,
    })

    // Beide E-Mails parallel senden (Fehler ignorieren — DB-Eintrag ist das Wichtige)
    await Promise.allSettled([adminMail, applicantMail])

    return NextResponse.json({ ok: true, id: lead?.id ?? null }, { status: 201 })
  } catch (err) {
    console.error('POST /api/anfrage error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
