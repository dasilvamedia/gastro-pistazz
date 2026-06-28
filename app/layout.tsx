import type { Metadata } from 'next'
import { DM_Sans, DM_Serif_Display } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const dmSerifDisplay = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-dm-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Pistazz',
  description: 'Dein Loyalty-Erlebnis für Gastronomie',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Pistazz',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#6D9450',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" className={`${dmSans.variable} ${dmSerifDisplay.variable}`}>
      <body className="font-sans bg-pale text-charcoal antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
