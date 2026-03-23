import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const { venue_id, venue_name, lat, lng, submission_type, details, submitted_by, honeypot } = body

    // Honeypot spam check
    if (honeypot) {
      // Bot filled in hidden field — silently accept to avoid detection
      return NextResponse.json({ success: true })
    }

    if (!venue_name || !submission_type) {
      return NextResponse.json(
        { error: 'venue_name and submission_type are required' },
        { status: 400 }
      )
    }

    const validTypes = ['new_patio', 'correction', 'closure_report']
    if (!validTypes.includes(submission_type)) {
      return NextResponse.json(
        { error: 'Invalid submission_type' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    const { error } = await supabase.from('user_submissions').insert({
      venue_id: venue_id || null,
      venue_name,
      lat: lat || null,
      lng: lng || null,
      submission_type,
      details: details || null,
      submitted_by: submitted_by || 'anonymous',
      status: 'pending',
    })

    if (error) {
      console.error('Submission error:', error)
      return NextResponse.json(
        { error: 'Failed to save submission' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
