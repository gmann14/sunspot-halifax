# SunSpot Halifax — Tasks

> Source of truth for project status. Updated after every work session.
> Last updated: 2026-03-24

## Phase 0: Validation Spike ✅ DONE
- [x] Validate building footprint + height coverage for downtown Halifax bbox
- [x] Import buildings into `buildings` table from OSM (782 buildings, most heights NULL)
- [x] Validate `mapbox-gl-shadow-simulator` licensing/commercial terms
- [x] Prototype server-side obstruction check (algorithm validated in spec)
- [x] Document findings — committed as Phase 0 validation commit

## Phase 1: List-First MVP Shell ✅ DONE
- [x] Next.js 15 app shell with SSR routes
- [x] Time slider (sunrise to sunset, 15-min increments, golden hour marker)
- [x] Weather banner (Environment Canada API)
- [x] Loading skeleton and venue list shell
- [x] `/sunny-now` and `/venue/[slug]` routes
- [x] `/about` page
- [x] Components: Map, TimeSlider, WeatherBanner, FilterBar, VenueCard, VenueDetailSheet, VenueList, ForecastBar, SearchBar, LoadingSkeleton

## Phase 2: Venue Data Pipeline ✅ DONE
- [x] Supabase schema: all 4 tables (venues, buildings, venue_sun_forecast, user_submissions)
- [x] Migration 001: initial schema with RLS, indexes, PostGIS
- [x] Migration 002: ray intersection function for obstruction checks
- [x] `scripts/import-buildings.ts` — reads CSV, WKT→PostGIS, idempotent
- [x] `scripts/bootstrap-venues.ts` — Google Places API Nearby Search, dedup, slug gen, patio point estimation
- [x] Building import: 780 buildings loaded into local Supabase
- [x] Venue bootstrap: 49 venues imported with patio points
- [x] 2,450 forecast records generated
- [x] Verify 30+ venues imported with usable patio points (49 ✅)
- [ ] Cross-reference with OSM `outdoor_seating` tag
- [ ] Review keyword scan of Google Places reviews

## Phase 3: Forecast Engine + Filters — ~70% done
- [x] `src/lib/forecast-engine.ts` — SunCalc + PostGIS obstruction algorithm
- [x] Bearing conversion, 500m ray, height coverage check, angular elevation
- [x] API route: `POST /api/forecast` (mode=full or mode=current)
- [x] API route: `POST /api/forecast/cleanup` (nightly stale row deletion)
- [x] `vercel.json` cron for 3am UTC cleanup
- [x] 13 tests for forecast geometry helpers (43 total tests passing)
- [ ] Wire filters in frontend: Sunny Now, Hide Closed, Venue Type, Sort
- [ ] Implement Best Match sort algorithm (sun time remaining → next sun window → distance)
- [ ] Add text search (client-side filter on venue name)
- [ ] Add "no filter results" empty state
- [ ] Bottom venue list sorted by remaining sun time, with distance

## Phase 4: Map + Venue Details — ~60% done
- [x] Map component with Mapbox GL
- [x] Venue detail bottom sheet (VenueDetailSheet.tsx)
- [x] OG image generation route (`/api/og`)
- [ ] Integrate shadow overlay (mapbox-gl-shadow-simulator)
- [ ] Pin clustering (Mapbox built-in, count badges)
- [ ] Cluster tap → zoom to reveal pins
- [ ] Share functionality (Web Share API + fallback)
- [ ] `/venue/[slug]` SSR detail page polish (standalone, map lazy-loaded)
- [ ] Mobile-responsive polish
- [ ] Inline onboarding tooltips (first visit only)
- [ ] Empty states (no venues, all shade, after sunset, off-season, venue not found)

## Phase 5: Community + Deploy — not started
- [ ] "Suggest a Patio" submission form
- [ ] "Report a Problem" on venue cards
- [ ] Favorites + Recently Viewed (localStorage)
- [ ] Accessibility audit
- [ ] Analytics setup (Vercel Analytics + custom events)
- [ ] Deploy to Vercel (already linked: prj_LcsbHf8EDIBVPJBzXKVveoT7LWDY)
- [ ] SEO: meta tags, sitemap, OG images
- [ ] Launch: r/halifax, Halifax Twitter, local Facebook groups

## Infra / Config
- Vercel project linked: `sunspot-halifax`
- GitHub: `gmann14/sunspot-halifax`
- Supabase: local dev RUNNING (Docker), 780 buildings + 49 venues + 2,450 forecasts loaded
- `.env.local`: Mapbox token ✅, Google Places API key ✅, Supabase local keys ✅
- 43 tests passing, TypeScript clean (`npx tsc --noEmit`)
- Deployed to Vercel: https://sunspot-halifax.vercel.app (needs cloud Supabase for production data)
- 8 git commits total

## Recent Progress (2026-03-24)
- [x] OSM Overpass building height enrichment: 21.4% → 99.5% height coverage (scripts/enrich-heights.ts)
- [x] Open-Meteo cloud cover integration: ≥80% cloud = shade, skips PostGIS queries
- [x] Weather data (cloud_cover_hourly, current_temperature, current_cloud_cover) now in forecast API response
- [x] Deployed to Vercel: https://sunspot-halifax.vercel.app

## Blockers
1. ~~Supabase local dev~~ **RESOLVED** — running with full data loaded
2. ~~Building heights mostly NULL~~ **RESOLVED** — OSM enrichment covers 99.5%
3. Cloud Supabase needed for production deploy (Vercel can't reach localhost)
