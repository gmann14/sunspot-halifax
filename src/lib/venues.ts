import { WALKING_METERS_PER_MINUTE, MAX_WALKING_DISPLAY_METERS, DAY_KEYS, HALIFAX_TIMEZONE } from './constants'
import type { Venue, VenueHours, VenueWithForecast, VenueSunForecast } from '@/types'

/**
 * Calculate straight-line distance between two points in meters (Haversine)
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Calculate approximate walking time in minutes
 */
export function walkingMinutes(distanceMeters: number): number | null {
  if (distanceMeters > MAX_WALKING_DISPLAY_METERS) return null // "30+ min"
  return Math.max(1, Math.round(distanceMeters / WALKING_METERS_PER_MINUTE))
}

/**
 * Format walking time for display
 */
export function formatWalkingTime(distanceMeters: number): string {
  const mins = walkingMinutes(distanceMeters)
  if (mins === null) return '30+ min walk'
  return `${mins} min walk`
}

/**
 * Check if a venue is currently open based on its hours
 */
export function isVenueOpen(venue: Venue, date: Date = new Date()): boolean {
  if (!venue.hours) return true // Assume open if no hours data

  const halifaxDate = new Date(date.toLocaleString('en-US', { timeZone: HALIFAX_TIMEZONE }))
  const dayIndex = (halifaxDate.getDay() + 6) % 7 // Mon=0, Sun=6
  const dayKey = DAY_KEYS[dayIndex]
  const periods = venue.hours[dayKey]

  if (!periods || periods.length === 0) {
    // Check if it's an after-midnight close from the previous day
    const prevDayIndex = (dayIndex + 6) % 7
    const prevDayKey = DAY_KEYS[prevDayIndex]
    const prevPeriods = venue.hours[prevDayKey]
    if (prevPeriods) {
      for (const period of prevPeriods) {
        const closeTime = parseTimeToMinutes(period.close)
        const openTime = parseTimeToMinutes(period.open)
        if (closeTime < openTime) {
          // After-midnight close — check if now is before the close time
          const nowMinutes = halifaxDate.getHours() * 60 + halifaxDate.getMinutes()
          if (nowMinutes < closeTime) return true
        }
      }
    }
    return false // Closed today
  }

  const nowMinutes = halifaxDate.getHours() * 60 + halifaxDate.getMinutes()

  for (const period of periods) {
    const openTime = parseTimeToMinutes(period.open)
    const closeTime = parseTimeToMinutes(period.close)

    if (closeTime < openTime) {
      // After-midnight close
      if (nowMinutes >= openTime) return true
    } else {
      if (nowMinutes >= openTime && nowMinutes < closeTime) return true
    }
  }

  return false
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/**
 * Generate a URL-safe slug from a venue name
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Get price level display string
 */
export function formatPriceLevel(level: number | null): string {
  if (!level) return ''
  return '$'.repeat(level)
}

/**
 * Calculate continuous sun time remaining from a given slot
 */
export function continuousSunMinutes(
  forecasts: VenueSunForecast[],
  fromSlot: Date
): number {
  const sortedForecasts = forecasts
    .filter((f) => new Date(f.slot_starts_at) >= fromSlot && f.status === 'sun')
    .sort((a, b) => new Date(a.slot_starts_at).getTime() - new Date(b.slot_starts_at).getTime())

  if (sortedForecasts.length === 0) return 0

  let minutes = 15 // First slot
  for (let i = 1; i < sortedForecasts.length; i++) {
    const prev = new Date(sortedForecasts[i - 1].slot_starts_at)
    const curr = new Date(sortedForecasts[i].slot_starts_at)
    if (curr.getTime() - prev.getTime() === 15 * 60 * 1000) {
      minutes += 15
    } else {
      break
    }
  }

  return minutes
}

/**
 * Find the next sun window time after a given slot
 */
export function nextSunWindow(
  forecasts: VenueSunForecast[],
  afterSlot: Date
): Date | null {
  const next = forecasts
    .filter((f) => new Date(f.slot_starts_at) > afterSlot && f.status === 'sun')
    .sort((a, b) => new Date(a.slot_starts_at).getTime() - new Date(b.slot_starts_at).getTime())

  return next.length > 0 ? new Date(next[0].slot_starts_at) : null
}

/**
 * Find the best sun window (longest continuous sun period) for a day
 */
export function bestSunWindow(
  forecasts: VenueSunForecast[]
): { start: Date; end: Date } | null {
  const sunSlots = forecasts
    .filter((f) => f.status === 'sun')
    .sort((a, b) => new Date(a.slot_starts_at).getTime() - new Date(b.slot_starts_at).getTime())

  if (sunSlots.length === 0) return null

  let bestStart = new Date(sunSlots[0].slot_starts_at)
  let bestEnd = new Date(bestStart.getTime() + 15 * 60 * 1000)
  let currentStart = bestStart
  let currentEnd = bestEnd

  for (let i = 1; i < sunSlots.length; i++) {
    const slotTime = new Date(sunSlots[i].slot_starts_at)
    if (slotTime.getTime() - currentEnd.getTime() === 0) {
      currentEnd = new Date(slotTime.getTime() + 15 * 60 * 1000)
    } else {
      if (currentEnd.getTime() - currentStart.getTime() > bestEnd.getTime() - bestStart.getTime()) {
        bestStart = currentStart
        bestEnd = currentEnd
      }
      currentStart = slotTime
      currentEnd = new Date(slotTime.getTime() + 15 * 60 * 1000)
    }
  }

  if (currentEnd.getTime() - currentStart.getTime() > bestEnd.getTime() - bestStart.getTime()) {
    bestStart = currentStart
    bestEnd = currentEnd
  }

  return { start: bestStart, end: bestEnd }
}

/**
 * Sort venues by "Best match" algorithm:
 * 1. Sunny venues: sort by continuous sun time remaining (descending)
 * 2. Shade venues: sort by time until next sun window (ascending)
 * 3. Tie-breaker: distance (if available) then alphabetical
 */
export function sortByBestMatch(
  venues: VenueWithForecast[],
  userLat?: number,
  userLng?: number
): VenueWithForecast[] {
  return [...venues].sort((a, b) => {
    const aIsSunny = a.current_status === 'sun'
    const bIsSunny = b.current_status === 'sun'

    // Sunny venues first
    if (aIsSunny && !bIsSunny) return -1
    if (!aIsSunny && bIsSunny) return 1

    if (aIsSunny && bIsSunny) {
      // Both sunny: sort by continuous sun remaining (desc)
      const aSun = a.continuous_sun_minutes ?? 0
      const bSun = b.continuous_sun_minutes ?? 0
      if (aSun !== bSun) return bSun - aSun
    } else {
      // Both shade: sort by time until next sun (asc)
      const aNext = a.minutes_until_sun
      const bNext = b.minutes_until_sun
      if (aNext != null && bNext != null) {
        if (aNext !== bNext) return aNext - bNext
      }
      if (aNext == null && bNext != null) return 1
      if (aNext != null && bNext == null) return -1
    }

    // Tie-breaker: distance
    if (userLat !== undefined && userLng !== undefined) {
      const aDist = haversineDistance(userLat, userLng, a.lat, a.lng)
      const bDist = haversineDistance(userLat, userLng, b.lat, b.lng)
      if (Math.abs(aDist - bDist) > 10) return aDist - bDist
    }

    // Final tie-breaker: alphabetical
    return a.name.localeCompare(b.name)
  })
}
