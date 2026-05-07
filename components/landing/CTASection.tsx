import Link from 'next/link'

export function CTASection() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="gradient-primary rounded-3xl p-12 md:p-16 text-center shadow-xl">
          <h2
            className="text-3xl md:text-4xl text-white mb-4"
            style={{ fontFamily: 'DM Serif Display, serif' }}
          >
            Bereit, deine Gäste für dich arbeiten zu lassen? 🚀
          </h2>
          <p className="text-white/80 text-lg mb-8 max-w-lg mx-auto">
            Starte jetzt kostenlos – keine Kreditkarte nötig.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-[#8BB06A] font-bold px-8 py-4 rounded-full hover:shadow-lg hover:scale-105 transition-all duration-200"
          >
            Los geht&apos;s 🫶🏽
          </Link>
        </div>
      </div>
    </section>
  )
}
