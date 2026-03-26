import { describe, it, expect } from 'vitest'
import {
  haversineDistance,
  walkingMinutes,
  formatWalkingTime,
  slugify,
  formatPriceLevel,
  continuousSunMinutes,
  nextSunWindow,
  bestSunWindow,
  sortByBestMatch,
  isVenueOpen,
} from './venues'
import type { VenueSunForecast, VenueWithForecast } from '@/types'

describe('haversineDistance', () => {
  it('returns 0 for same point', () => {
    const d = haversineDistance(44.6476, -63.5728, 44.6476, -63.5728)
    expect(d).toBe(0)
  })

  it('returns approximately correct distance for known points', () => {
    // Halifax downtown to Dartmouth Ferry Terminal (~1.5km)
    const d = haversineDistance(44.6476, -63.5728, 44.6666, -63.5652)
    expect(d).toBeGreaterThan(1000)
    expect(d).toBeLessThan(3000)
  })
})

describe('walkingMinutes', () => {
  it('returns 1 for very short distances', () => {
    expect(walkingMinutes(10)).toBe(1)
  })

  it('returns null for distances over 2400m', () => {
    expect(walkingMinutes(2500)).toBeNull()
  })

  it('calculates correctly for 400m', () => {
    expect(walkingMinutes(400)).toBe(5) // 400/80 = 5
  })
})

describe('formatWalkingTime', () => {
  it('returns "30+ min walk" for far distances', () => {
    expect(formatWalkingTime(3000)).toBe('30+ min walk')
  })

  it('returns "1 min walk" for very close', () => {
    expect(formatWalkingTime(10)).toBe('1 min walk')
  })
})

describe('slugify', () => {
  it('converts name to slug', () => {
    expect(slugify('The Stubborn Goat Beer Garden')).toBe(
      'the-stubborn-goat-beer-garden'
    )
  })

  it('strips special characters', () => {
    expect(slugify("Salty's on the Waterfront")).toBe('saltys-on-the-waterfront')
  })

  it('handles multiple spaces', () => {
    expect(slugify('The   Old   Triangle')).toBe('the-old-triangle')
  })
})

describe('formatPriceLevel', () => {
  it('returns empty for null', () => {
    expect(formatPriceLevel(null)).toBe('')
  })

  it('returns correct dollar signs', () => {
    expect(formatPriceLevel(1)).toBe('$')
    expect(formatPriceLevel(2)).toBe('$$')
    expect(formatPriceLevel(3)).toBe('$$$')
    expect(formatPriceLevel(4)).toBe('$$$$')
  })
})

function makeForecast(
  venueId: string,
  slotStr: string,
  status: 'sun' | 'shade' | 'unknown'
): VenueSunForecast {
  return {
    id: `${venueId}-${slotStr}`,
    venue_id: venueId,
    slot_starts_at: slotStr,
    computed_at: new Date().toISOString(),
    status,
    confidence: 'estimated',
  }
}

describe('continuousSunMinutes', () => {
  it('counts consecutive sun slots', () => {
    const base = new Date('2026-06-21T14:00:00Z')
    const forecasts = [
      makeForecast('v1', '2026-06-21T14:00:00.000Z', 'sun'),
      makeForecast('v1', '2026-06-21T14:15:00.000Z', 'sun'),
      makeForecast('v1', '2026-06-21T14:30:00.000Z', 'sun'),
      makeForecast('v1', '2026-06-21T14:45:00.000Z', 'shade'),
    ]
    expect(continuousSunMinutes(forecasts, base)).toBe(45)
  })

  it('returns 0 for no sun', () => {
    const base = new Date('2026-06-21T14:00:00Z')
    const forecasts = [
      makeForecast('v1', '2026-06-21T14:00:00.000Z', 'shade'),
    ]
    expect(continuousSunMinutes(forecasts, base)).toBe(0)
  })
})

describe('nextSunWindow', () => {
  it('finds the next sun slot', () => {
    const base = new Date('2026-06-21T14:00:00Z')
    const forecasts = [
      makeForecast('v1', '2026-06-21T14:00:00.000Z', 'shade'),
      makeForecast('v1', '2026-06-21T14:15:00.000Z', 'shade'),
      makeForecast('v1', '2026-06-21T14:30:00.000Z', 'sun'),
    ]
    const next = nextSunWindow(forecasts, base)
    expect(next).toEqual(new Date('2026-06-21T14:30:00.000Z'))
  })

  it('returns null when no sun remaining', () => {
    const base = new Date('2026-06-21T14:00:00Z')
    const forecasts = [
      makeForecast('v1', '2026-06-21T14:00:00.000Z', 'shade'),
    ]
    expect(nextSunWindow(forecasts, base)).toBeNull()
  })
})

describe('bestSunWindow', () => {
  it('finds the longest continuous sun period', () => {
    const forecasts = [
      makeForecast('v1', '2026-06-21T10:00:00.000Z', 'sun'),
      makeForecast('v1', '2026-06-21T10:15:00.000Z', 'sun'),
      makeForecast('v1', '2026-06-21T10:30:00.000Z', 'shade'),
      makeForecast('v1', '2026-06-21T14:00:00.000Z', 'sun'),
      makeForecast('v1', '2026-06-21T14:15:00.000Z', 'sun'),
      makeForecast('v1', '2026-06-21T14:30:00.000Z', 'sun'),
      makeForecast('v1', '2026-06-21T14:45:00.000Z', 'sun'),
    ]
    const best = bestSunWindow(forecasts)
    expect(best).not.toBeNull()
    expect(best!.start).toEqual(new Date('2026-06-21T14:00:00.000Z'))
    expect(best!.end).toEqual(new Date('2026-06-21T15:00:00.000Z'))
  })

  it('returns null when no sun', () => {
    const forecasts = [
      makeForecast('v1', '2026-06-21T10:00:00.000Z', 'shade'),
    ]
    expect(bestSunWindow(forecasts)).toBeNull()
  })
})

function makeVenue(
  overrides: Partial<VenueWithForecast> & { name: string }
): VenueWithForecast {
  return {
    id: overrides.name.toLowerCase().replace(/\s/g, '-'),
    slug: overrides.name.toLowerCase().replace(/\s/g, '-'),
    type: 'restaurant',
    lat: 44.6476,
    lng: -63.5728,
    sun_query_point: { type: 'Point', coordinates: [-63.5728, 44.6476] },
    patio_confidence: 'estimated',
    google_place_id: null,
    website: null,
    phone: null,
    rating: null,
    price_level: null,
    hours: null,
    patio_season_only: false,
    address: null,
    neighborhood: null,
    photos: null,
    last_verified_at: null,
    data_sources: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('sortByBestMatch', () => {
  it('puts sunny venues before shaded ones', () => {
    const venues = [
      makeVenue({ name: 'Shady Bar', current_status: 'shade', continuous_sun_minutes: 0 }),
      makeVenue({ name: 'Sunny Cafe', current_status: 'sun', continuous_sun_minutes: 60 }),
    ]
    const sorted = sortByBestMatch(venues)
    expect(sorted[0].name).toBe('Sunny Cafe')
    expect(sorted[1].name).toBe('Shady Bar')
  })

  it('sorts sunny venues by remaining sun time descending', () => {
    const venues = [
      makeVenue({ name: 'Short Sun', current_status: 'sun', continuous_sun_minutes: 15 }),
      makeVenue({ name: 'Long Sun', current_status: 'sun', continuous_sun_minutes: 90 }),
      makeVenue({ name: 'Med Sun', current_status: 'sun', continuous_sun_minutes: 45 }),
    ]
    const sorted = sortByBestMatch(venues)
    expect(sorted.map((v) => v.name)).toEqual(['Long Sun', 'Med Sun', 'Short Sun'])
  })

  it('sorts shade venues by minutes until next sun ascending', () => {
    const venues = [
      makeVenue({ name: 'Late Sun', current_status: 'shade', minutes_until_sun: 120 }),
      makeVenue({ name: 'Soon Sun', current_status: 'shade', minutes_until_sun: 15 }),
      makeVenue({ name: 'No Sun', current_status: 'shade', minutes_until_sun: null }),
    ]
    const sorted = sortByBestMatch(venues)
    expect(sorted.map((v) => v.name)).toEqual(['Soon Sun', 'Late Sun', 'No Sun'])
  })

  it('uses distance as tie-breaker', () => {
    const venues = [
      makeVenue({ name: 'Far', current_status: 'sun', continuous_sun_minutes: 60, lat: 44.66, lng: -63.57 }),
      makeVenue({ name: 'Near', current_status: 'sun', continuous_sun_minutes: 60, lat: 44.648, lng: -63.573 }),
    ]
    const sorted = sortByBestMatch(venues, 44.6476, -63.5728)
    expect(sorted[0].name).toBe('Near')
    expect(sorted[1].name).toBe('Far')
  })

  it('falls back to alphabetical as final tie-breaker', () => {
    const venues = [
      makeVenue({ name: 'Zeta', current_status: 'sun', continuous_sun_minutes: 60 }),
      makeVenue({ name: 'Alpha', current_status: 'sun', continuous_sun_minutes: 60 }),
    ]
    const sorted = sortByBestMatch(venues)
    expect(sorted[0].name).toBe('Alpha')
    expect(sorted[1].name).toBe('Zeta')
  })
})

describe('isVenueOpen', () => {
  it('returns true when no hours data', () => {
    const venue = makeVenue({ name: 'No Hours', hours: null })
    expect(isVenueOpen(venue)).toBe(true)
  })

  it('returns false when closed on that day', () => {
    // Create hours with only Monday open
    const venue = makeVenue({
      name: 'Mon Only',
      hours: { mon: [{ open: '11:00', close: '23:00' }] },
    })
    // Use a known Tuesday in Halifax timezone
    const tuesday = new Date('2026-06-23T15:00:00-03:00') // Tuesday
    expect(isVenueOpen(venue, tuesday)).toBe(false)
  })

  it('returns true during open hours', () => {
    const venue = makeVenue({
      name: 'Open',
      hours: {
        mon: [{ open: '11:00', close: '23:00' }],
        tue: [{ open: '11:00', close: '23:00' }],
        wed: [{ open: '11:00', close: '23:00' }],
        thu: [{ open: '11:00', close: '23:00' }],
        fri: [{ open: '11:00', close: '23:00' }],
        sat: [{ open: '11:00', close: '23:00' }],
        sun: [{ open: '11:00', close: '23:00' }],
      },
    })
    // 3pm on a Wednesday in Halifax
    const wed = new Date('2026-06-24T15:00:00-03:00')
    expect(isVenueOpen(venue, wed)).toBe(true)
  })
})
