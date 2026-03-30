# SunSpot Halifax

**Find sunny patios in Halifax, right now.**

SunSpot Halifax is a mobile-first web app that predicts which restaurant, bar, cafe, and brewery patios are in sunlight using real-time shadow simulation from building geometry and sun position.

**Live:** [sunspot-halifax.vercel.app](https://sunspot-halifax.vercel.app)

---

## How It Works

1. **Building geometry** (782 footprints from Overture Maps, 99.5% with heights from OSM) is stored in PostGIS
2. **Sun position** is calculated using SunCalc.js for any 15-minute slot between sunrise and sunset
3. **Ray casting** from each patio point along the sun's bearing checks for building obstructions using PostGIS `ST_Intersects`
4. If a building's angular height exceeds the sun's altitude angle, the patio is in **shade**; otherwise it's in **sun**
5. Forecasts are precomputed via cron and served through API routes

## Features

- **Sun predictions** for 49 downtown Halifax patios, updated every 15 minutes
- **Interactive time slider** to preview sun/shade throughout the day
- **Shadow map** using Mapbox GL + ShadeMap as a progressive enhancement
- **Smart filtering** by sun status, venue type, open/closed, favorites
- **Weather integration** with cloud cover from Open-Meteo (>80% cloud = shade override)
- **Venue detail pages** with sun forecast timeline, directions, share
- **Community features** for suggesting new patios and reporting issues
- **SEO-optimized** with server-rendered venue pages, sitemap, and OG images
- **Accessible** with skip navigation, screen reader labels, keyboard support, reduced-motion

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 6 |
| UI | React 19 + Tailwind CSS v4 |
| Map | Mapbox GL JS v3 |
| Shadow overlay | mapbox-gl-shadow-simulator (ShadeMap) |
| Sun math | SunCalc.js |
| Database | Supabase (PostgreSQL + PostGIS) |
| Weather | Open-Meteo API |
| Hosting | Vercel |
| Analytics | Vercel Analytics + Speed Insights |

## Project Structure

```
src/
  app/                    # Next.js App Router pages and API routes
    api/
      forecast/           # Cron-triggered forecast computation
      og/                 # Dynamic OG image generation
      submissions/        # User-submitted patio suggestions
      venues/             # Venue data API
      weather/            # Weather proxy with caching
    venue/[slug]/          # Server-rendered venue detail pages
  components/              # React components (Map, FilterBar, VenueCard, etc.)
  lib/
    forecast-engine.ts     # Core sun/shade classification algorithm
    suncalc-helpers.ts     # Sun position + time slot utilities
    venues.ts              # Venue sorting, filtering, distance helpers
    data.ts                # Supabase data fetching layer
scripts/
  bootstrap-venues.ts     # Google Places API venue discovery
  seed-venues.ts          # Hardcoded seed data for 20 known patios
  import-buildings.ts     # Overture Maps building geometry import
  enrich-heights.ts       # OSM building height enrichment
  osm-outdoor-seating.ts  # Cross-reference OSM outdoor_seating tags
  review-keyword-scan.ts  # Scan Google reviews for patio keywords
supabase/migrations/       # Database schema + PostGIS functions
docs/
  spec.md                  # Product specification (source of truth)
  phase0-findings.md       # Building data validation results
  research/                # Competitive analysis, tech research
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- Docker (for local Supabase)

### Setup

```sh
# Install dependencies
pnpm install

# Start local Supabase
npx supabase start

# Copy env template and fill in keys
cp .env.example .env.local

# Import building data
npx tsx scripts/import-buildings.ts

# Seed venues
npx tsx scripts/seed-venues.ts

# Start dev server
pnpm dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox GL JS access token |
| `NEXT_PUBLIC_SHADEMAP_KEY` | ShadeMap API key (optional, for shadow overlay) |
| `GOOGLE_PLACES_API_KEY` | Google Places API key (for venue bootstrap) |
| `CRON_SECRET` | Secret for cron job authentication |

### Commands

```sh
pnpm dev          # Start dev server (Turbopack)
pnpm build        # Production build
pnpm test         # Run tests (Vitest)
pnpm lint         # Lint with ESLint
npx tsc --noEmit  # Type check
```

## Architecture

### Forecast Engine

The shadow simulation runs server-side as a cron job:

```
For each venue, for each 15-min slot from sunrise to sunset:
  1. Get sun azimuth + altitude (SunCalc)
  2. If sun below horizon → shade
  3. If cloud cover > 80% (Open-Meteo) → shade
  4. Project a ray 500m along sun bearing from patio point
  5. Query PostGIS for buildings intersecting the ray
  6. For each building: if atan2(height, distance) > sun_altitude → shade
  7. No obstructions → sun
```

### Data Pipeline

```
Google Places API → bootstrap-venues.ts → Supabase venues table
Overture Maps     → import-buildings.ts → Supabase buildings table
OSM Overpass      → enrich-heights.ts   → buildings.height_m updated
Cron trigger      → forecast engine     → venue_sun_forecast table
```

## Status

**MVP complete** (Phases 0-6). See [tasks.md](.claude/tasks.md) for current status and remaining launch tasks.

## License

MIT
