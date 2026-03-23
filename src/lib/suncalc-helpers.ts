import SunCalc from 'suncalc'
import { HALIFAX_CENTER, FORECAST_SLOT_MINUTES, HALIFAX_TIMEZONE } from './constants'

/**
 * Get sunrise and sunset times for a given date in Halifax
 */
export function getSunTimes(date: Date = new Date()) {
  const times = SunCalc.getTimes(date, HALIFAX_CENTER.lat, HALIFAX_CENTER.lng)
  return {
    sunrise: times.sunrise,
    sunset: times.sunset,
    goldenHour: times.goldenHour,
  }
}

/**
 * Get sun position (azimuth and altitude) at a given time and location
 */
export function getSunPosition(time: Date, lat: number, lng: number) {
  const pos = SunCalc.getPosition(time, lat, lng)
  return {
    azimuth: pos.azimuth,
    altitude: pos.altitude,
    // Convert SunCalc azimuth to compass bearing (degrees clockwise from north)
    // SunCalc azimuth: south=0, west=π/2, north=π (or -π), east=-π/2
    bearing: ((pos.azimuth * 180) / Math.PI + 180) % 360,
  }
}

/**
 * Generate 15-minute time slot boundaries for a day from sunrise to sunset
 */
export function generateDaySlots(date: Date = new Date()): Date[] {
  const { sunrise, sunset } = getSunTimes(date)
  const slots: Date[] = []

  // Round sunrise up to next 15-minute boundary using epoch math
  const slotMs = FORECAST_SLOT_MINUTES * 60 * 1000
  const startEpoch = Math.ceil(sunrise.getTime() / slotMs) * slotMs
  const start = new Date(startEpoch)

  // Round sunset down to previous 15-minute boundary
  const endEpoch = Math.floor(sunset.getTime() / slotMs) * slotMs
  const end = new Date(endEpoch)

  let current = new Date(start)
  while (current <= end) {
    slots.push(new Date(current))
    current = new Date(current.getTime() + FORECAST_SLOT_MINUTES * 60 * 1000)
  }

  return slots
}

/**
 * Get the current 15-minute slot boundary (rounded down)
 */
export function getCurrentSlot(date: Date = new Date()): Date {
  const slot = new Date(date)
  slot.setMinutes(Math.floor(slot.getMinutes() / FORECAST_SLOT_MINUTES) * FORECAST_SLOT_MINUTES, 0, 0)
  return slot
}

/**
 * Check if the sun is currently above the horizon in Halifax
 */
export function isSunUp(date: Date = new Date()): boolean {
  const pos = SunCalc.getPosition(date, HALIFAX_CENTER.lat, HALIFAX_CENTER.lng)
  return pos.altitude > 0
}

/**
 * Check if it's patio season (May-October)
 */
export function isPatioSeason(date: Date = new Date()): boolean {
  const month = date.getMonth() + 1 // 1-indexed
  return month >= 5 && month <= 10
}

/**
 * Format a time for display in Atlantic Time
 */
export function formatTimeAT(date: Date): string {
  return date.toLocaleTimeString('en-CA', {
    timeZone: HALIFAX_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Project a point along a compass bearing for a given distance in meters.
 * Returns [lng, lat].
 */
export function projectPoint(
  lat: number,
  lng: number,
  bearingDeg: number,
  distanceM: number
): [number, number] {
  const R = 6371000 // Earth's radius in meters
  const d = distanceM / R
  const bearingRad = (bearingDeg * Math.PI) / 180
  const lat1 = (lat * Math.PI) / 180
  const lng1 = (lng * Math.PI) / 180

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(bearingRad)
  )
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    )

  return [(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI]
}
