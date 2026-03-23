import { getSupabase } from './supabase'
import { getCurrentSlot } from './suncalc-helpers'
import { continuousSunMinutes, nextSunWindow, bestSunWindow } from './venues'
import type { Venue, VenueWithForecast, VenueSunForecast } from '@/types'

/**
 * Fetch all venues with their current forecast status
 */
export async function getVenuesWithForecasts(
  slotTime?: Date
): Promise<VenueWithForecast[]> {
  const db = getSupabase()
  if (!db) return []

  const slot = slotTime ?? getCurrentSlot()

  // Fetch venues
  const { data: venues, error: venuesError } = await db
    .from('venues')
    .select('*')
    .order('name')

  if (venuesError || !venues) {
    console.error('Error fetching venues:', venuesError)
    return []
  }

  // Fetch forecasts for today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data: forecasts, error: forecastError } = await db
    .from('venue_sun_forecast')
    .select('*')
    .gte('slot_starts_at', today.toISOString())
    .lt('slot_starts_at', tomorrow.toISOString())

  if (forecastError) {
    console.error('Error fetching forecasts:', forecastError)
  }

  const forecastsByVenue = new Map<string, VenueSunForecast[]>()
  for (const f of forecasts ?? []) {
    const existing = forecastsByVenue.get(f.venue_id) ?? []
    existing.push(f)
    forecastsByVenue.set(f.venue_id, existing)
  }

  return venues.map((venue: Venue) => {
    const vForecasts = forecastsByVenue.get(venue.id) ?? []

    // Find current slot forecast
    const currentForecast = vForecasts.find((f) => {
      const fSlot = new Date(f.slot_starts_at)
      return Math.abs(fSlot.getTime() - slot.getTime()) < 15 * 60 * 1000
    })

    const sunMins = currentForecast?.status === 'sun'
      ? continuousSunMinutes(vForecasts, slot)
      : 0

    const nextSun = currentForecast?.status !== 'sun'
      ? nextSunWindow(vForecasts, slot)
      : null

    const best = bestSunWindow(vForecasts)

    return {
      ...venue,
      current_status: currentForecast?.status ?? 'unknown',
      current_confidence: currentForecast?.confidence ?? venue.patio_confidence,
      forecasts: vForecasts,
      continuous_sun_minutes: sunMins,
      minutes_until_sun: nextSun
        ? Math.round((nextSun.getTime() - slot.getTime()) / 60000)
        : null,
      best_sun_start: best?.start.toISOString() ?? null,
      best_sun_end: best?.end.toISOString() ?? null,
    }
  })
}

/**
 * Fetch a single venue by slug with its forecasts
 */
export async function getVenueBySlug(
  slug: string
): Promise<VenueWithForecast | null> {
  const db = getSupabase()
  if (!db) return null

  const { data: venue, error } = await db
    .from('venues')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !venue) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data: forecasts } = await db
    .from('venue_sun_forecast')
    .select('*')
    .eq('venue_id', venue.id)
    .gte('slot_starts_at', today.toISOString())
    .lt('slot_starts_at', tomorrow.toISOString())
    .order('slot_starts_at')

  const slot = getCurrentSlot()
  const vForecasts = forecasts ?? []
  const currentForecast = vForecasts.find((f) => {
    const fSlot = new Date(f.slot_starts_at)
    return Math.abs(fSlot.getTime() - slot.getTime()) < 15 * 60 * 1000
  })

  const sunMins = currentForecast?.status === 'sun'
    ? continuousSunMinutes(vForecasts, slot)
    : 0

  const nextSun = currentForecast?.status !== 'sun'
    ? nextSunWindow(vForecasts, slot)
    : null

  const best = bestSunWindow(vForecasts)

  return {
    ...venue,
    current_status: currentForecast?.status ?? 'unknown',
    current_confidence: currentForecast?.confidence ?? venue.patio_confidence,
    forecasts: vForecasts,
    continuous_sun_minutes: sunMins,
    minutes_until_sun: nextSun
      ? Math.round((nextSun.getTime() - slot.getTime()) / 60000)
      : null,
    best_sun_start: best?.start.toISOString() ?? null,
    best_sun_end: best?.end.toISOString() ?? null,
  }
}

/**
 * Fetch venues that are currently sunny (for /sunny-now)
 */
export async function getSunnyNowVenues(): Promise<VenueWithForecast[]> {
  const venues = await getVenuesWithForecasts()
  return venues.filter((v) => v.current_status === 'sun')
}
