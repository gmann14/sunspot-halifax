'use client'

import { useEffect, useRef } from 'react'
import type { VenueWithForecast } from '@/types'
import { formatPriceLevel, isVenueOpen, formatWalkingTime } from '@/lib/venues'
import { formatTimeAT } from '@/lib/suncalc-helpers'
import ForecastBar from './ForecastBar'
import ShareButton from './ShareButton'

interface VenueDetailSheetProps {
  venue: VenueWithForecast | null
  onClose: () => void
  distanceMeters?: number
  selectedTime: Date
}

export default function VenueDetailSheet({
  venue,
  onClose,
  distanceMeters,
  selectedTime,
}: VenueDetailSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const currentY = useRef(0)

  useEffect(() => {
    if (!venue) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [venue, onClose])

  function handleTouchStart(e: React.TouchEvent) {
    startY.current = e.touches[0].clientY
  }

  function handleTouchMove(e: React.TouchEvent) {
    currentY.current = e.touches[0].clientY
    const diff = currentY.current - startY.current
    if (diff > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${diff}px)`
    }
  }

  function handleTouchEnd() {
    const diff = currentY.current - startY.current
    if (diff > 100) {
      onClose()
    } else if (sheetRef.current) {
      sheetRef.current.style.transform = ''
    }
    startY.current = 0
    currentY.current = 0
  }

  if (!venue) return null

  const isOpen = isVenueOpen(venue, selectedTime)
  const isSunny = venue.current_status === 'sun'

  const sunStatusText = (() => {
    if (isSunny && venue.continuous_sun_minutes) {
      const endTime = new Date(selectedTime.getTime() + venue.continuous_sun_minutes * 60000)
      return `Sunny predicted until ${formatTimeAT(endTime)}`
    }
    if (venue.current_status === 'shade' && venue.minutes_until_sun !== null) {
      const nextSunTime = new Date(selectedTime.getTime() + (venue.minutes_until_sun ?? 0) * 60000)
      return `Sun predicted at ${formatTimeAT(nextSunTime)}`
    }
    if (venue.current_status === 'shade') return 'In shade — no more sun today'
    return 'Sun status unknown'
  })()

  const bestSunText = (() => {
    if (venue.best_sun_start && venue.best_sun_end) {
      return `Best: ${formatTimeAT(new Date(venue.best_sun_start))}–${formatTimeAT(
        new Date(venue.best_sun_end)
      )}`
    }
    return null
  })()

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`

  return (
    <div className="fixed inset-0 z-50" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl max-h-[85vh] overflow-y-auto transition-transform"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2" aria-hidden="true">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        <div className="px-4 pb-6">
          {/* Photo */}
          {venue.photos?.[0] && (
            <div className="relative w-full h-40 rounded-lg overflow-hidden mb-3 bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={venue.photos[0].url}
                alt={venue.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Name + status */}
          <h2 className="text-xl font-bold">{venue.name}</h2>
          <p
            className={`text-sm mt-1 font-medium ${
              isSunny ? 'text-amber-600' : 'text-gray-500'
            }`}
          >
            {isSunny ? '☀️' : '◾'} {sunStatusText}
          </p>

          {/* Meta info */}
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 flex-wrap">
            {venue.rating && <span>⭐ {venue.rating}</span>}
            <span className="text-gray-300">|</span>
            <span>
              {venue.type.charAt(0).toUpperCase() + venue.type.slice(1)}
            </span>
            {venue.price_level && (
              <>
                <span className="text-gray-300">|</span>
                <span>{formatPriceLevel(venue.price_level)}</span>
              </>
            )}
          </div>

          {/* Address + walking time */}
          {venue.address && (
            <p className="text-sm text-gray-500 mt-2">
              📍 {venue.address}
              {distanceMeters !== undefined && (
                <span> · {formatWalkingTime(distanceMeters)}</span>
              )}
            </p>
          )}

          {/* Open/Closed */}
          <p className="text-sm mt-1">
            {isOpen ? (
              <span className="text-green-600 font-medium">Open</span>
            ) : (
              <span className="text-red-500 font-medium">Closed</span>
            )}
          </p>

          {/* Forecast bar */}
          {venue.forecasts && venue.forecasts.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-600">
                  Sun Forecast Today
                </span>
                {bestSunText && (
                  <span className="text-xs text-amber-600 font-medium">
                    {bestSunText}
                  </span>
                )}
              </div>
              <ForecastBar forecasts={venue.forecasts} />
            </div>
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
          <div className="flex gap-3 mt-4">
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 text-center text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Directions
            </a>
            {venue.website && (
              <a
                href={venue.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 text-center text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Website
              </a>
            )}
            <ShareButton
              url={`${typeof window !== 'undefined' ? window.location.origin : ''}/venue/${venue.slug}`}
              title={`${venue.name} — SunSpot Halifax`}
              text={`${sunStatusText} at ${venue.name}`}
              className="px-4 py-2.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            />
          </div>

          {/* Confidence label */}
          <p className="text-xs text-gray-400 mt-4 text-center">
            📍 Patio location:{' '}
            {venue.patio_confidence === 'verified' ? 'Verified' : 'Estimated'}
          </p>
        </div>
      </div>
    </div>
  )
}
