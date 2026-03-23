'use client'

import { Suspense, lazy } from 'react'
import Link from 'next/link'
import type { VenueWithForecast } from '@/types'
import { formatPriceLevel, isVenueOpen, formatWalkingTime } from '@/lib/venues'
import { formatTimeAT, getCurrentSlot } from '@/lib/suncalc-helpers'
import ForecastBar from '@/components/ForecastBar'
import { MapSkeleton } from '@/components/LoadingSkeleton'

const Map = lazy(() => import('@/components/Map'))

interface VenueDetailPageProps {
  venue: VenueWithForecast
}

export default function VenueDetailPage({ venue }: VenueDetailPageProps) {
  const now = getCurrentSlot()
  const isOpen = isVenueOpen(venue, now)
  const isSunny = venue.current_status === 'sun'

  const sunStatusText = (() => {
    if (isSunny && venue.continuous_sun_minutes) {
      const endTime = new Date(now.getTime() + venue.continuous_sun_minutes * 60000)
      return `Sunny predicted until ${formatTimeAT(endTime)}`
    }
    if (venue.current_status === 'shade' && venue.minutes_until_sun !== null) {
      const nextSunTime = new Date(now.getTime() + (venue.minutes_until_sun ?? 0) * 60000)
      return `Sun predicted at ${formatTimeAT(nextSunTime)}`
    }
    if (venue.current_status === 'shade') return 'In shade — no more sun today'
    return 'Sun status unknown'
  })()

  const bestSunText = (() => {
    if (venue.best_sun_start && venue.best_sun_end) {
      return `Best predicted sun: ${formatTimeAT(new Date(venue.best_sun_start))}–${formatTimeAT(
        new Date(venue.best_sun_end)
      )}`
    }
    return null
  })()

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`

  return (
    <div className="min-h-dvh bg-white">
      {/* Back navigation */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3">
        <Link
          href="/"
          className="text-sm text-amber-600 hover:text-amber-700 font-medium"
        >
          ← Back to all venues
        </Link>
      </header>

      <main className="max-w-lg mx-auto">
        {/* Photo */}
        {venue.photos?.[0] && (
          <div className="w-full h-56 bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={venue.photos[0].url}
              alt={venue.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="px-4 py-4">
          {/* Name + type */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{venue.name}</h1>
              <span className="text-sm text-gray-500">
                {venue.type.charAt(0).toUpperCase() + venue.type.slice(1)}
              </span>
            </div>
            {venue.rating && (
              <span className="text-sm font-medium bg-amber-50 text-amber-700 px-2 py-1 rounded">
                ⭐ {venue.rating}
              </span>
            )}
          </div>

          {/* Sun status */}
          <div
            className={`mt-3 p-3 rounded-lg ${
              isSunny ? 'bg-amber-50 text-amber-800' : 'bg-gray-50 text-gray-600'
            }`}
          >
            <p className="font-medium">
              {isSunny ? '☀️' : '◾'} {sunStatusText}
            </p>
            {bestSunText && (
              <p className="text-sm mt-1 opacity-75">{bestSunText}</p>
            )}
          </div>

          {/* Forecast bar */}
          {venue.forecasts && venue.forecasts.length > 0 && (
            <div className="mt-4">
              <h2 className="text-sm font-medium text-gray-600 mb-2">
                Sun Forecast Today
              </h2>
              <ForecastBar forecasts={venue.forecasts} />
            </div>
          )}

          {/* Details */}
          <div className="mt-4 space-y-2 text-sm text-gray-600">
            {venue.address && <p>📍 {venue.address}</p>}
            {venue.price_level && (
              <p>💰 {formatPriceLevel(venue.price_level)}</p>
            )}
            <p>
              {isOpen ? (
                <span className="text-green-600 font-medium">Open now</span>
              ) : (
                <span className="text-red-500 font-medium">Closed</span>
              )}
            </p>
            <p>
              📍 Patio location:{' '}
              {venue.patio_confidence === 'verified' ? 'Verified' : 'Estimated'}
            </p>
          </div>

          {/* Photo attribution */}
          {venue.photos?.[0]?.html_attributions?.[0] && (
            <p
              className="text-[10px] text-gray-400 mt-2"
              dangerouslySetInnerHTML={{
                __html: `Photo: ${venue.photos[0].html_attributions[0]}`,
              }}
            />
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 text-center text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Directions
            </a>
            {venue.website && (
              <a
                href={venue.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 text-center text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Website
              </a>
            )}
            <button
              onClick={() => {
                const url = window.location.href
                if (navigator.share) {
                  navigator.share({ title: venue.name, url }).catch(() => {})
                } else {
                  navigator.clipboard.writeText(url).catch(() => {})
                }
              }}
              className="px-4 py-3 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Share
            </button>
          </div>
        </div>

        {/* Lazy-loaded map */}
        <div className="mt-6 h-64 bg-gray-100">
          <Suspense fallback={<MapSkeleton />}>
            <Map
              venues={[venue]}
              selectedVenue={venue}
              onVenueClick={() => {}}
              selectedTime={now}
            />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
