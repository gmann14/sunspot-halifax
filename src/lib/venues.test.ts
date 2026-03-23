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
} from './venues'
import type { VenueSunForecast } from '@/types'

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
