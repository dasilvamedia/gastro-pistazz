import Link from 'next/link'

export const metadata = {
  title: 'Impressum | gastro.pistazz.io',
  description: 'Impressum der gastro.pistazz.io Gastro-Marketing-Plattform',
}

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/" className="text-[#6D9450] text-sm mb-8 inline-block">← Zurück</Link>

        <h1 className="text-3xl font-bold text-[#1C1F1A] mb-2">Impressum</h1>
        <p className="text-gray-500 text-sm mb-10">Angaben gemäß § 5 DDG</p>

        <div className="space-y-8 text-[#1C1F1A]/80 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-[#1C1F1A] mb-3">Anbieter</h2>
            <p>
              <strong>Marcio Da Silva</strong><br />
              Filderweg 21<br />
              73460 Hüttlingen<br />
              Deutschland
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1C1F1A] mb-3">Kontakt</h2>
            <p>
              E-Mail: <a href="mailto:dasilvamedias@gmail.com" className="text-[#6D9450] underline">dasilvamedias@gmail.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1C1F1A] mb-3">Verantwortlich für den Inhalt</h2>
            <p>
              Marcio Da Silva (Anschrift wie oben)<br />
              Verantwortlicher im Sinne von § 18 Abs. 2 MStV
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1C1F1A] mb-3">Streitbeilegung</h2>
            <p>
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
              <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-[#6D9450] underline">
                https://ec.europa.eu/consumers/odr/
              </a><br />
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
              Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1C1F1A] mb-3">Haftung für Inhalte</h2>
            <p>
              Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten nach den allgemeinen
              Gesetzen verantwortlich. Für fremde Inhalte, die von Nutzern oder Restaurantpartnern
              eingestellt werden, übernehmen wir keine Gewähr. Bei Bekanntwerden von Rechtsverletzungen
              entfernen wir diese Inhalte umgehend.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1C1F1A] mb-3">Markenhinweis</h2>
            <p>
              Instagram ist eine Marke der Meta Platforms, Inc. gastro.pistazz.io steht in keiner
              Verbindung zu Meta Platforms, Inc. und wird von dieser weder unterstützt noch gesponsert.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
