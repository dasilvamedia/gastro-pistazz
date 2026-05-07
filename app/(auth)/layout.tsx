import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen gradient-primary flex flex-col items-center justify-center p-4">
      <Link href="/" className="mb-8 flex items-center gap-0.5">
        <span
          className="text-2xl font-bold text-white"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          pistazz
        </span>
        <span
          className="text-2xl font-bold text-white/60"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          .io
        </span>
      </Link>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
        {children}
      </div>
    </div>
  )
}
