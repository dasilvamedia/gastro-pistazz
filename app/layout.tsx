import type { Metadata, Viewport } from 'next'
import { DM_Sans, DM_Serif_Display, Instrument_Serif, DM_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'
import NativeAuthHandler from '@/components/NativeAuthHandler'
import ThemeApplier from '@/components/ThemeApplier'
import Script from 'next/script'

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

// Redaktionelle Landing-Sektionen (V2-Design)
const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-instrument',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
  display: 'swap',
})

// Verhindert iOS-Autozoom bei Eingabefeldern und horizontales Wandern der App
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#6D9450',
}

export const metadata: Metadata = {
  title: {
    default: 'Gastro | pistazz.io - Mehr Stammgäste durch Social-Media-Loyalty',
    template: '%s | pistazz.io',
  },
  description:
    'Digitale Stempelkarten, Social-Media-Loyalty und Gäste-CRM in einer Plattform. Deine Gäste posten, sammeln Punkte und kommen wieder. Für Restaurants, Bars, Cafés und mehr.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'gastro.pistazz.io',
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
    <html lang="de" className={`${dmSans.variable} ${dmSerifDisplay.variable} ${instrumentSerif.variable} ${dmMono.variable}`}>
      <body className="font-sans bg-pale text-charcoal antialiased">
        {/* Blockierend VOR dem ersten Paint: verhindert den weissen Blitz,
            bevor der Dark Mode greift (ThemeApplier uebernimmt danach live) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('display-theme');var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light'}catch(e){}`,
          }}
        />
        <Script id="app-entry-redirect" strategy="beforeInteractive">{`
          if (typeof window !== 'undefined' && window.Capacitor && location.pathname === '/') {
            location.replace('/home');
          }
        `}</Script>
        <ThemeApplier />
        <NativeAuthHandler />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
