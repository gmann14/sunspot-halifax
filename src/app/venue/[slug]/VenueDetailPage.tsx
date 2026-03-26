'use client'

import { Suspense, lazy } from 'react'
import Link from 'next/link'
import type { VenueWithForecast } from '@/types'
import { formatPriceLevel, isVenueOpen } from '@/lib/venues'
import { formatTimeAT, getCurrentSlot, isPatioSeason } from '@/lib/suncalc-helpers'
import ForecastBar from '@/components/ForecastBar'
import { MapSkeleton } from '@/components/LoadingSkeleton'
import ShareButton from '@/components/ShareButton'

const Map = lazy(() => import('@/components/Map'))

interface VenueDetailPageProps {
  venue: VenueWithForecast
}

export default function VenueDetailPage({ venue }: VenueDetailPageProps) {
  const now = getCurrentSlot()
  const isOpen = isVenueOpen(venue, now)
  const isSunny = venue.current_status === 'sun'
  const offSeason = !isPatioSeason(now)

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
  const typeBadge = venue.type.charAt(0).toUpperCase() + venue.type.slice(1)

  return (
    <div className="min-h-dvh bg-gray-50">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
          <Link
            href="/"
            className="text-sm text-amber-600 hover:text-amber-700 font-medium"
          >
            ← Back to all venues
          </Link>
          <span className="text-sm font-bold text-amber-600">SunSpot Halifax</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto bg-white min-h-[calc(100dvh-49px)]">
        {/* Photo */}
        {venue.photos?.[0] ? (
          <div className="w-full h-56 bg-gray-100 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={venue.photos[0].url}
              alt={venue.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2">
              <span className="inline-block text-xs font-medium bg-white/90 backdrop-blur-sm text-gray-700 px-2 py-1 rounded-full">
                {typeBadge}
              </span>
            </div>
          </div>
        ) : (
          <div className="w-full h-32 bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center">
            <span className="text-4xl">☀️</span>
          </div>
        )}

        <div className="px-4 py-4">
          {/* Name + rating */}
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-bold leading-tight">{venue.name}</h1>
            {venue.rating && (
              <span className="shrink-0 text-sm font-medium bg-amber-50 text-amber-700 px-2 py-1 rounded">
                ⭐ {venue.rating}
              </span>
            )}
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            <span>{typeBadge}</span>
            {venue.price_level && (
              <>
                <span className="text-gray-300">·</span>
                <span>{formatPriceLevel(venue.price_level)}</span>
              </>
            )}
            <span className="text-gray-300">·</span>
            {isOpen ? (
              <span className="text-green-600 font-medium">Open now</span>
            ) : (
              <span className="text-red-500 font-medium">Closed</span>
            )}
          </div>

          {/* Off-season banner */}
          {offSeason && venue.patio_season_only && (
            <div className="mt-3 p-3 rounded-lg bg-blue-50 text-blue-700 text-sm">
              Patio season runs May–October. This patio may be closed for the season.
            </div>
          )}

          {/* Sun status card */}
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

          {/* Address */}
          {venue.address && (
            <p className="text-sm text-gray-600 mt-4">📍 {venue.address}</p>
          )}

          {/* Photo attribution */}
          {venue.photos?.[0]?.html_attributions?.[0] && (
            <p
              className="text-[10px] text-gray-400 mt-2"
              dangerouslySetInnerHTML={{
                __html: `Photo: ${venue.photos[0].html_attributions[0]}`,
              }}
            />
          )}

          {/* Action buttons */}
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
            <ShareButton
              url={`${typeof window !== 'undefined' ? window.location.origin : ''}/venue/${venue.slug}`}
              title={`${venue.name} — SunSpot Halifax`}
              text={`${sunStatusText} at ${venue.name}`}
              className="px-4 py-3 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            />
          </div>

          {/* Confidence label */}
          <p className="text-xs text-gray-400 mt-4 text-center">
            📍 Patio location:{' '}
            {venue.patio_confidence === 'verified' ? 'Verified' : 'Estimated'}
          </p>
        </div>

        {/* Lazy-loaded map below the fold */}
        <div className="h-64 bg-gray-100 border-t border-gray-100">
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
