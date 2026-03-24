/**
 * Bootstrap venues from Google Places API (New) Nearby Search.
 *
 * Searches for restaurants, bars, cafes, and breweries in downtown Halifax,
 * then estimates a patio point on each venue's street-facing side.
 *
 * Run: npx tsx scripts/bootstrap-venues.ts
 *
 * Requires:
 *   - GOOGLE_PLACES_API_KEY env var
 *   - NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
 */

import { createClient } from '@supabase/supabase-js'

// --- Config ---

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY ?? ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!GOOGLE_API_KEY) {
  console.error('Missing GOOGLE_PLACES_API_KEY')
  process.exit(1)
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Halifax downtown bbox center + radius
const SEARCH_CENTER = { lat: 44.646, lng: -63.575 }
const SEARCH_RADIUS_M = 1000 // 1km covers downtown core

// Google Places types we care about
const PLACE_TYPES = ['restaurant', 'bar', 'cafe'] as const

// Patio offset distance in meters (place patio point ~2m outside building)
const PATIO_OFFSET_M = 2

// Rate limit: Google Places API allows 60 QPM on free tier
const DELAY_MS = 200

// --- Types ---

interface PlaceResult {
  id: string
  displayName?: { text?: string }
  formattedAddress?: string
  location?: { latitude?: number; longitude?: number }
  rating?: number
  priceLevel?: string
  websiteUri?: string
  nationalPhoneNumber?: string
  regularOpeningHours?: {
    periods?: Array<{
      open?: { day?: number; hour?: number; minute?: number }
      close?: { day?: number; hour?: number; minute?: number }
    }>
  }
  primaryType?: string
  types?: string[]
  photos?: Array<{ name?: string; authorAttributions?: Array<{ displayName?: string; uri?: string }> }>
}

// --- Helpers ---

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function mapVenueType(place: PlaceResult): 'restaurant' | 'bar' | 'cafe' | 'brewery' {
  const types = place.types ?? []
  const primary = place.primaryType ?? ''

  if (types.includes('brewery') || primary === 'brewery') return 'brewery'
  if (types.includes('bar') || primary === 'bar') return 'bar'
  if (types.includes('cafe') || primary === 'cafe' || types.includes('coffee_shop')) return 'cafe'
  return 'restaurant'
}

function mapPriceLevel(priceLevel?: string): number | null {
  if (!priceLevel) return null
  const map: Record<string, number> = {
    PRICE_LEVEL_FREE: 1,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  }
  return map[priceLevel] ?? null
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
const HOURS_DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

function mapHours(
  periods?: NonNullable<PlaceResult['regularOpeningHours']>['periods']
): Record<string, Array<{ open: string; close: string }>> | null {
  if (!periods || periods.length === 0) return null

  const hours: Record<string, Array<{ open: string; close: string }>> = {}

  for (const period of periods) {
    const openDay = period.open?.day
    const openHour = period.open?.hour ?? 0
    const openMinute = period.open?.minute ?? 0
    const closeHour = period.close?.hour ?? 0
    const closeMinute = period.close?.minute ?? 0

    if (openDay == null) continue

    // Google uses 0=Sunday, we use mon/tue/wed/... keys
    const dayKey = DAY_KEYS[openDay]
    if (!dayKey) continue

    // Find corresponding key in our format (mon=0 index in HOURS_DAY_KEYS)
    const ourDayKey = dayKey === 'sun' ? 'sun' : dayKey

    const openStr = `${String(openHour).padStart(2, '0')}:${String(openMinute).padStart(2, '0')}`
    const closeStr = `${String(closeHour).padStart(2, '0')}:${String(closeMinute).padStart(2, '0')}`

    if (!hours[ourDayKey]) hours[ourDayKey] = []
    hours[ourDayKey].push({ open: openStr, close: closeStr })
  }

  return Object.keys(hours).length > 0 ? hours : null
}

/**
 * Estimate a patio point on the street-facing side of a venue.
 *
 * Strategy: Offset the venue point ~2m toward the nearest major street direction.
 * For Halifax downtown, streets generally run NW-SE (Barrington, Hollis, Lower Water)
 * and NE-SW (Spring Garden, Sackville, Prince). Most patios face east (toward water)
 * or south (for sun). Default: offset slightly south-east.
 */
function estimatePatioPoint(lat: number, lng: number): { lat: number; lng: number } {
  // ~2m offset toward south-east (bearing ~135 degrees)
  // At Halifax latitude, 1 degree lat ≈ 111,320m, 1 degree lng ≈ 111,320 * cos(44.646°) ≈ 79,200m
  const metersPerDegLat = 111320
  const metersPerDegLng = 111320 * Math.cos((lat * Math.PI) / 180)

  const bearingRad = (135 * Math.PI) / 180 // SE
  const dLat = (PATIO_OFFSET_M * Math.cos(bearingRad)) / metersPerDegLat
  const dLng = (PATIO_OFFSET_M * Math.sin(bearingRad)) / metersPerDegLng

  return { lat: lat + dLat, lng: lng + dLng }
}

function buildPhotoUrl(photoName: string): string {
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&key=${GOOGLE_API_KEY}`
}

// --- Google Places API (New) ---

const PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchNearby'

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.priceLevel',
  'places.websiteUri',
  'places.nationalPhoneNumber',
  'places.regularOpeningHours',
  'places.primaryType',
  'places.types',
  'places.photos',
].join(',')

async function searchPlaces(type: string): Promise<PlaceResult[]> {
  const body = {
    includedTypes: [type],
    locationRestriction: {
      circle: {
        center: { latitude: SEARCH_CENTER.lat, longitude: SEARCH_CENTER.lng },
        radius: SEARCH_RADIUS_M,
      },
    },
    maxResultCount: 20,
    languageCode: 'en',
  }

  const res = await fetch(PLACES_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error(`Google Places API error for type=${type}: ${res.status} ${text}`)
    return []
  }

  const data = await res.json()
  return data.places ?? []
}

// --- Main ---

async function bootstrap() {
  console.log('Searching Google Places API for Halifax downtown venues...\n')

  // Collect all places, deduplicating by Google place ID
  const seenIds = new Set<string>()
  const allPlaces: PlaceResult[] = []

  for (const type of PLACE_TYPES) {
    console.log(`  Searching for: ${type}`)
    const places = await searchPlaces(type)
    console.log(`    Found ${places.length} results`)

    for (const place of places) {
      if (!seenIds.has(place.id)) {
        seenIds.add(place.id)
        allPlaces.push(place)
      }
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, DELAY_MS))
  }

  console.log(`\nTotal unique venues: ${allPlaces.length}`)

  // Also check existing slugs for collision handling
  const { data: existingVenues } = await supabase.from('venues').select('slug')
  const existingSlugs = new Set((existingVenues ?? []).map((v: { slug: string }) => v.slug))

  let upserted = 0
  let errors = 0

  for (const place of allPlaces) {
    const name = place.displayName?.text
    const lat = place.location?.latitude
    const lng = place.location?.longitude

    if (!name || lat == null || lng == null) {
      console.warn(`  Skipping place with missing data: ${place.id}`)
      continue
    }

    // Generate unique slug
    let baseSlug = slugify(name)
    let slug = baseSlug
    let suffix = 2
    while (existingSlugs.has(slug)) {
      slug = `${baseSlug}-${suffix}`
      suffix++
    }
    existingSlugs.add(slug)

    const patioPoint = estimatePatioPoint(lat, lng)
    const venueType = mapVenueType(place)

    // Build photo data
    const photos = (place.photos ?? []).slice(0, 3).map((p) => ({
      url: buildPhotoUrl(p.name ?? ''),
      html_attributions: (p.authorAttributions ?? []).map(
        (a) => `<a href="${a.uri ?? ''}">${a.displayName ?? ''}</a>`
      ),
      photo_reference: p.name ?? '',
      fetched_at: new Date().toISOString(),
    }))

    const row = {
      name,
      slug,
      type: venueType,
      lat,
      lng,
      sun_query_point: `SRID=4326;POINT(${patioPoint.lng} ${patioPoint.lat})`,
      patio_confidence: 'estimated' as const,
      google_place_id: place.id,
      website: place.websiteUri ?? null,
      phone: place.nationalPhoneNumber ?? null,
      rating: place.rating ?? null,
      price_level: mapPriceLevel(place.priceLevel),
      hours: mapHours(place.regularOpeningHours?.periods),
      patio_season_only: true,
      address: place.formattedAddress ?? null,
      neighborhood: guessNeighborhood(lat, lng),
      photos: photos.length > 0 ? photos : null,
      data_sources: { google: true },
    }

    const { error } = await supabase
      .from('venues')
      .upsert(row, { onConflict: 'slug' })

    if (error) {
      console.error(`  Error upserting ${name}:`, error.message)
      errors++
    } else {
      upserted++
      console.log(`  + ${name} (${venueType}) → ${slug}`)
    }

    await new Promise((r) => setTimeout(r, 50))
  }

  console.log(`\nDone! Upserted ${upserted} venues, ${errors} errors.`)
}

function guessNeighborhood(lat: number, lng: number): string {
  // Simple bbox-based neighborhood guessing for Halifax
  if (lat < 44.644 && lng > -63.570) return 'Waterfront'
  if (lat < 44.644 && lng <= -63.575) return 'Spring Garden'
  if (lat >= 44.650) return 'North End'
  return 'Downtown'
}

bootstrap().catch(console.error)
