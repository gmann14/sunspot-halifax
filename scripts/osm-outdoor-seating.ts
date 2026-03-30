/**
 * Cross-reference OSM outdoor_seating=yes tags with existing venues.
 *
 * Queries OSM Overpass API for all nodes/ways in Halifax downtown that have
 * outdoor_seating=yes, then matches them to existing Supabase venues by proximity.
 * Updates matched venues with data_sources.osm_outdoor_seating = true and
 * upgrades patio_confidence to 'verified' if currently 'estimated'.
 *
 * Run: npx tsx scripts/osm-outdoor-seating.ts
 *
 * Requires:
 *   - NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Halifax downtown bounding box
const BBOX = {
  south: 44.636,
  west: -63.590,
  north: 44.656,
  east: -63.560,
}

// Maximum distance (meters) to consider a match between OSM node and venue
const MAX_MATCH_DISTANCE_M = 50

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

interface OsmElement {
  type: string
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

interface VenueRow {
  id: string
  name: string
  lat: number
  lng: number
  patio_confidence: string
  data_sources: Record<string, boolean> | null
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function queryOverpass(): Promise<OsmElement[]> {
  const query = `
[out:json][timeout:30];
(
  node["outdoor_seating"="yes"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  way["outdoor_seating"="yes"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  node["outdoor_seating:capacity"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  way["outdoor_seating:capacity"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
);
out center;
`.trim()

  for (const mirror of OVERPASS_MIRRORS) {
    try {
      console.log(`  Querying ${mirror}...`)
      const res = await fetch(mirror, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      })

      if (!res.ok) {
        console.warn(`  Mirror returned ${res.status}, trying next...`)
        continue
      }

      const data = await res.json()
      return data.elements ?? []
    } catch (err) {
      console.warn(`  Mirror failed: ${(err as Error).message}`)
    }
  }

  console.error('All Overpass mirrors failed')
  return []
}

async function main() {
  console.log('OSM outdoor_seating cross-reference\n')
  console.log('1. Fetching OSM data...')

  const elements = await queryOverpass()
  console.log(`   Found ${elements.length} OSM elements with outdoor_seating\n`)

  if (elements.length === 0) {
    console.log('No OSM data found. Done.')
    return
  }

  // Extract coordinates from each element
  const osmPoints = elements
    .map((el) => {
      const lat = el.lat ?? el.center?.lat
      const lon = el.lon ?? el.center?.lon
      const name = el.tags?.name ?? el.tags?.['name:en'] ?? `OSM ${el.type}/${el.id}`
      return lat != null && lon != null ? { lat, lon, name, id: el.id, tags: el.tags } : null
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)

  console.log(`   ${osmPoints.length} elements with coordinates\n`)

  // Fetch all venues from Supabase
  console.log('2. Fetching venues from Supabase...')
  const { data: venues, error } = await supabase
    .from('venues')
    .select('id, name, lat, lng, patio_confidence, data_sources')

  if (error) {
    console.error('Failed to fetch venues:', error.message)
    process.exit(1)
  }

  const venueRows = (venues ?? []) as VenueRow[]
  console.log(`   ${venueRows.length} venues in database\n`)

  // Match OSM points to venues by proximity
  console.log('3. Matching OSM outdoor_seating to venues...\n')

  let matched = 0
  let upgraded = 0
  let alreadyVerified = 0

  for (const osm of osmPoints) {
    let closestVenue: VenueRow | null = null
    let closestDist = Infinity

    for (const venue of venueRows) {
      const dist = haversineDistance(osm.lat, osm.lon, venue.lat, venue.lng)
      if (dist < closestDist) {
        closestDist = dist
        closestVenue = venue
      }
    }

    if (!closestVenue || closestDist > MAX_MATCH_DISTANCE_M) {
      console.log(`  ✗ No match for "${osm.name}" (closest: ${closestDist.toFixed(0)}m)`)
      continue
    }

    matched++
    console.log(
      `  ✓ "${osm.name}" → "${closestVenue.name}" (${closestDist.toFixed(1)}m)`
    )

    // Update data_sources to include OSM confirmation
    const dataSources = { ...(closestVenue.data_sources ?? {}), osm_outdoor_seating: true }

    // Upgrade confidence if currently estimated
    const wasEstimated = closestVenue.patio_confidence === 'estimated'
    const newConfidence = wasEstimated ? 'verified' : closestVenue.patio_confidence

    if (wasEstimated) {
      upgraded++
      console.log(`    ↑ Upgraded confidence: estimated → verified`)
    } else {
      alreadyVerified++
    }

    const { error: updateError } = await supabase
      .from('venues')
      .update({
        data_sources: dataSources,
        patio_confidence: newConfidence,
      })
      .eq('id', closestVenue.id)

    if (updateError) {
      console.error(`    Error updating ${closestVenue.name}:`, updateError.message)
    }
  }

  console.log(`\n--- Summary ---`)
  console.log(`OSM outdoor_seating elements:  ${osmPoints.length}`)
  console.log(`Matched to venues:             ${matched}`)
  console.log(`Confidence upgraded:           ${upgraded}`)
  console.log(`Already verified:              ${alreadyVerified}`)
  console.log(`Unmatched (>50m):              ${osmPoints.length - matched}`)
}

main().catch(console.error)
