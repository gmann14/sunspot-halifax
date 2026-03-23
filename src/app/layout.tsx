import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SunSpot Halifax — Find Sunny Patios',
  description:
    'Find which Halifax patios are in sunlight right now. Real-time sun predictions for restaurants, bars, cafes, and breweries in downtown Halifax.',
  openGraph: {
    title: 'SunSpot Halifax — Find Sunny Patios',
    description:
      'Find which Halifax patios are in sunlight right now. Real-time sun predictions for downtown Halifax.',
    type: 'website',
    locale: 'en_CA',
    siteName: 'SunSpot Halifax',
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
        {children}
      </body>
    </html>
  )
}
