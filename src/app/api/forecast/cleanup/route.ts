import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createServiceClient } from '@/lib/supabase'
import { cleanupStaleForecasts } from '@/lib/forecast-engine'

/**
 * Nightly cron endpoint to delete forecast rows older than 2 days.
 * POST /api/forecast/cleanup?secret=CRON_SECRET
 */
export async function POST(request: Request) {
  const headersList = await headers()
  const authHeader = headersList.get('authorization')
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  if (secret !== process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  try {
    const deleted = await cleanupStaleForecasts(supabase)
    return NextResponse.json({
      message: `Cleaned up ${deleted} stale forecast rows`,
      deleted,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Forecast cleanup error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
