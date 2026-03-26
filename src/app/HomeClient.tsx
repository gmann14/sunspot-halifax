'use client'

import { useState, useMemo, useCallback, Suspense, lazy } from 'react'
import type { VenueWithForecast, WeatherData, FilterState } from '@/types'
import { getCurrentSlot, isSunUp, isPatioSeason } from '@/lib/suncalc-helpers'
import { sortByBestMatch, haversineDistance, isVenueOpen, continuousSunMinutes, nextSunWindow } from '@/lib/venues'
import WeatherBanner from '@/components/WeatherBanner'
import TimeSlider from '@/components/TimeSlider'
import FilterBar from '@/components/FilterBar'
import SearchBar from '@/components/SearchBar'
import VenueList from '@/components/VenueList'
import VenueDetailSheet from '@/components/VenueDetailSheet'
import SuggestPatioModal from '@/components/SuggestPatioModal'
import { MapSkeleton, VenueListSkeleton } from '@/components/LoadingSkeleton'
import { useFavorites } from '@/lib/use-favorites'
import { useRecentlyViewed } from '@/lib/use-recently-viewed'

const Map = lazy(() => import('@/components/Map'))

interface HomeClientProps {
  initialVenues: VenueWithForecast[]
  initialWeather: WeatherData | null
}

export default function HomeClient({ initialVenues }: HomeClientProps) {
  const [venues] = useState(initialVenues)
  const [selectedVenue, setSelectedVenue] = useState<VenueWithForecast | null>(null)
  const [selectedTime, setSelectedTime] = useState(() => getCurrentSlot())
  const [isNow, setIsNow] = useState(true)
  const [userLocation, setUserLocation] = useState<{
    lat: number
    lng: number
  } | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    sunnyNow: false,
    hideClosed: true,
    venueTypes: [],
    sortBy: 'best_match',
    searchQuery: '',
    favoritesOnly: false,
  })
  const [suggestOpen, setSuggestOpen] = useState(false)

  const { favorites, toggleFavorite, isFavorite } = useFavorites()
  const { recentIds, addRecentlyViewed } = useRecentlyViewed()

  const sunIsDown = !isSunUp(selectedTime)
  const offSeason = !isPatioSeason(selectedTime)

  // Recompute venue sun statuses for the selected time slot
  const venuesAtTime = useMemo(() => {
    return venues.map((venue) => {
      const forecasts = venue.forecasts ?? []
      const currentForecast = forecasts.find((f) => {
        const fSlot = new Date(f.slot_starts_at)
        return Math.abs(fSlot.getTime() - selectedTime.getTime()) < 15 * 60 * 1000
      })

      const status = currentForecast?.status ?? 'unknown'
      const sunMins = status === 'sun'
        ? continuousSunMinutes(forecasts, selectedTime)
        : 0
      const nextSun = status !== 'sun'
        ? nextSunWindow(forecasts, selectedTime)
        : null

      return {
        ...venue,
        current_status: status,
        current_confidence: currentForecast?.confidence ?? venue.patio_confidence,
        continuous_sun_minutes: sunMins,
        minutes_until_sun: nextSun
          ? Math.round((nextSun.getTime() - selectedTime.getTime()) / 60000)
          : null,
      }
    })
  }, [venues, selectedTime])

  // Filter venues
  const filteredVenues = useMemo(() => {
    let result: VenueWithForecast[] = venuesAtTime

    // Text search
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase()
      result = result.filter((v) => v.name.toLowerCase().includes(q))
    }

    // Favorites only
    if (filters.favoritesOnly) {
      result = result.filter((v) => favorites.includes(v.id))
    }

    // Sunny Now
    if (filters.sunnyNow) {
      result = result.filter((v) => v.current_status === 'sun')
    }

    // Hide Closed
    if (filters.hideClosed) {
      result = result.filter((v) => isVenueOpen(v, selectedTime))
    }

    // Venue type filter
    if (filters.venueTypes.length > 0) {
      result = result.filter((v) => filters.venueTypes.includes(v.type))
    }

    // Sort
    if (filters.sortBy === 'best_match') {
      result = sortByBestMatch(result, userLocation?.lat, userLocation?.lng)
    } else if (filters.sortBy === 'distance' && userLocation) {
      result = [...result].sort(
        (a, b) =>
          haversineDistance(userLocation.lat, userLocation.lng, a.lat, a.lng) -
          haversineDistance(userLocation.lat, userLocation.lng, b.lat, b.lng)
      )
    }

    return result
  }, [venuesAtTime, filters, selectedTime, userLocation, favorites])

  const allInShade = useMemo(
    () =>
      venuesAtTime.length > 0 &&
      venuesAtTime.every((v) => v.current_status !== 'sun') &&
      !sunIsDown,
    [venuesAtTime, sunIsDown]
  )

  const hasActiveFilters =
    filters.sunnyNow ||
    !filters.hideClosed ||
    filters.venueTypes.length > 0 ||
    filters.searchQuery.length > 0 ||
    filters.favoritesOnly

  const handleTimeChange = useCallback((time: Date) => {
    setSelectedTime(time)
    setIsNow(false)
  }, [])

  const handleNowClick = useCallback(() => {
    setSelectedTime(getCurrentSlot())
    setIsNow(true)
  }, [])

  const handleMapInteraction = useCallback(() => {
    if (!userLocation) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setUserLocation({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            })
          },
          () => {
            // Permission denied — that's fine
          }
        )
      }
    }
  }, [userLocation])

  const handleClearFilters = useCallback(() => {
    setFilters({
      sunnyNow: false,
      hideClosed: true,
      venueTypes: [],
      sortBy: 'best_match',
      searchQuery: '',
      favoritesOnly: false,
    })
  }, [])

  const handleVenueClick = useCallback((venue: VenueWithForecast) => {
    setSelectedVenue(venue)
    addRecentlyViewed(venue.id)
  }, [addRecentlyViewed])

  // Build recently viewed venue list
  const recentlyViewedVenues = useMemo((): VenueWithForecast[] => {
    if (recentIds.length === 0) return []
    const result: VenueWithForecast[] = []
    for (const id of recentIds) {
      const v = venuesAtTime.find((venue) => venue.id === id)
      if (v) result.push(v)
    }
    return result
  }, [recentIds, venuesAtTime])

  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      {/* Header */}
      <header className="shrink-0">
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
          <h1 className="text-lg font-bold text-amber-600">
            ☀️ SunSpot Halifax
          </h1>
          <SearchBar
            value={filters.searchQuery}
            onChange={(q) => setFilters((f) => ({ ...f, searchQuery: q }))}
          />
        </div>
        <WeatherBanner />
        {offSeason && (
          <div className="px-4 py-2 bg-blue-50 text-blue-700 text-xs text-center">
            Patio season: May–October. Some patios may be closed.
          </div>
        )}
        <FilterBar
          filters={filters}
          onChange={setFilters}
          selectedTime={selectedTime}
          isNow={isNow}
          hasLocation={!!userLocation}
          hasFavorites={favorites.length > 0}
        />
      </header>

      {/* Map */}
      <div className="shrink-0 h-[40vh] min-h-[200px] relative">
        <Suspense fallback={<MapSkeleton />}>
          <Map
            venues={filteredVenues}
            selectedVenue={selectedVenue}
            onVenueClick={handleVenueClick}
            onMapInteraction={handleMapInteraction}
            selectedTime={selectedTime}
          />
        </Suspense>
      </div>

      {/* Time Slider */}
      <div className="shrink-0">
        <TimeSlider
          value={selectedTime}
          onChange={handleTimeChange}
          onNowClick={handleNowClick}
          isNow={isNow}
        />
      </div>

      {/* Venue List */}
      <div className="flex-1 overflow-y-auto">
        {venues.length === 0 ? (
          <VenueListSkeleton />
        ) : (
          <>
            <VenueList
              venues={filteredVenues}
              onVenueClick={handleVenueClick}
              userLat={userLocation?.lat}
              userLng={userLocation?.lng}
              selectedTime={selectedTime}
              isEmpty={filteredVenues.length === 0}
              hasFilters={hasActiveFilters}
              onClearFilters={handleClearFilters}
              allInShade={allInShade}
              sunIsDown={sunIsDown}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
            />

            {/* Recently Viewed */}
            {recentlyViewedVenues.length > 0 && !hasActiveFilters && (
              <div className="border-t border-gray-100">
                <h3 className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Recently Viewed
                </h3>
                <VenueList
                  venues={recentlyViewedVenues}
                  onVenueClick={handleVenueClick}
                  userLat={userLocation?.lat}
                  userLng={userLocation?.lng}
                  selectedTime={selectedTime}
                  isEmpty={false}
                  hasFilters={false}
                  allInShade={false}
                  sunIsDown={false}
                  isFavorite={isFavorite}
                  onToggleFavorite={toggleFavorite}
                />
              </div>
            )}

            {/* Suggest a Patio */}
            <div className="px-4 py-4 border-t border-gray-100 text-center">
              <button
                onClick={() => setSuggestOpen(true)}
                className="text-sm text-amber-600 hover:text-amber-700 font-medium"
              >
                + Suggest a Patio
              </button>
            </div>
          </>
        )}
      </div>

      {/* Venue Detail Bottom Sheet */}
      <VenueDetailSheet
        venue={selectedVenue}
        onClose={() => setSelectedVenue(null)}
        distanceMeters={
          selectedVenue && userLocation
            ? haversineDistance(
                userLocation.lat,
                userLocation.lng,
                selectedVenue.lat,
                selectedVenue.lng
              )
            : undefined
        }
        selectedTime={selectedTime}
        isFavorite={selectedVenue ? isFavorite(selectedVenue.id) : false}
        onToggleFavorite={toggleFavorite}
      />

      {/* Suggest a Patio Modal */}
      <SuggestPatioModal
        open={suggestOpen}
        onClose={() => setSuggestOpen(false)}
      />
    </div>
  )
}
