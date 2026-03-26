'use client'

import type { VenueWithForecast } from '@/types'
import { haversineDistance } from '@/lib/venues'
import VenueCard from './VenueCard'
import { NEIGHBORHOODS } from '@/lib/constants'

interface VenueListProps {
  venues: VenueWithForecast[]
  onVenueClick: (venue: VenueWithForecast) => void
  userLat?: number
  userLng?: number
  selectedTime: Date
  isEmpty: boolean
  hasFilters: boolean
  onClearFilters?: () => void
  allInShade?: boolean
  sunIsDown?: boolean
  isFavorite?: (venueId: string) => boolean
  onToggleFavorite?: (venueId: string) => void
}

function VenueCards({
  venues,
  onVenueClick,
  userLat,
  userLng,
  selectedTime,
  isFavorite,
  onToggleFavorite,
}: {
  venues: VenueWithForecast[]
  onVenueClick: (venue: VenueWithForecast) => void
  userLat?: number
  userLng?: number
  selectedTime: Date
  isFavorite?: (venueId: string) => boolean
  onToggleFavorite?: (venueId: string) => void
}) {
  return (
    <div className="divide-y divide-gray-50">
      {venues.map((venue) => {
        const distance =
          userLat !== undefined && userLng !== undefined
            ? haversineDistance(userLat, userLng, venue.lat, venue.lng)
            : undefined

        return (
          <VenueCard
            key={venue.id}
            venue={venue}
            onClick={() => onVenueClick(venue)}
            distanceMeters={distance}
            selectedTime={selectedTime}
            isFavorite={isFavorite?.(venue.id)}
            onToggleFavorite={onToggleFavorite}
          />
        )
      })}
    </div>
  )
}

export default function VenueList({
  venues,
  onVenueClick,
  userLat,
  userLng,
  selectedTime,
  isEmpty,
  hasFilters,
  onClearFilters,
  allInShade,
  sunIsDown,
  isFavorite,
  onToggleFavorite,
}: VenueListProps) {
  // Sun down — show message only
  if (sunIsDown) {
    return (
      <div className="px-4 py-12 text-center text-gray-500">
        <p className="text-lg mb-2">Sun&apos;s down for today.</p>
        <p className="text-sm">Predictions resume at sunrise tomorrow.</p>
      </div>
    )
  }

  // Active filters but nothing matches
  if (isEmpty && hasFilters) {
    return (
      <div className="px-4 py-12 text-center text-gray-500">
        <p className="text-sm mb-3">No venues match your filters.</p>
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="px-4 py-2 text-sm font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>
    )
  }

  // No venues at all (empty database)
  if (venues.length === 0) {
    return (
      <div className="px-4 py-12 text-center text-gray-500">
        <p className="text-sm mb-4">No patios nearby. Try:</p>
        <div className="flex flex-wrap justify-center gap-2">
          {NEIGHBORHOODS.map((n) => (
            <button
              key={n.name}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
            >
              {n.name}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // All in shade — show banner + venue list
  if (allInShade) {
    return (
      <>
        <div className="px-4 py-3 text-center text-gray-500 bg-gray-50 border-b border-gray-100">
          <p className="text-sm">
            All patios are in shade right now. Try sliding ahead to find the
            next sunny window.
          </p>
        </div>
        <VenueCards
          venues={venues}
          onVenueClick={onVenueClick}
          userLat={userLat}
          userLng={userLng}
          selectedTime={selectedTime}
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite}
        />
      </>
    )
  }

  // Normal list
  return (
    <VenueCards
      venues={venues}
      onVenueClick={onVenueClick}
      userLat={userLat}
      userLng={userLng}
      selectedTime={selectedTime}
    />
  )
}
