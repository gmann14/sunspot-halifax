'use client'

import type { VenueWithForecast } from '@/types'
import { formatWalkingTime, formatPriceLevel, isVenueOpen } from '@/lib/venues'
import { formatTimeAT } from '@/lib/suncalc-helpers'
import ForecastBar from './ForecastBar'

interface VenueCardProps {
  venue: VenueWithForecast
  onClick: () => void
  distanceMeters?: number
  selectedTime: Date
}

export default function VenueCard({
  venue,
  onClick,
  distanceMeters,
  selectedTime,
}: VenueCardProps) {
  const isOpen = isVenueOpen(venue, selectedTime)
  const isSunny = venue.current_status === 'sun'
  const isShade = venue.current_status === 'shade'

  const sunStatusText = (() => {
    if (isSunny && venue.continuous_sun_minutes) {
      const hours = Math.floor(venue.continuous_sun_minutes / 60)
      const mins = venue.continuous_sun_minutes % 60
      const timeStr = hours > 0
        ? `${hours}h${mins > 0 ? ` ${mins}m` : ''}`
        : `${mins}m`
      return `Sunny · ${timeStr} left`
    }
    if (isShade && venue.minutes_until_sun !== null) {
      const nextSunTime = new Date(selectedTime.getTime() + (venue.minutes_until_sun ?? 0) * 60000)
      return `Shade · Sun at ${formatTimeAT(nextSunTime)}`
    }
    if (isShade) return 'Shade · No more sun today'
    return 'Unknown'
  })()

  const typeBadge = venue.type.charAt(0).toUpperCase() + venue.type.slice(1)

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
        !isOpen ? 'opacity-60' : ''
      }`}
      aria-label={`${venue.name}, ${sunStatusText}, ${venue.patio_confidence} patio location`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isSunny ? 'bg-amber-500' : isShade ? 'bg-gray-400' : 'bg-gray-300'
              }`}
              aria-hidden="true"
            />
            <h3 className="font-semibold text-sm truncate">{venue.name}</h3>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {sunStatusText}
            {venue.rating && ` · ⭐${venue.rating}`}
            {venue.price_level && ` · ${formatPriceLevel(venue.price_level)}`}
          </p>
          {!isOpen && (
            <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-500 font-medium">
              Closed
            </span>
          )}
          {venue.forecasts && venue.forecasts.length > 0 && (
            <div className="mt-1.5">
              <ForecastBar forecasts={venue.forecasts} compact />
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          {distanceMeters !== undefined && (
            <span className="text-xs text-gray-400">
              {formatWalkingTime(distanceMeters)} 🚶
            </span>
          )}
          <div className="text-[10px] text-gray-400 mt-0.5">{typeBadge}</div>
        </div>
      </div>
    </button>
  )
}
