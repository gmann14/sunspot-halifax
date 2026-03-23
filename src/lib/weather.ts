import { ENVIRONMENT_CANADA_URL, WEATHER_CACHE_SECONDS } from './constants'
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
 * Fetch current weather from Environment Canada with caching
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
    const response = await fetch(ENVIRONMENT_CANADA_URL, {
      next: { revalidate: WEATHER_CACHE_SECONDS },
    })

    if (!response.ok) {
      // Return cached value if available
      if (weatherCache) {
        return { ...weatherCache.data, cached: true }
      }
      return null
    }

    const xml = await response.text()
    const data = parseWeatherXML(xml)

    if (data) {
      weatherCache = { data, timestamp: Date.now() }
      return data
    }

    // Parse failed, return cache
    if (weatherCache) {
      return { ...weatherCache.data, cached: true }
    }
    return null
  } catch {
    // Network error, return cache
    if (weatherCache) {
      return { ...weatherCache.data, cached: true }
    }
    return null
  }
}
