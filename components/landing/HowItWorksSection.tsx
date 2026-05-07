'use client'

const steps = [
  {
    number: '01',
    icon: '📱',
    title: 'QR-Code scannen',
    description: 'Gast scannt den Tisch-QR-Code – die Story-App öffnet sich sofort im Browser, ohne App-Download.',
  },
  {
    number: '02',
    icon: '📸',
    title: 'Story / Reel / Bewertung posten',
    description: 'Gast postet eine Story, ein Reel oder eine Google-Bewertung. Unsere KI prüft automatisch.',
  },
  {
    number: '03',
    icon: '💰',
    title: 'Deal kassieren & Punkte sammeln',
    description: 'Punkte werden gutgeschrieben, Deals freigeschaltet. Stempelkarte wird digital gestempelt.',
  },
]

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 px-6 bg-[#EEF5E6]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-[#8BB06A] font-semibold text-sm uppercase tracking-widest">Wie es funktioniert</span>
          <h2
            className="text-3xl md:text-4xl text-[#1C1F1A] mt-3"
            style={{ fontFamily: 'DM Serif Display, serif' }}
          >
            So funktioniert&apos;s
          </h2>
          <p className="text-[#1C1F1A]/60 mt-3 max-w-xl mx-auto">
            In drei einfachen Schritten verwandelst du jeden Gast in einen Markenbotschafter.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className="bg-white rounded-3xl p-8 shadow-sm border border-[#D4E8C2] relative overflow-hidden hover:shadow-md transition-shadow"
            >
              <span
                className="absolute top-4 right-6 text-6xl font-bold text-[#8BB06A]/10 select-none"
                style={{ fontFamily: 'DM Serif Display, serif' }}
              >
                {step.number}
              </span>
              <div className="text-4xl mb-4">{step.icon}</div>
              <h3
                className="text-xl text-[#1C1F1A] mb-3"
                style={{ fontFamily: 'DM Serif Display, serif' }}
              >
                {step.title}
              </h3>
              <p className="text-[#1C1F1A]/60 text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
