import { describe, it, expect } from 'vitest'
import { getSunPosition, projectPoint, generateDaySlots } from './suncalc-helpers'

/**
 * Tests for forecast engine logic.
 * The core PostGIS ray intersection is tested via the DB function,
 * but we can test the SunCalc + geometry helpers used by the engine.
 */

describe('forecast engine helpers', () => {
  describe('getSunPosition bearing conversion', () => {
    it('returns bearing as degrees clockwise from north', () => {
      // Test at solar noon in summer — sun should be roughly south (~180°)
      const noon = new Date('2026-06-21T16:00:00Z') // ~noon Atlantic
      const pos = getSunPosition(noon, 44.6476, -63.5728)
      expect(pos.bearing).toBeGreaterThan(150)
      expect(pos.bearing).toBeLessThan(210)
      expect(pos.altitude).toBeGreaterThan(0)
    })

    it('returns negative altitude when sun is below horizon', () => {
      const midnight = new Date('2026-06-21T04:00:00Z') // midnight Atlantic
      const pos = getSunPosition(midnight, 44.6476, -63.5728)
      expect(pos.altitude).toBeLessThan(0)
    })

    it('bearing is between 0 and 360', () => {
      // Test several times throughout the day
      const times = [
        new Date('2026-06-21T10:00:00Z'), // morning
        new Date('2026-06-21T16:00:00Z'), // noon
        new Date('2026-06-21T22:00:00Z'), // evening
      ]
      for (const t of times) {
        const pos = getSunPosition(t, 44.6476, -63.5728)
        expect(pos.bearing).toBeGreaterThanOrEqual(0)
        expect(pos.bearing).toBeLessThan(360)
      }
    })
  })

  describe('projectPoint', () => {
    it('projects north correctly', () => {
      const [lng, lat] = projectPoint(44.6476, -63.5728, 0, 1000) // 1km north
      expect(lat).toBeGreaterThan(44.6476)
      expect(Math.abs(lng - (-63.5728))).toBeLessThan(0.001)
    })

    it('projects east correctly', () => {
      const [lng, lat] = projectPoint(44.6476, -63.5728, 90, 1000) // 1km east
      expect(lng).toBeGreaterThan(-63.5728)
      expect(Math.abs(lat - 44.6476)).toBeLessThan(0.001)
    })

    it('projects south correctly', () => {
      const [lng, lat] = projectPoint(44.6476, -63.5728, 180, 1000) // 1km south
      expect(lat).toBeLessThan(44.6476)
    })

    it('projects approximately correct distance', () => {
      const [lng, lat] = projectPoint(44.6476, -63.5728, 0, 500) // 500m north
      // At 44.6° lat, 1° lat ≈ 111,320m, so 500m ≈ 0.00449°
      const dLat = lat - 44.6476
      expect(dLat).toBeCloseTo(0.00449, 3)
    })
  })

  describe('generateDaySlots', () => {
    it('generates slots for a summer day', () => {
      const slots = generateDaySlots(new Date('2026-06-21'))
      // Summer solstice in Halifax: ~5:30am sunrise, ~9:00pm sunset
      // That's roughly 15.5 hours = 62 fifteen-minute slots
      expect(slots.length).toBeGreaterThan(50)
      expect(slots.length).toBeLessThan(70)
    })

    it('generates fewer slots for a winter day', () => {
      const slots = generateDaySlots(new Date('2026-12-21'))
      // Winter solstice: ~7:30am sunrise, ~4:30pm sunset
      // That's roughly 9 hours = 36 fifteen-minute slots
      expect(slots.length).toBeGreaterThan(30)
      expect(slots.length).toBeLessThan(45)
    })

    it('all slots are 15 minutes apart', () => {
      const slots = generateDaySlots(new Date('2026-06-21'))
      for (let i = 1; i < slots.length; i++) {
        const diff = slots[i].getTime() - slots[i - 1].getTime()
        expect(diff).toBe(15 * 60 * 1000)
      }
    })
  })

  describe('angular elevation geometry', () => {
    it('tall nearby building blocks low sun', () => {
      // 50m tall building at 100m distance
      const angularElevation = Math.atan2(50, 100)
      // Low sun at 10 degrees altitude
      const sunAltitude = (10 * Math.PI) / 180
      expect(angularElevation).toBeGreaterThan(sunAltitude)
    })

    it('short distant building does not block high sun', () => {
      // 10m tall building at 200m distance
      const angularElevation = Math.atan2(10, 200)
      // Sun at 45 degrees altitude
      const sunAltitude = (45 * Math.PI) / 180
      expect(angularElevation).toBeLessThan(sunAltitude)
    })

    it('tall building at edge of radius blocks low sun', () => {
      // Maritime Centre: 71m tall at 400m distance
      const angularElevation = Math.atan2(71, 400)
      const sunAltitude = (10 * Math.PI) / 180
      // 71/400 ≈ 0.1775 rad ≈ 10.17°, sun at 10° → blocks
      expect(angularElevation).toBeGreaterThan(sunAltitude)
    })
  })
})
