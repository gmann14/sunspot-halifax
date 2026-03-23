import { describe, it, expect } from 'vitest'
import {
  getSunTimes,
  getSunPosition,
  generateDaySlots,
  getCurrentSlot,
  isSunUp,
  projectPoint,
  formatTimeAT,
} from './suncalc-helpers'

describe('getSunTimes', () => {
  it('returns sunrise before sunset', () => {
    const { sunrise, sunset } = getSunTimes(new Date('2026-06-21T12:00:00'))
    expect(sunrise.getTime()).toBeLessThan(sunset.getTime())
  })

  it('returns golden hour before sunset', () => {
    const { goldenHour, sunset } = getSunTimes(new Date('2026-06-21T12:00:00'))
    expect(goldenHour.getTime()).toBeLessThan(sunset.getTime())
  })
})

describe('getSunPosition', () => {
  it('returns positive altitude at noon in summer', () => {
    const pos = getSunPosition(
      new Date('2026-06-21T16:00:00Z'), // ~12pm AT
      44.6476,
      -63.5728
    )
    expect(pos.altitude).toBeGreaterThan(0)
  })

  it('returns bearing between 0 and 360', () => {
    const pos = getSunPosition(
      new Date('2026-06-21T16:00:00Z'),
      44.6476,
      -63.5728
    )
    expect(pos.bearing).toBeGreaterThanOrEqual(0)
    expect(pos.bearing).toBeLessThan(360)
  })
})

describe('generateDaySlots', () => {
  it('generates slots at 15-minute intervals', () => {
    const slots = generateDaySlots(new Date('2026-06-21T12:00:00'))
    expect(slots.length).toBeGreaterThan(0)

    for (let i = 1; i < slots.length; i++) {
      const diff = slots[i].getTime() - slots[i - 1].getTime()
      expect(diff).toBe(15 * 60 * 1000)
    }
  })

  it('first slot is at or after sunrise', () => {
    const date = new Date('2026-06-21T12:00:00')
    const slots = generateDaySlots(date)
    const { sunrise } = getSunTimes(date)
    expect(slots[0].getTime()).toBeGreaterThanOrEqual(sunrise.getTime())
  })
})

describe('getCurrentSlot', () => {
  it('rounds down to 15-minute boundary', () => {
    const date = new Date('2026-06-21T14:37:00')
    const slot = getCurrentSlot(date)
    expect(slot.getMinutes()).toBe(30)
    expect(slot.getSeconds()).toBe(0)
    expect(slot.getMilliseconds()).toBe(0)
  })
})

describe('isSunUp', () => {
  it('returns true at noon in summer', () => {
    expect(isSunUp(new Date('2026-06-21T16:00:00Z'))).toBe(true) // ~12pm AT
  })

  it('returns false at midnight', () => {
    expect(isSunUp(new Date('2026-06-21T04:00:00Z'))).toBe(false) // midnight AT
  })
})

describe('projectPoint', () => {
  it('projects a point northward', () => {
    const [lng, lat] = projectPoint(44.6476, -63.5728, 0, 1000)
    expect(lat).toBeGreaterThan(44.6476)
    expect(Math.abs(lng - (-63.5728))).toBeLessThan(0.001) // roughly same longitude
  })

  it('projects a point eastward', () => {
    const [lng, lat] = projectPoint(44.6476, -63.5728, 90, 1000)
    expect(lng).toBeGreaterThan(-63.5728)
    expect(Math.abs(lat - 44.6476)).toBeLessThan(0.001) // roughly same latitude
  })
})

describe('formatTimeAT', () => {
  it('formats time correctly', () => {
    const formatted = formatTimeAT(new Date('2026-06-21T18:30:00Z'))
    // This should be in Atlantic Time (UTC-3 in summer)
    expect(formatted).toBeTruthy()
    expect(typeof formatted).toBe('string')
  })
})
