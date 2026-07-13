import Link from 'next/link'

export const metadata = {
  title: 'Datenschutzerklärung | gastro.pistazz.io',
  description: 'Datenschutzerklärung der gastro.pistazz.io Gastro-Marketing-Plattform',
}

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/" className="text-[#6D9450] text-sm mb-8 inline-block">← Zurück</Link>

        <h1 className="text-3xl font-bold text-[#1C1F1A] mb-2">Datenschutzerklärung</h1>
        <p className="text-gray-500 text-sm mb-10">Stand: Juli 2026</p>

        <div className="space-y-8 text-[#1C1F1A]/80 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-[#1C1F1A] mb-3">1. Verantwortlicher</h2>
            <p>
              Verantwortlich für die Datenverarbeitung auf dieser Plattform ist:<br />
              <strong>Marcio Da Silva</strong><br />
              Filderweg 21, 73460 Hüttlingen, Deutschland<br />
              E-Mail: dasilvamedias@gmail.com
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1C1F1A] mb-3">2. Welche Daten wir erheben</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>E-Mail-Adresse (bei Registrierung)</li>
              <li>Name und Profilbild (optional, aus Social-Login)</li>
              <li>Instagram-Handle (freiwillig, für Story-Verifizierung)</li>
              <li>Eingereichte Inhalte (Story-URLs, Screenshots, Kassenbons)</li>
              <li>Punkte-Transaktionen und Deal-Einlösungen</li>
              <li>Restaurantbesuche (QR-Scan-Zeitpunkt)</li>
              <li>Technische Daten (IP-Adresse, Geräteinformationen)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1C1F1A] mb-3">3. Zweck der Verarbeitung</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Betrieb der Loyalty-Plattform (Punkte sammeln, Deals einlösen)</li>
              <li>Verifizierung von Instagram-Stories durch KI-Analyse</li>
              <li>Benachrichtigungen über Punkte und Angebote</li>
              <li>Auswertungen für Restaurantpartner (anonymisiert oder aggregiert)</li>
            </ul>
            <p className="mt-2">Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) und lit. f DSGVO (berechtigte Interessen).</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1C1F1A] mb-3">4. Datenweitergabe</h2>
            <p>Wir geben Daten nur weiter an:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Supabase Inc.</strong> (Datenbank &amp; Authentifizierung, USA), Datenverarbeitungsvertrag geschlossen</li>
              <li><strong>Anthropic PBC</strong> (KI-Analyse von Screenshots, USA), keine dauerhafte Speicherung</li>
              <li>Restaurantpartner erhalten nur aggregierte Statistiken, keine persönlichen Daten ohne Einwilligung</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1C1F1A] mb-3">5. Speicherdauer</h2>
            <p>
              Kontodaten werden gespeichert solange du ein aktives Konto hast.
              Eingereichte Inhalte (Screenshots, Kassenbons) werden nach 90 Tagen automatisch gelöscht.
              Punkte-Transaktionen werden für 3 Jahre gespeichert (steuerrechtliche Aufbewahrungspflichten).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1C1F1A] mb-3">6. Deine Rechte</h2>
            <p>Du hast das Recht auf:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Auskunft über deine gespeicherten Daten (Art. 15 DSGVO)</li>
              <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
              <li>Löschung deiner Daten (Art. 17 DSGVO)</li>
              <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
              <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
              <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
            </ul>
            <p className="mt-2">
              Für Anfragen: <a href="mailto:dasilvamedias@gmail.com" className="text-[#6D9450] underline">dasilvamedias@gmail.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1C1F1A] mb-3">7. Cookies</h2>
            <p>
              Wir verwenden technisch notwendige Cookies für die Authentifizierung (Session-Cookie).
              Keine Tracking- oder Werbe-Cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1C1F1A] mb-3">8. Beschwerderecht</h2>
            <p>
              Du hast das Recht, dich bei der zuständigen Datenschutzaufsichtsbehörde zu beschweren.
              Für Baden-Württemberg: Landesbeauftragter für den Datenschutz und die Informationsfreiheit Baden-Württemberg,
              Lautenschlagerstraße 20, 70173 Stuttgart.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
