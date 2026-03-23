import { getVenuesWithForecasts } from '@/lib/data'
import { getWeather } from '@/lib/weather'
import HomeClient from './HomeClient'

export const revalidate = 900 // 15 minutes

export default async function HomePage() {
  const [venues, weather] = await Promise.all([
    getVenuesWithForecasts(),
    getWeather(),
  ])

  return <HomeClient initialVenues={venues} initialWeather={weather} />
}
