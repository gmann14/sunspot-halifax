// Halifax downtown center
export const HALIFAX_CENTER = {
  lat: 44.6476,
  lng: -63.5728,
} as const

// Bounding box for Halifax downtown
export const HALIFAX_BOUNDS = {
  north: 44.652,
  south: 44.640,
  east: -63.565,
  west: -63.585,
} as const

// Map defaults
export const MAP_DEFAULT_ZOOM = 15
export const MAP_MIN_ZOOM = 12
export const MAP_MAX_ZOOM = 18
export const MAP_PIN_MIN_ZOOM = 14

// Patio season months (1-indexed)
export const PATIO_SEASON_START = 5 // May
export const PATIO_SEASON_END = 10 // October

// Walking time calculation
export const WALKING_METERS_PER_MINUTE = 80
export const MAX_WALKING_DISPLAY_METERS = 2400 // 30+ min

// Forecast settings
export const FORECAST_SLOT_MINUTES = 15
export const BUILDING_QUERY_RADIUS_M = 500
export const MIN_HEIGHT_COVERAGE = 0.5 // 50% — below this, classify as 'unknown'

// Weather cache duration
export const WEATHER_CACHE_SECONDS = 1800 // 30 minutes

// Environment Canada Halifax citypage
export const ENVIRONMENT_CANADA_URL =
  'https://dd.weather.gc.ca/citypage_weather/xml/NS/s0000318_e.xml'

// Open-Meteo cloud cover threshold for skipping sun calc
export const CLOUD_COVER_SHADE_THRESHOLD = 80 // percent

// Open-Meteo API for Halifax
export const OPEN_METEO_LAT = 44.6488
export const OPEN_METEO_LNG = -63.5752

// Timezone
export const HALIFAX_TIMEZONE = 'America/Halifax'

// Neighborhood quick-jump locations
export const NEIGHBORHOODS = [
  { name: 'Waterfront', lat: 44.6453, lng: -63.5685 },
  { name: 'Spring Garden', lat: 44.6425, lng: -63.5782 },
  { name: 'North End', lat: 44.6575, lng: -63.5935 },
  { name: 'Dartmouth', lat: 44.6666, lng: -63.5652 },
] as const

// Day abbreviations for hours
export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
