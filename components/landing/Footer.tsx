import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-[#1C1F1A] text-white/50 py-12 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-baseline gap-0">
          <span
            className="text-lg font-bold text-[#8BB06A]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            pistazz
          </span>
          <span
            className="text-lg font-bold text-white/30"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            .io
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">So funktionierts</a>
          <a href="#preise" className="hover:text-white transition-colors">Preise</a>
          <Link href="/datenschutz" className="hover:text-white transition-colors">Datenschutz</Link>
          <Link href="/impressum" className="hover:text-white transition-colors">Impressum</Link>
        </div>

        <p className="text-xs text-white/30">
          Powered by pistazz.io &copy; {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  )
}
