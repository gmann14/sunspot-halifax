export interface Venue {
  id: string
  name: string
  slug: string
  type: 'restaurant' | 'bar' | 'cafe' | 'brewery'
  lat: number
  lng: number
  sun_query_point: { type: 'Point'; coordinates: [number, number] }
  patio_confidence: 'verified' | 'estimated'
  google_place_id: string | null
  website: string | null
  phone: string | null
  rating: number | null
  price_level: number | null
  hours: VenueHours | null
  patio_season_only: boolean
  address: string | null
  neighborhood: string | null
  photos: VenuePhoto[] | null
  last_verified_at: string | null
  data_sources: Record<string, boolean> | null
  created_at: string
  updated_at: string
}

export interface VenueHours {
  [day: string]: { open: string; close: string }[]
}

export interface VenuePhoto {
  url: string
  html_attributions: string[]
  photo_reference: string
  fetched_at: string
}

export interface VenueSunForecast {
  id: string
  venue_id: string
  slot_starts_at: string
  computed_at: string
  status: 'sun' | 'shade' | 'unknown'
  confidence: 'estimated' | 'verified'
}

export interface VenueWithForecast extends Venue {
  current_status?: 'sun' | 'shade' | 'unknown'
  current_confidence?: 'estimated' | 'verified'
  forecasts?: VenueSunForecast[]
  sun_until?: string | null
  next_sun?: string | null
  best_sun_start?: string | null
  best_sun_end?: string | null
  continuous_sun_minutes?: number
  minutes_until_sun?: number | null
  walking_minutes?: number | null
}

export interface WeatherData {
  condition: string
  condition_code: 'clear' | 'partly_cloudy' | 'overcast' | 'poor'
  temperature: number
  icon_code: string
  cached: boolean
  fetched_at: string
}

export interface Building {
  id: string
  footprint: GeoJSON.Polygon
  height_m: number | null
  source: 'overture' | 'osm' | 'lidar' | 'manual'
  source_id: string | null
}

export type SunStatus = 'sun' | 'shade' | 'unknown'

export type VenueType = 'restaurant' | 'bar' | 'cafe' | 'brewery'

export type SortOption = 'best_match' | 'distance'

export interface FilterState {
  sunnyNow: boolean
  hideClosed: boolean
  venueTypes: VenueType[]
  sortBy: SortOption
  searchQuery: string
}
