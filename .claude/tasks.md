# SunSpot Halifax — Tasks

> Source of truth for project status. Updated after every work session.
> Last updated: 2026-03-26

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

## Phase 3: Forecast Engine + Filters ✅ DONE
- [x] `src/lib/forecast-engine.ts` — SunCalc + PostGIS obstruction algorithm
- [x] Bearing conversion, 500m ray, height coverage check, angular elevation
- [x] API route: `POST /api/forecast` (mode=full or mode=current)
- [x] API route: `POST /api/forecast/cleanup` (nightly stale row deletion)
- [x] `vercel.json` cron for 3am UTC cleanup
- [x] 13 tests for forecast geometry helpers (51 total tests passing)
- [x] Wire filters in frontend: Sunny Now, Hide Closed, Venue Type, Sort
- [x] Implement Best Match sort algorithm (sun time remaining → next sun window → distance)
- [x] Add text search (client-side filter on venue name)
- [x] Add "no filter results" empty state
- [x] Bottom venue list sorted by remaining sun time, with distance
- [x] Client-side venue status recomputation when time slider changes

## Phase 4: Map + Venue Details ✅ DONE
- [x] Map component with Mapbox GL
- [x] Venue detail bottom sheet (VenueDetailSheet.tsx)
- [x] OG image generation route (`/api/og`)
- [x] Shadow overlay integration (mapbox-gl-shadow-simulator, optional via NEXT_PUBLIC_SHADEMAP_KEY)
- [x] Pin clustering (GeoJSON source + Mapbox built-in clustering, count badges, amber circles)
- [x] Cluster tap → zoom to reveal individual pins (getClusterExpansionZoom)
- [x] Selected venue highlight ring on map
- [x] Share functionality (ShareButton component: Web Share API + clipboard fallback with "Copied!" toast)
- [x] `/venue/[slug]` SSR detail page polish (standalone, lazy-load map, branding header, off-season banner)
- [x] Mobile-responsive polish (44px touch targets, proper tap areas)
- [ ] Inline onboarding tooltips (first visit only) — deferred to Phase 6
- [x] Empty states: no venues nearby (neighborhood buttons), all in shade (banner + venue list), after sunset, off-season banner, venue not found (404 page)
- [x] Off-season banner on home page (outside May-October)

## Phase 5: Community Features ✅ DONE
- [x] "Suggest a Patio" submission form (SuggestPatioModal) — modal with name, address, notes, honeypot
- [x] "Report a Problem" on venue cards (ReportProblemModal) — correction or closure report
- [x] Toast notification system (ToastProvider + useToast hook) — success/error toasts
- [x] Favorites (localStorage) — heart icon on VenueCard + VenueDetailSheet, "♥ Favorites" filter chip
- [x] Recently Viewed (localStorage) — last 10 venues, shown below main list when no filters active
- [x] SEO: enhanced meta tags (title template, metadataBase, Twitter cards, canonical URLs)
- [x] JSON-LD structured data (LocalBusiness schema) on venue detail pages
- [x] Dynamic OG images per venue (already existed from Phase 4, enhanced with metadata)
- [x] Sitemap generation (`/sitemap.xml`) — all venue slugs + static pages
- [x] `robots.txt` generation — allows crawling, blocks `/api/`
- [x] 17 new tests (68 total passing), TypeScript clean

## Phase 6: Deploy + Launch — not started
- [ ] Accessibility audit
- [ ] Analytics setup (Vercel Analytics + custom events)
- [ ] Deploy to Vercel (already linked: prj_LcsbHf8EDIBVPJBzXKVveoT7LWDY)
- [ ] Inline onboarding tooltips (first visit only)
- [ ] Launch: r/halifax, Halifax Twitter, local Facebook groups

## Infra / Config
- Vercel project linked: `sunspot-halifax`
- GitHub: `gmann14/sunspot-halifax`
- Supabase: local dev RUNNING (Docker), 780 buildings + 49 venues + 2,450 forecasts loaded
- `.env.local`: Mapbox token ✅, Google Places API key ✅, Supabase local keys ✅
- 68 tests passing, TypeScript clean (`npx tsc --noEmit`)
- Deployed to Vercel: https://sunspot-halifax.vercel.app (needs cloud Supabase for production data)
- 9 git commits total

## Recent Progress (2026-03-26)
- [x] Phase 5 complete: Community features, SEO, sitemap
- [x] SuggestPatioModal: name + address + notes form, honeypot, posts to /api/submissions
- [x] ReportProblemModal: correction/closure radio, details, posts to /api/submissions with venue_id
- [x] ToastProvider: context-based toast system, success/error variants, 3s auto-dismiss
- [x] Favorites: useFavorites hook (localStorage), heart icons on cards + detail sheets, filter chip
- [x] Recently Viewed: useRecentlyViewed hook (localStorage, max 10), section below venue list
- [x] JSON-LD LocalBusiness schema on /venue/[slug] pages
- [x] Sitemap: dynamic /sitemap.xml with all venue slugs
- [x] robots.txt: allows /, blocks /api/
- [x] Enhanced metadata: title template, metadataBase, canonical URLs, Twitter cards, OG images
- [x] 68 tests passing, TypeScript clean

## Earlier Progress (2026-03-26)
- [x] Phase 4 complete: Map rewritten with GeoJSON clustering + shadow overlay
- [x] ShareButton component: Web Share API with clipboard "Copied!" feedback
- [x] Venue detail page polished: standalone usable, branding header, off-season support
- [x] Empty states: all in shade (shows venue list below banner), off-season, sun down, no venues nearby
- [x] Mobile-responsive: 44px touch targets on search/close buttons

## Earlier Progress (2026-03-24)
- [x] OSM Overpass building height enrichment: 21.4% → 99.5% height coverage (scripts/enrich-heights.ts)
- [x] Open-Meteo cloud cover integration: ≥80% cloud = shade, skips PostGIS queries
- [x] Weather data (cloud_cover_hourly, current_temperature, current_cloud_cover) now in forecast API response
- [x] Deployed to Vercel: https://sunspot-halifax.vercel.app

## Blockers
1. ~~Supabase local dev~~ **RESOLVED** — running with full data loaded
2. ~~Building heights mostly NULL~~ **RESOLVED** — OSM enrichment covers 99.5%
3. Cloud Supabase needed for production deploy (Vercel can't reach localhost)
