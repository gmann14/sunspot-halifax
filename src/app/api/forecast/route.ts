import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createServiceClient } from '@/lib/supabase'
import { computeForecasts, upsertForecasts, cleanupStaleForecasts } from '@/lib/forecast-engine'

/**
 * Cron endpoint to compute sun forecasts for all venues.
 * POST /api/forecast?secret=CRON_SECRET
 *
 * Query params:
 *   mode=full    — compute all slots sunrise to sunset (called at sunrise)
 *   mode=current — compute current slot only (called every 15 min) [default]
 *   cleanup=true — also delete forecast rows older than 2 days
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

  const mode = (searchParams.get('mode') ?? 'current') as 'full' | 'current'
  const shouldCleanup = searchParams.get('cleanup') === 'true'

  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  try {
    // Compute forecasts
    const { rows, venueCount, slotCount } = await computeForecasts(supabase, mode)

    if (rows.length === 0) {
      return NextResponse.json({
        message: 'No slots to compute (sun may be down)',
        mode,
        venues: venueCount,
      })
    }

    // Upsert into database
    await upsertForecasts(supabase, rows)

    // Optional cleanup of stale data
    let cleanedUp = 0
    if (shouldCleanup) {
      cleanedUp = await cleanupStaleForecasts(supabase)
    }

    return NextResponse.json({
      message: `Computed ${rows.length} forecast rows for ${venueCount} venues`,
      mode,
      slots: slotCount,
      venues: venueCount,
      forecasts: rows.length,
      cleaned_up: cleanedUp,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Forecast computation error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
