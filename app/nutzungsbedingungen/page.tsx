import Link from 'next/link'

export const metadata = {
  title: 'Nutzungsbedingungen | gastro.pistazz.io',
  description: 'Nutzungsbedingungen der gastro.pistazz.io Gastro-Marketing-Plattform',
}

export default function NutzungsbedingungenPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/" className="text-[#6D9450] text-sm mb-8 inline-block">← Zurück</Link>

        <h1 className="text-3xl font-bold text-[#1C1F1A] mb-2">Nutzungsbedingungen</h1>
        <p className="text-gray-500 text-sm mb-10">Stand: August 2026</p>

        <div className="space-y-8 text-[#1C1F1A]/80 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-[#1C1F1A] mb-3">1. Geltungsbereich</h2>
            <p>
              Diese Nutzungsbedingungen gelten für die Nutzung der Plattform gastro.pistazz.io
              (Web-App und mobile Apps), betrieben von Marcio Da Silva, Filderweg 21, 73460 Hüttlingen
              (siehe <Link href="/impressum" className="text-[#6D9450] underline">Impressum</Link>).
              Mit der Registrierung akzeptierst du diese Bedingungen.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1C1F1A] mb-3">2. Mindestalter</h2>
            <p>
              Die Nutzung der Plattform ist ab einem Alter von <strong>14 Jahren</strong> erlaubt.
              Minderjährige benötigen die Zustimmung eines Erziehungsberechtigten.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1C1F1A] mb-3">3. Leistungsbeschreibung</h2>
            <p>
              gastro.pistazz.io ist eine Loyalty-Plattform für die Gastronomie. Nutzer können bei
              teilnehmenden Restaurants Punkte sammeln (z. B. durch Besuche oder das Teilen von
              Instagram-Stories), Stempelkarten füllen und Deals einlösen. Der Umfang der Vorteile
              wird vom jeweiligen Restaurantpartner festgelegt.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1C1F1A] mb-3">4. Punkte und Deals</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Punkte haben keinen Geldwert und sind nicht übertragbar oder auszahlbar.</li>
              <li>Punkte werden nur für verifizierte Aktionen vergeben (z. B. bestätigte Story mit den erforderlichen Markierungen, bestätigter Besuch).</li>
              <li>Deals sind nur beim jeweiligen Restaurantpartner und im angegebenen Zeitraum einlösbar.</li>
              <li>Bei Missbrauch (z. B. gefälschte Nachweise, Mehrfachkonten) können Punkte aberkannt und Konten gesperrt werden.</li>
              <li>Restaurantpartner können ihre Angebote jederzeit ändern oder beenden.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1C1F1A] mb-3">5. Instagram-Stories</h2>
            <p>
              Für Punkte durch Stories ist erforderlich, dass die Story tatsächlich veröffentlicht
              wurde und die erforderlichen Markierungen enthält. Die Prüfung erfolgt teilweise
              automatisiert (KI-gestützt). Es besteht kein Anspruch auf Punktevergabe, wenn die
              Voraussetzungen nicht erfüllt oder nicht nachweisbar sind. Instagram ist eine Marke der
              Meta Platforms, Inc.; die Plattform steht in keiner Verbindung zu Meta.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1C1F1A] mb-3">6. Pflichten der Nutzer</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Wahrheitsgemäße Angaben bei der Registrierung</li>
              <li>Keine Weitergabe der Zugangsdaten an Dritte</li>
              <li>Keine rechtswidrigen, beleidigenden oder täuschenden Inhalte</li>
              <li>Keine technische Manipulation der Plattform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1C1F1A] mb-3">7. Konto und Kündigung</h2>
            <p>
              Du kannst dein Konto jederzeit in den Einstellungen löschen. Wir können Konten bei
              Verstößen gegen diese Bedingungen sperren oder löschen. Mit der Löschung verfallen
              gesammelte Punkte ersatzlos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1C1F1A] mb-3">8. Haftung</h2>
            <p>
              Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei Verletzung von
              Leben, Körper und Gesundheit. Bei einfacher Fahrlässigkeit haften wir nur für die
              Verletzung wesentlicher Vertragspflichten, begrenzt auf den vorhersehbaren,
              vertragstypischen Schaden. Für die Angebote und Leistungen der Restaurantpartner sind
              ausschließlich diese verantwortlich.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1C1F1A] mb-3">9. Änderungen</h2>
            <p>
              Wir können diese Bedingungen mit Wirkung für die Zukunft ändern. Über wesentliche
              Änderungen informieren wir dich rechtzeitig per E-Mail oder in der App. Widersprichst du
              nicht innerhalb von 30 Tagen, gelten die Änderungen als angenommen.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1C1F1A] mb-3">10. Schlussbestimmungen</h2>
            <p>
              Es gilt deutsches Recht. Sollten einzelne Bestimmungen unwirksam sein, bleibt die
              Wirksamkeit der übrigen Bestimmungen unberührt. Datenschutzinformationen findest du in
              der <Link href="/datenschutz" className="text-[#6D9450] underline">Datenschutzerklärung</Link>.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
