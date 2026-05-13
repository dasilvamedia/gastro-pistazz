import { LangProvider } from '@/lib/lang-context'

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <LangProvider>{children}</LangProvider>
}
