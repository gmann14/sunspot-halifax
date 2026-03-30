'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'sunspot_onboarding_seen'

export function useOnboarding() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true)

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY)
      if (!seen) {
        setHasSeenOnboarding(false)
      } else {
        setDismissed(new Set(JSON.parse(seen)))
      }
    } catch {
      // localStorage unavailable
    }
  }, [])

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev)
      next.add(id)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
      } catch {
        // localStorage unavailable
      }
      return next
    })
  }, [])

  const dismissAll = useCallback(() => {
    const all = new Set(['time_slider', 'sunny_now'])
    setDismissed(all)
    setHasSeenOnboarding(true)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...all]))
    } catch {
      // localStorage unavailable
    }
  }, [])

  const shouldShow = useCallback(
    (id: string) => !hasSeenOnboarding && !dismissed.has(id),
    [hasSeenOnboarding, dismissed]
  )

  return { shouldShow, dismiss, dismissAll }
}
