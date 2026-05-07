'use client'

const features = [
  {
    icon: '🃏',
    title: 'Stempelkarten',
    description: 'Digital, ohne App-Download. Gäste sammeln Stempel per QR-Scan – einfach und intuitiv.',
  },
  {
    icon: '📸',
    title: 'Social Media Loyalty',
    description: 'Story, Reel, Post automatisch belohnen. Deine Gäste werden zu organischen Markenbotschaftern.',
  },
  {
    icon: '👥',
    title: 'CRM',
    description: 'Vollständige Kundendatenbank mit Besuchshistorie, Punktestand und Verhalten auf einen Blick.',
  },
  {
    icon: '💬',
    title: 'Direktnachrichten',
    description: 'In-App, E-Mail oder WhatsApp. Erreiche deine Gäste dort, wo sie sind.',
  },
  {
    icon: '🎰',
    title: 'Gewinnspiele',
    description: 'Mehr Engagement, mehr Spaß. Starte Gewinnspiele und steigere die Interaktionsrate deutlich.',
  },
  {
    icon: '🤖',
    title: 'KI-Prüfung',
    description: 'Automatische Story-Verifizierung durch KI. Kein manueller Aufwand, volle Verlässlichkeit.',
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-6 bg-[#1C1F1A]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-[#8BB06A] font-semibold text-sm uppercase tracking-widest">Features</span>
          <h2
            className="text-3xl md:text-4xl text-white mt-3"
            style={{ fontFamily: 'DM Serif Display, serif' }}
          >
            Alles was du brauchst
          </h2>
          <p className="text-white/50 mt-3 max-w-xl mx-auto">
            Eine Plattform. Alle Werkzeuge. Mehr Gäste, mehr Reichweite, mehr Umsatz.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="glass-dark rounded-2xl p-6 group cursor-default hover:scale-[1.02] transition-transform duration-200"
            >
              <div className="text-3xl mb-4 group-hover:scale-110 transition-transform duration-200 inline-block">
                {feature.icon}
              </div>
              <h3
                className="text-white text-lg mb-2"
                style={{ fontFamily: 'DM Serif Display, serif' }}
              >
                {feature.title}
              </h3>
              <p className="text-white/50 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
