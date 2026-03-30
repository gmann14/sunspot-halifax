import { track } from '@vercel/analytics'

export function trackEvent(name: string, props?: Record<string, string | number | boolean>) {
  try {
    track(name, props)
  } catch {
    // Analytics not loaded — ignore
  }
}
