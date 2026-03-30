'use client'

import type { FilterState, VenueType } from '@/types'
import { formatTimeAT } from '@/lib/suncalc-helpers'
import { trackEvent } from '@/lib/analytics'

interface FilterBarProps {
  filters: FilterState
  onChange: (filters: FilterState) => void
  selectedTime: Date
  isNow: boolean
  hasLocation: boolean
  hasFavorites?: boolean
  showSunnyTooltip?: boolean
  onSunnyTooltipDismiss?: () => void
}

const VENUE_TYPES: { value: VenueType; label: string }[] = [
  { value: 'bar', label: 'Bar' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'cafe', label: 'Cafe' },
  { value: 'brewery', label: 'Brewery' },
]

export default function FilterBar({
  filters,
  onChange,
  selectedTime,
  isNow,
  hasLocation,
  hasFavorites,
  showSunnyTooltip,
  onSunnyTooltipDismiss,
}: FilterBarProps) {
  const sunnyLabel = isNow
    ? 'Sunny Now'
    : `Sunny at ${formatTimeAT(selectedTime)}`

  function toggleSunny() {
    onChange({ ...filters, sunnyNow: !filters.sunnyNow })
    trackEvent('filter_toggle', { filter: 'sunny_now', enabled: !filters.sunnyNow })
    onSunnyTooltipDismiss?.()
  }

  function toggleHideClosed() {
    onChange({ ...filters, hideClosed: !filters.hideClosed })
    trackEvent('filter_toggle', { filter: 'hide_closed', enabled: !filters.hideClosed })
  }

  function toggleVenueType(type: VenueType) {
    const types = filters.venueTypes.includes(type)
      ? filters.venueTypes.filter((t) => t !== type)
      : [...filters.venueTypes, type]
    onChange({ ...filters, venueTypes: types })
    trackEvent('filter_toggle', { filter: `type_${type}`, enabled: !filters.venueTypes.includes(type) })
  }

  function toggleFavorites() {
    onChange({ ...filters, favoritesOnly: !filters.favoritesOnly })
    trackEvent('filter_toggle', { filter: 'favorites', enabled: !filters.favoritesOnly })
  }

  function setSort(sortBy: FilterState['sortBy']) {
    onChange({ ...filters, sortBy })
    trackEvent('filter_toggle', { filter: 'sort', enabled: sortBy !== 'best_match' })
  }

  return (
    <div className="filter-scroll flex items-center gap-2 px-4 py-2 overflow-x-auto bg-white border-b border-gray-100 relative">
      {/* Sunny Now toggle */}
      <div className="relative shrink-0">
        <button
          onClick={toggleSunny}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filters.sunnyNow
              ? 'bg-amber-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          aria-pressed={filters.sunnyNow}
        >
          ☀️ {sunnyLabel}
        </button>
        {showSunnyTooltip && (
          <div className="onboarding-tooltip" style={{ top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' }}>
            Show only venues in sunlight
          </div>
        )}
      </div>

      {/* Hide Closed toggle */}
      <button
        onClick={toggleHideClosed}
        className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          filters.hideClosed
            ? 'bg-gray-800 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
        aria-pressed={filters.hideClosed}
      >
        Hide Closed
      </button>

      {/* My Favorites */}
      {hasFavorites && (
        <button
          onClick={toggleFavorites}
          className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filters.favoritesOnly
              ? 'bg-red-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          aria-pressed={filters.favoritesOnly}
        >
          ♥ Favorites
        </button>
      )}

      {/* Venue type chips */}
      {VENUE_TYPES.map((vt) => (
        <button
          key={vt.value}
          onClick={() => toggleVenueType(vt.value)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filters.venueTypes.includes(vt.value)
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          aria-pressed={filters.venueTypes.includes(vt.value)}
        >
          {vt.label}
        </button>
      ))}

      {/* Sort */}
      <select
        value={filters.sortBy}
        onChange={(e) => setSort(e.target.value as FilterState['sortBy'])}
        className="shrink-0 px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-600 border-0 appearance-none cursor-pointer"
        aria-label="Sort by"
      >
        <option value="best_match">Best match</option>
        {hasLocation && <option value="distance">Distance</option>}
      </select>
    </div>
  )
}
