import { NextResponse } from 'next/server'
import { getWeather } from '@/lib/weather'

export const dynamic = 'force-dynamic'
export const revalidate = 1800 // 30 minutes

export async function GET() {
  const weather = await getWeather()

  if (!weather) {
    return new NextResponse(null, { status: 204 })
  }

  return NextResponse.json(weather, {
    headers: {
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
    },
  })
}
