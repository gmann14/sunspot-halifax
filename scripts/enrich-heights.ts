/**
 * Enrich building heights from OpenStreetMap via Overpass API.
 *
 * Fetches buildings with height and building:levels tags in Halifax downtown,
 * matches them to existing Supabase buildings by nearest centroid (≤20m),
 * and updates the height_m column.
 *
 * Height estimation logic:
 *   1. Use explicit `height` tag if present
 *   2. Else use `building:levels * 3.5m`
 *   3. Else default to 3 levels * 3.5m = 10.5m
 *
 * Run: npx tsx scripts/enrich-heights.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

// We use the Supabase JS client, not raw postgres
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, serviceRoleKey)

// Halifax downtown bounding box
const BBOX = {
  south: 44.635,
  west: -63.59,
  north: 44.66,
  east: -63.56,
}

const DEFAULT_LEVELS = 3
const METERS_PER_LEVEL = 3.5
const MAX_MATCH_DISTANCE_M = 20

const OVERPASS_URLS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass-api.de/api/interpreter',
]

interface OSMBuilding {
  lat: number
  lng: number
  height_m: number
  osm_id: number
}

/**
 * Query Overpass API for buildings with height/levels in the bbox
 */
async function fetchOSMBuildings(): Promise<OSMBuilding[]> {
  const query = `
[out:json][timeout:120];
(
  way["building"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  relation["building"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
);
out center;
`

  console.log('Fetching buildings from Overpass API...')

  let response: Response | null = null
  for (const url of OVERPASS_URLS) {
    console.log(`  Trying ${url}...`)
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(90_000),
      })
      if (response.ok) {
        console.log(`  Success from ${url}`)
        break
      }
      console.log(`  Failed (${response.status}), trying next mirror...`)
    } catch (err) {
      console.log(`  Error: ${err instanceof Error ? err.message : err}, trying next mirror...`)
    }
  }

  if (!response?.ok) {
    throw new Error(`All Overpass API mirrors failed`)
  }

  const data = await response.json()
  const elements = data.elements as Array<{
    id: number
    center?: { lat: number; lon: number }
    lat?: number
    lon?: number
    tags?: Record<string, string>
  }>

  console.log(`  Received ${elements.length} building elements from OSM`)

  const buildings: OSMBuilding[] = []

  for (const el of elements) {
    const lat = el.center?.lat ?? el.lat
    const lng = el.center?.lon ?? el.lon
    if (lat == null || lng == null) continue

    const tags = el.tags ?? {}

    // Determine height
    let height_m: number | null = null

    // 1. Explicit height tag
    if (tags['height']) {
      const parsed = parseFloat(tags['height'].replace(/\s*m$/, ''))
      if (!isNaN(parsed) && parsed > 0) {
        height_m = parsed
      }
    }

    // 2. building:levels * 3.5m
    if (height_m == null && tags['building:levels']) {
      const levels = parseFloat(tags['building:levels'])
      if (!isNaN(levels) && levels > 0) {
        height_m = levels * METERS_PER_LEVEL
      }
    }

    // 3. Default to 3 levels
    if (height_m == null) {
      height_m = DEFAULT_LEVELS * METERS_PER_LEVEL
    }

    buildings.push({ lat, lng, height_m, osm_id: el.id })
  }

  const withExplicit = elements.filter((e) => e.tags?.['height'] || e.tags?.['building:levels']).length
  console.log(`  ${withExplicit} have explicit height/levels, ${buildings.length - withExplicit} using default ${DEFAULT_LEVELS} levels`)

  return buildings
}

/**
 * Haversine distance in meters between two lat/lng points
 */
function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function enrichHeights() {
  // 1. Fetch OSM buildings
  const osmBuildings = await fetchOSMBuildings()

  // 2. Fetch all existing buildings from Supabase with their centroids
  console.log('\nFetching existing buildings from Supabase...')
  const { data: dbBuildings, error: fetchError } = await supabase.rpc('buildings_with_centroids')

  // If the RPC doesn't exist, fall back to a raw query approach
  let buildings: Array<{ id: string; centroid_lat: number; centroid_lng: number; height_m: number | null }>

  if (fetchError) {
    console.log('  RPC not available, using direct query...')
    // Fetch buildings with centroid computed via PostGIS
    const { data, error } = await supabase
      .from('buildings')
      .select('id, height_m')

    if (error || !data) {
      throw new Error(`Failed to fetch buildings: ${error?.message}`)
    }

    // We need centroids — use the buildings_within_radius RPC with Halifax center
    const { data: withCentroids, error: rpcError } = await supabase.rpc('buildings_within_radius', {
      p_lng: (BBOX.west + BBOX.east) / 2,
      p_lat: (BBOX.south + BBOX.north) / 2,
      radius_m: 5000,
    })

    if (rpcError || !withCentroids) {
      throw new Error(`Failed to fetch building centroids: ${rpcError?.message}`)
    }

    buildings = (withCentroids as Array<{
      id: string
      centroid_lat: number
      centroid_lng: number
      height_m: number | null
    }>)
  } else {
    buildings = dbBuildings as typeof buildings
  }

  console.log(`  Found ${buildings.length} buildings in database`)

  // 3. Match and update
  let updated = 0
  let skipped = 0
  let alreadyHasHeight = 0

  for (const dbBuilding of buildings) {
    // Skip buildings that already have a height
    if (dbBuilding.height_m != null) {
      alreadyHasHeight++
      continue
    }

    // Find nearest OSM building
    let bestDistance = Infinity
    let bestOSM: OSMBuilding | null = null

    for (const osm of osmBuildings) {
      const dist = haversineM(dbBuilding.centroid_lat, dbBuilding.centroid_lng, osm.lat, osm.lng)
      if (dist < bestDistance) {
        bestDistance = dist
        bestOSM = osm
      }
    }

    if (!bestOSM || bestDistance > MAX_MATCH_DISTANCE_M) {
      skipped++
      continue
    }

    const { error: updateError } = await supabase
      .from('buildings')
      .update({ height_m: bestOSM.height_m })
      .eq('id', dbBuilding.id)

    if (updateError) {
      console.error(`  Failed to update building ${dbBuilding.id}:`, updateError.message)
      skipped++
    } else {
      updated++
    }
  }

  console.log(`\nDone!`)
  console.log(`  Already had height: ${alreadyHasHeight}`)
  console.log(`  Updated from OSM:   ${updated}`)
  console.log(`  Skipped (no match): ${skipped}`)

  // 4. Report final coverage
  const { data: finalData } = await supabase
    .from('buildings')
    .select('id, height_m')

  if (finalData) {
    const total = finalData.length
    const withHeight = finalData.filter((b: { height_m: number | null }) => b.height_m != null).length
    console.log(`\n  Height coverage: ${withHeight}/${total} (${((withHeight / total) * 100).toFixed(1)}%)`)
  }
}

enrichHeights().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
