import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createServiceClient } from '@/lib/supabase'
import { getSunPosition, generateDaySlots } from '@/lib/suncalc-helpers'
import { BUILDING_QUERY_RADIUS_M, MIN_HEIGHT_COVERAGE } from '@/lib/constants'
import { projectPoint } from '@/lib/suncalc-helpers'
import type { SunStatus } from '@/types'

/**
 * Cron endpoint to compute sun forecasts for all venues.
 * POST /api/forecast?secret=CRON_SECRET
 *
 * Called at sunrise (full day) and every 15 min (current slot only).
 */
export async function POST(request: Request) {
  const headersList = await headers()
  const authHeader = headersList.get('authorization')
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  // Verify cron secret
  if (secret !== process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const mode = searchParams.get('mode') ?? 'current' // 'full' or 'current'
  const supabase = createServiceClient()

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  // Fetch all venues
  const { data: venues, error: venuesError } = await supabase
    .from('venues')
    .select('id, lat, lng, sun_query_point, patio_confidence')

  if (venuesError || !venues) {
    return NextResponse.json({ error: 'Failed to fetch venues' }, { status: 500 })
  }

  const slots = mode === 'full'
    ? generateDaySlots()
    : [generateDaySlots().find((s) => {
        const now = new Date()
        return Math.abs(s.getTime() - now.getTime()) < 15 * 60 * 1000
      })].filter(Boolean) as Date[]

  if (slots.length === 0) {
    return NextResponse.json({ message: 'No slots to compute (sun may be down)' })
  }

  const forecastRows: Array<{
    venue_id: string
    slot_starts_at: string
    status: SunStatus
    confidence: string
  }> = []

  for (const venue of venues) {
    const queryPoint = venue.sun_query_point
    const pLat = queryPoint?.coordinates?.[1] ?? venue.lat
    const pLng = queryPoint?.coordinates?.[0] ?? venue.lng

    // Fetch buildings within 500m
    const { data: buildings } = await supabase.rpc('buildings_within_radius', {
      p_lng: pLng,
      p_lat: pLat,
      radius_m: BUILDING_QUERY_RADIUS_M,
    })

    const buildingList = buildings ?? []
    const totalBuildings = buildingList.length
    const withHeight = buildingList.filter((b: { height_m: number | null }) => b.height_m != null).length

    for (const slot of slots) {
      const sun = getSunPosition(slot, pLat, pLng)

      // Sun below horizon
      if (sun.altitude <= 0) {
        forecastRows.push({
          venue_id: venue.id,
          slot_starts_at: slot.toISOString(),
          status: 'shade',
          confidence: venue.patio_confidence,
        })
        continue
      }

      // Check height coverage
      if (totalBuildings > 0 && withHeight / totalBuildings < MIN_HEIGHT_COVERAGE) {
        forecastRows.push({
          venue_id: venue.id,
          slot_starts_at: slot.toISOString(),
          status: 'unknown',
          confidence: venue.patio_confidence,
        })
        continue
      }

      // Build sun ray
      const rayEnd = projectPoint(pLat, pLng, sun.bearing, BUILDING_QUERY_RADIUS_M)
      let blocked = false

      for (const building of buildingList) {
        if (building.height_m == null) continue

        // Check if ray intersects building (simplified: check if building centroid
        // is near the ray line and building is between patio and sun direction)
        const bLat = building.centroid_lat
        const bLng = building.centroid_lng
        if (bLat == null || bLng == null) continue

        // Calculate distance from patio to building
        const dLat = bLat - pLat
        const dLng = bLng - pLng
        const dist = Math.sqrt(
          (dLat * 111320) ** 2 + (dLng * 111320 * Math.cos((pLat * Math.PI) / 180)) ** 2
        )

        if (dist < 5) continue // Building is at the patio point itself

        // Check if building is in the sun direction (within ~30 degrees)
        const buildingBearing =
          (Math.atan2(
            dLng * Math.cos((pLat * Math.PI) / 180),
            dLat
          ) * 180) / Math.PI
        const normalizedBuildingBearing = ((buildingBearing % 360) + 360) % 360
        const bearingDiff = Math.abs(normalizedBuildingBearing - sun.bearing)
        const minDiff = Math.min(bearingDiff, 360 - bearingDiff)

        if (minDiff > 30) continue // Not in the sun direction

        // Check angular elevation
        const angularElevation = Math.atan2(building.height_m, dist)

        if (angularElevation > sun.altitude) {
          blocked = true
          break
        }
      }

      forecastRows.push({
        venue_id: venue.id,
        slot_starts_at: slot.toISOString(),
        status: blocked ? 'shade' : 'sun',
        confidence: venue.patio_confidence,
      })
    }
  }

  // Upsert forecast rows
  if (forecastRows.length > 0) {
    const { error: upsertError } = await supabase
      .from('venue_sun_forecast')
      .upsert(forecastRows, {
        onConflict: 'venue_id,slot_starts_at',
      })

    if (upsertError) {
      console.error('Forecast upsert error:', upsertError)
      return NextResponse.json({ error: 'Failed to save forecasts' }, { status: 500 })
    }
  }

  return NextResponse.json({
    message: `Computed ${forecastRows.length} forecast rows for ${venues.length} venues`,
    mode,
    slots: slots.length,
  })
}
