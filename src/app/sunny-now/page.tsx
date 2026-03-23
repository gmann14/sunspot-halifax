import type { Metadata } from 'next'
import { getSunnyNowVenues } from '@/lib/data'
import { getWeather } from '@/lib/weather'
import HomeClient from '../HomeClient'

export const revalidate = 900 // 15 minutes

export const metadata: Metadata = {
  title: 'Sunny Patios Right Now — SunSpot Halifax',
  description:
    'Patios in Halifax that are in sunlight right now. Real-time sun predictions for restaurants, bars, cafes, and breweries.',
  openGraph: {
    title: 'Sunny Patios Right Now — SunSpot Halifax',
    description: 'Find patios in sunlight right now in Halifax.',
  },
}

export default async function SunnyNowPage() {
  const [venues, weather] = await Promise.all([
    getSunnyNowVenues(),
    getWeather(),
  ])

  return <HomeClient initialVenues={venues} initialWeather={weather} />
}
