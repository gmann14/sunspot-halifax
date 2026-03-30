/**
 * Scan Google Places reviews for patio-related keywords to improve confidence.
 *
 * For each venue with a google_place_id, fetches reviews from Google Places API
 * and scans for keywords like "patio", "terrace", "outdoor seating", "rooftop".
 * Venues with multiple patio mentions get upgraded to 'verified' confidence.
 *
 * Run: npx tsx scripts/review-keyword-scan.ts
 *
 * Requires:
 *   - GOOGLE_PLACES_API_KEY env var
 *   - NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
 */

import { createClient } from '@supabase/supabase-js'

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

// Keywords that indicate outdoor/patio seating
const PATIO_KEYWORDS = [
  'patio',
  'patios',
  'terrace',
  'rooftop',
  'outdoor seating',
  'outdoor dining',
  'outdoor area',
  'sidewalk seating',
  'beer garden',
  'al fresco',
  'outside seating',
  'deck',
  'courtyard',
]

// Minimum keyword mentions across all reviews to upgrade confidence
const MIN_MENTIONS_TO_VERIFY = 2

// Rate limit: stay under Google Places API quotas
const DELAY_MS = 250

interface VenueRow {
  id: string
  name: string
  google_place_id: string | null
  patio_confidence: string
  data_sources: Record<string, boolean> | null
}

interface PlaceReview {
  text?: { text?: string }
  rating?: number
  relativePublishTimeDescription?: string
}

async function fetchReviews(placeId: string): Promise<PlaceReview[]> {
  const url = `https://places.googleapis.com/v1/places/${placeId}`

  const res = await fetch(url, {
    headers: {
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': 'reviews',
    },
  })

  if (!res.ok) {
    if (res.status === 429) {
      console.warn('    Rate limited — waiting 5s...')
      await new Promise((r) => setTimeout(r, 5000))
      return fetchReviews(placeId)
    }
    console.warn(`    API error ${res.status} for ${placeId}`)
    return []
  }

  const data = await res.json()
  return data.reviews ?? []
}

function countKeywordMentions(reviews: PlaceReview[]): { total: number; keywords: Record<string, number> } {
  const keywordCounts: Record<string, number> = {}
  let total = 0

  for (const review of reviews) {
    const text = review.text?.text?.toLowerCase() ?? ''
    if (!text) continue

    for (const keyword of PATIO_KEYWORDS) {
      // Count occurrences of each keyword in the review
      const regex = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}`, 'gi')
      const matches = text.match(regex)
      if (matches) {
        keywordCounts[keyword] = (keywordCounts[keyword] ?? 0) + matches.length
        total += matches.length
      }
    }
  }

  return { total, keywords: keywordCounts }
}

async function main() {
  console.log('Google Review Keyword Scan\n')

  // Fetch all venues with a google_place_id
  console.log('1. Fetching venues from Supabase...')
  const { data: venues, error } = await supabase
    .from('venues')
    .select('id, name, google_place_id, patio_confidence, data_sources')
    .not('google_place_id', 'is', null)

  if (error) {
    console.error('Failed to fetch venues:', error.message)
    process.exit(1)
  }

  const venueRows = (venues ?? []) as VenueRow[]
  console.log(`   ${venueRows.length} venues with google_place_id\n`)

  if (venueRows.length === 0) {
    console.log('No venues with Google Place IDs found. Run bootstrap-venues.ts first.')
    return
  }

  console.log('2. Scanning reviews for patio keywords...\n')

  let scanned = 0
  let withMentions = 0
  let upgraded = 0
  const results: Array<{ name: string; mentions: number; keywords: string[] }> = []

  for (const venue of venueRows) {
    if (!venue.google_place_id) continue

    scanned++
    process.stdout.write(`  [${scanned}/${venueRows.length}] ${venue.name}... `)

    const reviews = await fetchReviews(venue.google_place_id)
    const { total, keywords } = countKeywordMentions(reviews)

    if (total === 0) {
      console.log(`${reviews.length} reviews, no patio keywords`)
    } else {
      withMentions++
      const topKeywords = Object.entries(keywords)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k}(${v})`)

      console.log(`${reviews.length} reviews, ${total} mentions: ${topKeywords.join(', ')}`)

      results.push({
        name: venue.name,
        mentions: total,
        keywords: Object.keys(keywords),
      })

      // Update data_sources with review scan results
      const dataSources = {
        ...(venue.data_sources ?? {}),
        review_keywords: true,
        review_patio_mentions: total,
      }

      const shouldUpgrade = total >= MIN_MENTIONS_TO_VERIFY && venue.patio_confidence === 'estimated'

      const updates: Record<string, unknown> = { data_sources: dataSources }
      if (shouldUpgrade) {
        updates.patio_confidence = 'verified'
        upgraded++
        console.log(`    ↑ Upgraded confidence: estimated → verified (${total} mentions)`)
      }

      const { error: updateError } = await supabase
        .from('venues')
        .update(updates)
        .eq('id', venue.id)

      if (updateError) {
        console.error(`    Error updating ${venue.name}:`, updateError.message)
      }
    }

    await new Promise((r) => setTimeout(r, DELAY_MS))
  }

  // Summary
  console.log(`\n--- Summary ---`)
  console.log(`Venues scanned:                ${scanned}`)
  console.log(`With patio mentions:           ${withMentions}`)
  console.log(`Confidence upgraded:           ${upgraded}`)

  if (results.length > 0) {
    console.log(`\nTop venues by patio mentions:`)
    results
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 10)
      .forEach((r) => {
        console.log(`  ${r.mentions} mentions — ${r.name}`)
      })
  }
}

main().catch(console.error)
