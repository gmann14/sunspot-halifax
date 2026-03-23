'use client'

import type { FilterState, VenueType } from '@/types'
import { formatTimeAT } from '@/lib/suncalc-helpers'

interface FilterBarProps {
  filters: FilterState
  onChange: (filters: FilterState) => void
  selectedTime: Date
  isNow: boolean
  hasLocation: boolean
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
}: FilterBarProps) {
  const sunnyLabel = isNow
    ? 'Sunny Now'
    : `Sunny at ${formatTimeAT(selectedTime)}`

  function toggleSunny() {
    onChange({ ...filters, sunnyNow: !filters.sunnyNow })
  }

  function toggleHideClosed() {
    onChange({ ...filters, hideClosed: !filters.hideClosed })
  }

  function toggleVenueType(type: VenueType) {
    const types = filters.venueTypes.includes(type)
      ? filters.venueTypes.filter((t) => t !== type)
      : [...filters.venueTypes, type]
    onChange({ ...filters, venueTypes: types })
  }

  function setSort(sortBy: FilterState['sortBy']) {
    onChange({ ...filters, sortBy })
  }

  return (
    <div className="filter-scroll flex items-center gap-2 px-4 py-2 overflow-x-auto bg-white border-b border-gray-100">
      {/* Sunny Now toggle */}
      <button
        onClick={toggleSunny}
        className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          filters.sunnyNow
            ? 'bg-amber-500 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
        aria-pressed={filters.sunnyNow}
      >
        ☀️ {sunnyLabel}
      </button>

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
