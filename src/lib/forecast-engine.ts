/**
 * Server-side sun forecast engine.
 *
 * Computes whether each venue's patio point is in sun or shade at a given time
 * using SunCalc for sun position and PostGIS for ray-building intersection.
 *
 * Algorithm per spec:
 * 1. Get sun azimuth + altitude from SunCalc
 * 2. If sun below horizon → shade
 * 3. Check building height coverage within 500m — if >50% missing → unknown
 * 4. Build a 500m sun ray from patio point along sun bearing
 * 5. Query buildings that intersect the ray (PostGIS ST_Intersects)
 * 6. For each intersecting building: if atan2(height, distance) > sun altitude → shade
 * 7. If no building blocks → sun
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getSunPosition, generateDaySlots, getCurrentSlot, projectPoint } from './suncalc-helpers'
import {
  BUILDING_QUERY_RADIUS_M,
  MIN_HEIGHT_COVERAGE,
  CLOUD_COVER_SHADE_THRESHOLD,
  OPEN_METEO_LAT,
  OPEN_METEO_LNG,
} from './constants'
import type { SunStatus, HourlyWeather } from '@/types'

export interface ForecastRow {
  venue_id: string
  slot_starts_at: string
  status: SunStatus
  confidence: string
}

interface VenueForForecast {
  id: string
  lat: number
  lng: number
  sun_query_point: { type: string; coordinates: [number, number] } | null
  patio_confidence: string
}

interface BuildingHit {
  id: string
  height_m: number
  distance_m: number
}

interface BuildingCount {
  total: number
  with_height: number
}

/**
 * Fetch hourly cloud cover from Open-Meteo for today.
 * Returns a Map of ISO hour string → cloud_cover percent.
 */
export async function fetchHourlyCloudCover(): Promise<Map<string, number>> {
  const today = new Date().toISOString().slice(0, 10)
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${OPEN_METEO_LAT}&longitude=${OPEN_METEO_LNG}&hourly=cloud_cover,temperature_2m&start_date=${today}&end_date=${today}&timezone=America%2FHalifax`

  const map = new Map<string, number>()

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return map

    const data = await res.json() as {
      hourly?: { time?: string[]; cloud_cover?: number[] }
    }

    const times = data.hourly?.time ?? []
    const covers = data.hourly?.cloud_cover ?? []

    for (let i = 0; i < times.length; i++) {
      if (covers[i] != null) {
        map.set(times[i], covers[i])
      }
    }
  } catch {
    // Network error — return empty map so forecasts still compute without weather
  }

  return map
}

/**
 * Get the cloud cover for a given slot time from the hourly map.
 * Rounds down to the nearest hour.
 */
function getCloudCoverForSlot(
  cloudCover: Map<string, number>,
  slot: Date
): number | null {
  // Open-Meteo returns times like "2026-03-24T14:00" in local timezone
  const hourStr = slot.toLocaleString('sv-SE', {
    timeZone: 'America/Halifax',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).replace(' ', 'T').slice(0, 16)

  // Round down to hour
  const hourKey = hourStr.slice(0, 13) + ':00'
  return cloudCover.get(hourKey) ?? null
}

/**
 * Classify a single venue at a single time slot.
 */
async function classifyVenueAtSlot(
  supabase: SupabaseClient,
  venue: VenueForForecast,
  slot: Date,
  buildingCounts: Map<string, BuildingCount>,
  cloudCover?: Map<string, number>
): Promise<SunStatus> {
  const pLat = venue.sun_query_point?.coordinates?.[1] ?? venue.lat
  const pLng = venue.sun_query_point?.coordinates?.[0] ?? venue.lng

  const sun = getSunPosition(slot, pLat, pLng)

  // Sun below horizon
  if (sun.altitude <= 0) return 'shade'

  // Heavy cloud cover → shade (skip expensive PostGIS queries)
  if (cloudCover) {
    const cover = getCloudCoverForSlot(cloudCover, slot)
    if (cover != null && cover >= CLOUD_COVER_SHADE_THRESHOLD) {
      return 'shade'
    }
  }

  // Check building height coverage (cached per venue)
  let counts = buildingCounts.get(venue.id)
  if (!counts) {
    const { data: buildings } = await supabase.rpc('buildings_within_radius', {
      p_lng: pLng,
      p_lat: pLat,
      radius_m: BUILDING_QUERY_RADIUS_M,
    })

    const buildingList = buildings ?? []
    counts = {
      total: buildingList.length,
      with_height: buildingList.filter((b: { height_m: number | null }) => b.height_m != null).length,
    }
    buildingCounts.set(venue.id, counts)
  }

  if (counts.total > 0 && counts.with_height / counts.total < MIN_HEIGHT_COVERAGE) {
    return 'unknown'
  }

  // Build sun ray: project patio point 500m along sun bearing
  const [rayEndLng, rayEndLat] = projectPoint(pLat, pLng, sun.bearing, BUILDING_QUERY_RADIUS_M)

  // Use PostGIS to find buildings that actually intersect the ray
  const { data: hits, error } = await supabase.rpc('ray_intersecting_buildings', {
    p_lng: pLng,
    p_lat: pLat,
    ray_end_lng: rayEndLng,
    ray_end_lat: rayEndLat,
    radius_m: BUILDING_QUERY_RADIUS_M,
  })

  if (error) {
    console.error(`Ray intersection error for venue ${venue.id}:`, error.message)
    // Fall back to unknown on DB errors
    return 'unknown'
  }

  // Check each intersecting building
  for (const hit of (hits ?? []) as BuildingHit[]) {
    if (hit.distance_m < 5) continue // Skip the venue's own building

    const angularElevation = Math.atan2(hit.height_m, hit.distance_m)
    if (angularElevation > sun.altitude) {
      return 'shade'
    }
  }

  return 'sun'
}

export interface ForecastWeather {
  cloud_cover_hourly: Record<string, number>
  current_cloud_cover: number | null
  current_temperature: number | null
  fetched_at: string
}

/**
 * Compute forecasts for all venues for the given slots.
 *
 * @param mode 'full' — all slots sunrise to sunset; 'current' — current slot only
 */
export async function computeForecasts(
  supabase: SupabaseClient,
  mode: 'full' | 'current'
): Promise<{
  rows: ForecastRow[]
  venueCount: number
  slotCount: number
  weather: ForecastWeather | null
}> {
  // Fetch all venues and cloud cover concurrently
  const [venueResult, cloudCover] = await Promise.all([
    supabase.from('venues').select('id, lat, lng, sun_query_point, patio_confidence'),
    fetchHourlyCloudCover(),
  ])

  const { data: venues, error: venuesError } = venueResult

  if (venuesError || !venues) {
    throw new Error(`Failed to fetch venues: ${venuesError?.message}`)
  }

  // Build weather summary
  let weather: ForecastWeather | null = null
  if (cloudCover.size > 0) {
    const now = new Date()
    const currentCover = getCloudCoverForSlot(cloudCover, now)

    // Also fetch current temperature from the same Open-Meteo data
    const today = now.toISOString().slice(0, 10)
    let currentTemp: number | null = null
    try {
      const tempUrl = `https://api.open-meteo.com/v1/forecast?latitude=${OPEN_METEO_LAT}&longitude=${OPEN_METEO_LNG}&current=temperature_2m,cloud_cover&timezone=America%2FHalifax`
      const tempRes = await fetch(tempUrl, { signal: AbortSignal.timeout(5_000) })
      if (tempRes.ok) {
        const tempData = await tempRes.json() as {
          current?: { temperature_2m?: number; cloud_cover?: number }
        }
        currentTemp = tempData.current?.temperature_2m ?? null
      }
    } catch {
      // Non-critical
    }

    weather = {
      cloud_cover_hourly: Object.fromEntries(cloudCover),
      current_cloud_cover: currentCover,
      current_temperature: currentTemp,
      fetched_at: now.toISOString(),
    }
  }

  // Determine slots
  const slots =
    mode === 'full'
      ? generateDaySlots()
      : (() => {
          const daySlots = generateDaySlots()
          const now = new Date()
          const current = daySlots.find(
            (s) => Math.abs(s.getTime() - now.getTime()) < 15 * 60 * 1000
          )
          return current ? [current] : []
        })()

  if (slots.length === 0) {
    return { rows: [], venueCount: venues.length, slotCount: 0, weather }
  }

  const rows: ForecastRow[] = []
  const buildingCounts = new Map<string, BuildingCount>()

  for (const venue of venues as VenueForForecast[]) {
    for (const slot of slots) {
      const status = await classifyVenueAtSlot(supabase, venue, slot, buildingCounts, cloudCover)

      rows.push({
        venue_id: venue.id,
        slot_starts_at: slot.toISOString(),
        status,
        confidence: venue.patio_confidence,
      })
    }
  }

  return { rows, venueCount: venues.length, slotCount: slots.length, weather }
}

/**
 * Upsert forecast rows into the database.
 */
export async function upsertForecasts(
  supabase: SupabaseClient,
  rows: ForecastRow[]
): Promise<void> {
  if (rows.length === 0) return

  // Upsert in batches of 500
  const BATCH_SIZE = 500
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const { error } = await supabase
      .from('venue_sun_forecast')
      .upsert(batch, { onConflict: 'venue_id,slot_starts_at' })

    if (error) {
      throw new Error(`Forecast upsert error at batch ${Math.floor(i / BATCH_SIZE)}: ${error.message}`)
    }
  }
}

/**
 * Delete forecast rows older than `daysOld` days.
 */
export async function cleanupStaleForecasts(
  supabase: SupabaseClient,
  daysOld: number = 2
): Promise<number> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - daysOld)

  const { count, error } = await supabase
    .from('venue_sun_forecast')
    .delete({ count: 'exact' })
    .lt('slot_starts_at', cutoff.toISOString())

  if (error) {
    throw new Error(`Cleanup error: ${error.message}`)
  }

  return count ?? 0
}
