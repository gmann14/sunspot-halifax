import type { Metadata, Viewport } from 'next'
import { ToastProvider } from '@/components/Toast'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'SunSpot Halifax — Find Sunny Patios',
    template: '%s | SunSpot Halifax',
  },
  description:
    'Find which Halifax patios are in sunlight right now. Real-time sun predictions for restaurants, bars, cafes, and breweries in downtown Halifax.',
  metadataBase: new URL('https://sunspot-halifax.vercel.app'),
  openGraph: {
    title: 'SunSpot Halifax — Find Sunny Patios',
    description:
      'Find which Halifax patios are in sunlight right now. Real-time sun predictions for downtown Halifax.',
    type: 'website',
    locale: 'en_CA',
    siteName: 'SunSpot Halifax',
    images: [
      {
        url: '/api/og?title=SunSpot%20Halifax&status=Find%20sunny%20patios%20right%20now',
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SunSpot Halifax',
    description: 'Find sunny patios in Halifax right now.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#F59E0B',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.css"
          rel="stylesheet"
        />
      </head>
      <body className="bg-white text-gray-900 antialiased">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
