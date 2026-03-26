'use client'

import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'sunspot_favorites'

function readFavorites(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

function writeFavorites(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([])

  useEffect(() => {
    setFavorites(readFavorites())
  }, [])

  const toggleFavorite = useCallback((venueId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(venueId)
        ? prev.filter((id) => id !== venueId)
        : [...prev, venueId]
      writeFavorites(next)
      return next
    })
  }, [])

  const isFavorite = useCallback(
    (venueId: string) => favorites.includes(venueId),
    [favorites]
  )

  return { favorites, toggleFavorite, isFavorite }
}
