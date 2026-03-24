import { ENVIRONMENT_CANADA_URL, WEATHER_CACHE_SECONDS, OPEN_METEO_LAT, OPEN_METEO_LNG } from './constants'
import type { WeatherData } from '@/types'

let weatherCache: { data: WeatherData; timestamp: number } | null = null

/**
 * Map Environment Canada condition text to our condition codes
 */
function mapConditionCode(condition: string): WeatherData['condition_code'] {
  const lower = condition.toLowerCase()

  if (lower.includes('mainly clear') || lower === 'clear') {
    return 'clear'
  }
  if (lower.includes('partly cloudy') || lower.includes('a few clouds')) {
    return 'partly_cloudy'
  }
  if (
    lower.includes('mostly cloudy') ||
    lower === 'cloudy' ||
    lower.includes('overcast')
  ) {
    return 'overcast'
  }
  // Everything else: rain, snow, fog, etc.
  return 'poor'
}

/**
 * Parse Environment Canada citypage XML for current conditions
 */
function parseWeatherXML(xml: string): WeatherData | null {
  // Extract current condition
  const conditionMatch = xml.match(/<condition>([^<]*)<\/condition>/)
  const tempMatch = xml.match(/<temperature unitType="metric" units="°C">([^<]*)<\/temperature>/)
  const iconMatch = xml.match(/<iconCode format="gif">([^<]*)<\/iconCode>/)

  if (!conditionMatch || !tempMatch) return null

  const condition = conditionMatch[1].trim()
  const temperature = parseFloat(tempMatch[1])

  if (isNaN(temperature)) return null

  return {
    condition,
    condition_code: mapConditionCode(condition),
    temperature,
    icon_code: iconMatch?.[1]?.trim() ?? '00',
    cached: false,
    fetched_at: new Date().toISOString(),
  }
}

/**
 * Fetch current cloud cover from Open-Meteo.
 */
async function fetchOpenMeteoCloudCover(): Promise<number | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${OPEN_METEO_LAT}&longitude=${OPEN_METEO_LNG}&current=cloud_cover&timezone=America%2FHalifax`
    const res = await fetch(url, { signal: AbortSignal.timeout(5_000) })
    if (!res.ok) return null
    const data = await res.json() as { current?: { cloud_cover?: number } }
    return data.current?.cloud_cover ?? null
  } catch {
    return null
  }
}

/**
 * Fetch current weather from Environment Canada + Open-Meteo cloud cover, with caching
 */
export async function getWeather(): Promise<WeatherData | null> {
  // Check cache
  if (weatherCache) {
    const ageSeconds = (Date.now() - weatherCache.timestamp) / 1000
    if (ageSeconds < WEATHER_CACHE_SECONDS) {
      return { ...weatherCache.data, cached: true }
    }
  }

  try {
    const [ecResponse, cloudCover] = await Promise.all([
      fetch(ENVIRONMENT_CANADA_URL, { next: { revalidate: WEATHER_CACHE_SECONDS } }),
      fetchOpenMeteoCloudCover(),
    ])

    if (!ecResponse.ok) {
      if (weatherCache) {
        return { ...weatherCache.data, cached: true }
      }
      return null
    }

    const xml = await ecResponse.text()
    const data = parseWeatherXML(xml)

    if (data) {
      data.cloud_cover = cloudCover
      weatherCache = { data, timestamp: Date.now() }
      return data
    }

    if (weatherCache) {
      return { ...weatherCache.data, cached: true }
    }
    return null
  } catch {
    if (weatherCache) {
      return { ...weatherCache.data, cached: true }
    }
    return null
  }
}
