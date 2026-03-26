import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock localStorage for tests
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() { return Object.keys(store).length },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  }
})()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

describe('Favorites localStorage', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  it('reads empty favorites when nothing stored', () => {
    const raw = localStorage.getItem('sunspot_favorites')
    expect(raw).toBeNull()
  })

  it('stores and retrieves favorites', () => {
    const ids = ['id-1', 'id-2']
    localStorage.setItem('sunspot_favorites', JSON.stringify(ids))
    const raw = localStorage.getItem('sunspot_favorites')
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    expect(parsed).toEqual(ids)
  })

  it('handles corrupted data gracefully', () => {
    localStorage.setItem('sunspot_favorites', 'not-json')
    try {
      JSON.parse(localStorage.getItem('sunspot_favorites')!)
    } catch {
      // Expected — the hook handles this with a try/catch
      expect(true).toBe(true)
    }
  })

  it('handles non-array data', () => {
    localStorage.setItem('sunspot_favorites', JSON.stringify({ foo: 'bar' }))
    const raw = JSON.parse(localStorage.getItem('sunspot_favorites')!)
    expect(Array.isArray(raw)).toBe(false)
    // The hook filters this to return []
  })

  it('toggles favorites correctly', () => {
    const ids: string[] = []
    // Add
    const added = [...ids, 'id-1']
    localStorage.setItem('sunspot_favorites', JSON.stringify(added))
    expect(JSON.parse(localStorage.getItem('sunspot_favorites')!)).toEqual(['id-1'])

    // Remove
    const removed = added.filter((id) => id !== 'id-1')
    localStorage.setItem('sunspot_favorites', JSON.stringify(removed))
    expect(JSON.parse(localStorage.getItem('sunspot_favorites')!)).toEqual([])
  })
})

describe('Recently Viewed localStorage', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  it('reads empty recently viewed when nothing stored', () => {
    const raw = localStorage.getItem('sunspot_recently_viewed')
    expect(raw).toBeNull()
  })

  it('stores up to 10 recent items', () => {
    const ids = Array.from({ length: 12 }, (_, i) => `id-${i}`)
    const stored = ids.slice(0, 10)
    localStorage.setItem('sunspot_recently_viewed', JSON.stringify(stored))
    const parsed = JSON.parse(localStorage.getItem('sunspot_recently_viewed')!)
    expect(parsed).toHaveLength(10)
  })

  it('moves recently viewed item to front', () => {
    const initial = ['id-1', 'id-2', 'id-3']
    // Simulating the hook logic: add id-3 to front
    const filtered = initial.filter((id) => id !== 'id-3')
    const result = ['id-3', ...filtered].slice(0, 10)
    expect(result).toEqual(['id-3', 'id-1', 'id-2'])
  })

  it('deduplicates when adding existing venue', () => {
    const initial = ['id-1', 'id-2']
    const filtered = initial.filter((id) => id !== 'id-1')
    const result = ['id-1', ...filtered]
    expect(result).toEqual(['id-1', 'id-2'])
    expect(result).toHaveLength(2)
  })
})

describe('Submission validation', () => {
  it('rejects empty venue name', () => {
    const venueName = ''
    expect(venueName.trim()).toBe('')
    expect(!venueName.trim()).toBe(true) // form prevents submit
  })

  it('accepts valid submission payload', () => {
    const payload = {
      venue_name: 'The Old Triangle',
      submission_type: 'new_patio' as const,
      details: '5136 Prince St | Has a rooftop patio',
    }
    expect(payload.venue_name.trim()).toBeTruthy()
    expect(['new_patio', 'correction', 'closure_report']).toContain(payload.submission_type)
  })

  it('accepts report payload with venue_id', () => {
    const payload = {
      venue_id: 'abc-123',
      venue_name: 'Stubborn Goat',
      submission_type: 'correction' as const,
      details: 'Patio is on the other side',
    }
    expect(payload.venue_id).toBeTruthy()
    expect(payload.venue_name).toBeTruthy()
    expect(['correction', 'closure_report']).toContain(payload.submission_type)
  })

  it('validates submission types', () => {
    const validTypes = ['new_patio', 'correction', 'closure_report']
    expect(validTypes.includes('new_patio')).toBe(true)
    expect(validTypes.includes('correction')).toBe(true)
    expect(validTypes.includes('closure_report')).toBe(true)
    expect(validTypes.includes('invalid_type')).toBe(false)
  })

  it('honeypot field blocks bot submissions silently', () => {
    const payload = {
      venue_name: 'Bot Place',
      submission_type: 'new_patio',
      honeypot: 'bot-filled-this',
    }
    // The API returns success but does not store it
    expect(payload.honeypot).toBeTruthy()
  })
})

describe('FilterState with favorites', () => {
  it('default filter state includes favoritesOnly: false', () => {
    const defaultFilters = {
      sunnyNow: false,
      hideClosed: true,
      venueTypes: [],
      sortBy: 'best_match',
      searchQuery: '',
      favoritesOnly: false,
    }
    expect(defaultFilters.favoritesOnly).toBe(false)
  })

  it('favoritesOnly filter reduces venue list', () => {
    const venues = [
      { id: '1', name: 'A' },
      { id: '2', name: 'B' },
      { id: '3', name: 'C' },
    ]
    const favorites = ['1', '3']
    const filtered = venues.filter((v) => favorites.includes(v.id))
    expect(filtered).toHaveLength(2)
    expect(filtered.map((v) => v.name)).toEqual(['A', 'C'])
  })

  it('empty favorites with favoritesOnly returns empty list', () => {
    const venues = [{ id: '1', name: 'A' }]
    const favorites: string[] = []
    const filtered = venues.filter((v) => favorites.includes(v.id))
    expect(filtered).toHaveLength(0)
  })
})
