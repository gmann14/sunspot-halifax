'use client'

import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'sunspot_recently_viewed'
const MAX_ITEMS = 10

function readRecent(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string').slice(0, MAX_ITEMS) : []
  } catch {
    return []
  }
}

function writeRecent(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, MAX_ITEMS)))
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

export function useRecentlyViewed() {
  const [recentIds, setRecentIds] = useState<string[]>([])

  useEffect(() => {
    setRecentIds(readRecent())
  }, [])

  const addRecentlyViewed = useCallback((venueId: string) => {
    setRecentIds((prev) => {
      const filtered = prev.filter((id) => id !== venueId)
      const next = [venueId, ...filtered].slice(0, MAX_ITEMS)
      writeRecent(next)
      return next
    })
  }, [])

  return { recentIds, addRecentlyViewed }
}
