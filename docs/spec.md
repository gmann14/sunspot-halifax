# SunSpot Halifax — Product Spec

*Draft v4: 2026-03-23*
*Status: Revised spec (MVP scope tightened, architecture aligned, review gaps addressed)*

---

## Overview

A mobile-first web app that helps people find sunny patios in downtown Halifax. MVP focuses on clear-sky sun prediction for restaurants, bars, cafes, and breweries in the downtown/waterfront core. The product is list-first and SEO-friendly, with an optional interactive shadow map for supported browsers.

The system has two distinct layers:
- **Venue sun forecast (source of truth):** server-side predictions generated from sun position + building geometry
- **Shadow map (progressive enhancement):** client-side visual overlay for exploration, not the authoritative source for filtering/SEO

**Product name for MVP:** SunSpot Halifax

---

## Problem

You want to sit on a sunny patio. You don't know which ones are actually in the sun right now, or will be in an hour. You either guess, walk around, or check Instagram. Similar products proved the demand in other cities; nobody has done it for Halifax.

---

## Target Users

- Halifax locals looking for after-work patio drinks
- Tourists exploring the waterfront/downtown
- Weekend brunch planners
- Eventually: any city with outdoor dining culture

---

## Core Features (MVP)

### 1. Shadow Map
- Interactive Mapbox GL map centered on Halifax downtown/waterfront
- Optional client-side shadow overlay for supported browsers/devices
- Map is a progressive enhancement: the venue list and detail pages must still work without WebGL or shadow rendering
- Shadows update as time changes (live or via time slider)
- Map soft-restricted to Halifax metro area — show "SunSpot is only available in Halifax" if user pans too far

### 2. Time Slider
- Scrub from sunrise to sunset for the current day in 15-minute increments
- See how shadows move across the city and how venue predictions change over the day
- "Right now" button snaps to current time
- When slider is moved, all venue sun predictions and the "Sunny Now" filter adapt to the selected time
- Golden hour (last hour before sunset) highlighted on the slider

### 3. Weather Banner
- Always-visible banner at top showing current conditions from Environment Canada API
- **Data source:** Environment Canada citypage XML feed for Halifax (`s0000318_e.xml`), cached server-side for 30 minutes. Fallback: show last cached value with "(cached)" label. If no cached value, hide banner.
- Shows: current condition, temperature
- **Condition mapping from Environment Canada codes:**
  - Clear / Mainly Clear → `clear` — banner is minimal/collapsed (just temp + icon)
  - Partly Cloudy / A Few Clouds → `partly_cloudy` — show banner: "Partly cloudy — sun predictions assume clear skies"
  - Mostly Cloudy / Cloudy / Overcast → `overcast` — show banner: "Overcast — sun positions shown for clear sky conditions"
  - Rain / Drizzle / Showers / Thunderstorm / Snow / Freezing Rain / Ice / Fog / any other → `poor` — show banner with condition name: "[Condition], [temp] — Sun positions shown for clear sky conditions"
- This is critical for trust — without it, the app misleads users on cloudy days

### 4. Venue Markers
- Pins on map for restaurants/bars/cafes with estimated or verified patio locations
- Each pin shows: name, predicted sun status, confidence label (`Estimated` or `Verified`)
- Pin clustering in dense areas (Halifax waterfront has 10+ patios within 200m) — use Mapbox built-in clustering with count badge (standard styling; custom sun-status cluster styling is post-MVP)
- **Cluster tap behavior:** tapping a cluster zooms the map to reveal individual pins. If all pins are already visible at current zoom, expand radially.
- Minimum tap target: 44x44pt per Apple HIG
- Pins appear at zoom level 14+; below that, clusters only

### 5. Venue Detail Card (Bottom Sheet)
- Tap a pin → swipe-up bottom sheet with:
  - Venue name + type badge (Bar, Restaurant, Cafe, Brewery)
  - Photo (first Google Places photo)
  - Sun prediction now (or at slider time), confidence label, forecast bar for the day
  - "Best predicted sun: 11am–3pm" derived from server forecast buckets
  - Google rating, price level ($ / $$ / $$$), hours, Open/Closed status
  - Approx walking time from current location
  - Visible Google photo attribution when required
  - Action buttons: [Directions] [Website] [Share]
- Half-screen by default, full-screen on swipe up
- Swipe down to dismiss; left/right swiping between venues is post-MVP
- Map recenters on selected venue

### 6. Filters & Search
- **Sunny Now** toggle — shows only venues in sunlight at the current slider time. Label adapts: "Sunny at 5:00pm" when slider is moved
  - Default ON for `/sunny-now`
  - Default OFF for `/`
  - `/sunny-now` is a separate SSR route (not a query param on `/`) so it can be independently SEO-indexed. Toggling "Sunny Now" off on `/sunny-now` navigates to `/`. Toggling it on from `/` navigates to `/sunny-now`.
  - `/sunny-now` always means the current 15-minute slot only. If the user moves the time slider away from "Right now" while on `/sunny-now`, the app immediately navigates to `/` and preserves the selected slider time in client state.
- **Hide Closed** toggle (on by default) — hides venues that are closed at the current slider time. When toggled off, closed venues appear grayed out in the list with a "Closed" badge.
- **Venue Type** — bar / restaurant / cafe / brewery (multi-select chips)
- **Sort by** — `Best match` (default) or distance from user
  - `Best match` sorting algorithm:
    1. Venues currently in sun: sort by **continuous sun time remaining from the selected slider time** (descending)
    2. Venues currently in shade: sort by **time until next sun window today** (ascending). Venues with no remaining sun window today sort last.
    3. Tie-breaker: distance from user (if location granted), otherwise alphabetical
  - Distance sort requires location permission; if denied, option is hidden
- **Text search** — search by venue name only in MVP (simple client-side filter)
- **No results:** when active filters produce zero results, show: "No venues match your filters" with a [Clear filters] button
- Filter bar is horizontally scrollable chips, always visible below the weather banner

### 7. Sharing & Deep Links
- **Share button** on every venue detail card
- Uses Web Share API on mobile, copy-link fallback on desktop
- Generates a link to `/venue/[slug]` with dynamic OG image showing:
  - Venue name
  - Current predicted sun status ("Sunny until 5:00pm")
  - Confidence label (`Estimated patio location` or `Verified patio location`)
- MVP OG image is a simple branded text card generated server-side via `@vercel/og`
- Venue photo + mini map preview are post-MVP

### 8. URL Structure & SEO
- `/` — main map view (default)
- `/venue/[slug]` — venue detail page (shareable, SEO-indexable)
- `/sunny-now` — filtered list of venues sunny in the current 15-minute slot only (SEO: "sunny patios in Halifax right now")
- `/about` — what is this app + how it works
- Server-side pre-computation of venue forecast buckets (cron every 15 min) written to Supabase so SSR pages include current predicted sun data for SEO crawlers

---

## User Flows

### Flow 1: First Visit — "What is this?"
```
User arrives (search/social link/direct)
  → Sees loading skeleton (map outline + placeholder cards)
  → List shell loads immediately; map + optional shadows load after
  → Inline onboarding tooltips (first visit only):
    - Tooltip on time slider: "Drag to see how shadows move"
    - Tooltip on first venue pin: "Tap to see sun forecast"
    - Tooltip on Sunny Now filter: "Show only venues in sunlight"
  → Tooltips dismiss on interaction with each element
  → Location permission requested after first map interaction (not on load)
```

### Flow 2: "Where can I sit in the sun right now?"
```
User opens app
  → Map centers on user location (if permission granted) or Halifax downtown (if denied)
  → Weather banner shows current conditions
  → "Hide Closed" is on by default; "Sunny Now" is off on `/`
  → List shows venues sorted by "Best match"
  → Each card shows: name, type, sun time remaining or next sun window, approx walking time, rating
  → User taps a venue → bottom sheet with details + photo
  → Taps "Directions" → opens Google Maps / Apple Maps (respects OS)
```

### Flow 3: "Where can I sit in the sun in an hour?"
```
User drags time slider to 1 hour ahead
  → Shadow overlay updates
  → All venue sun predictions update
  → "Sunny Now" label changes to "Sunny at [time]"
  → List re-sorts by best match for the selected time
  → User picks a venue, checks detail card
  → "Sun forecast" bar shows full day timeline
```

### Flow 4: "I want a specific place in the sun"
```
User taps venue type filter → selects "Restaurant"
  → List filters to restaurants only
  → User searches venue name in search bar
  → Results narrow further
  → User picks venue, taps "Website" or "Directions"
```

### Flow 5: "Share this spot with friends"
```
User finds a great sunny patio
  → Taps Share button on venue detail card
  → Web Share API opens native share sheet (mobile)
  → Friend receives link: sunspothalifax.com/venue/stubborn-goat-beer-garden
  → Friend opens link → sees venue detail with current predicted sun status + OG preview card
```

### Flow 6: Tourist at the Waterfront
```
Tourist Googles "sunny patios halifax"
  → Lands on /sunny-now (SEO-optimized)
  → Sees server-rendered list of currently sunny venues with photos
  → Taps a venue → full interactive map loads
  → Location permission → centers on their position
```

### Flow 7: Rainy Day / Overcast
```
User opens app on a rainy day
  → Weather banner: "🌧 Rain, 12°C — Sun positions shown for clear sky conditions"
  → Shadow map shows where sun would be if clear
  → Venue list still works (shows clear-sky predicted sun times)
  → User can plan ahead for when weather clears
```

### Flow 8: After Sunset
```
User opens app at 9pm
  → Weather banner shows current conditions
  → Time slider shows full day, positioned at sunset
  → Message: "Sun's down for today. Predictions resume at sunrise tomorrow."
  → Venue pages still show today's summary and hours
  → Tomorrow planning is post-MVP
```

### Flow 9: Winter / Off-Season
```
User opens app in November
  → Banner: "Patio season: May–October. Some patios may be closed."
  → Venues with seasonal closure data show "Closed for season"
  → Shadow map still works (sun positions are year-round)
  → App is still useful for planning sunny walks, finding south-facing lunch spots
```

### Flow 10: Shared Link — Direct Venue URL
```
Friend receives link: sunspothalifax.com/venue/stubborn-goat-beer-garden
  → SSR renders full venue detail page (no map required for initial paint)
  → Shows: venue name, photo, current sun prediction, forecast bar, rating, hours, address
  → "Back to all venues" link at top navigates to `/`
  → Map lazy-loads below the fold with the venue pin centered
  → User can tap "Directions" or "Share" directly from the detail page
  → If venue slug is invalid → 404 page: "Venue not found. Browse all patios →"
```

### Flow 11: Tapping a Cluster
```
User sees cluster marker showing "6" on the waterfront
  → Taps cluster → map zooms in to reveal individual pins
  → If pins are already at max zoom, cluster expands radially to show individual pins
  → User taps an individual pin → bottom sheet opens
```

### Flow 12: No Venues Nearby
```
User is in a residential area with no catalogued patios
  → Map shows shadows but no pins
  → Empty state card: "No patios nearby. Try downtown Halifax →" with a button to pan to downtown
  → Neighborhoods listed as quick-jump options: Waterfront, Spring Garden, North End, Dartmouth
```

---

## Mobile UX Details

### Location Permission
- NOT requested on first load — let user explore first
- Requested on first map interaction (pan/zoom) or when user taps distance sort
- If denied: map defaults to Halifax downtown center, distance sort unavailable
- If "Allow Once" (iOS): works for session, re-requested next visit

### Distance & Walking Time
- MVP uses straight-line distance from user to venue
- Approx walking time = distance / 80 meters per minute, rounded to the nearest minute
- **Minimum display:** "1 min walk" (never show "0 min")
- **Maximum display:** "30+ min walk" for distances beyond 2.4km — venues this far are still shown but the exact time is not useful
- If location permission not granted: walking time is hidden (not shown as "?" or placeholder)
- UI labels this as approximate; real routing is post-MVP

### Map Interaction
- Standard pinch-to-zoom, pan, rotate
- Time slider positioned below map, above venue list — separated from map to avoid accidental drags
- Portrait-only for MVP
- 3D tilt disabled for MVP (simplifies pin/polygon display)

### Map / List Layout Interaction
- **Map is pinned at the top** of the viewport (below weather banner + filter chips)
- **Venue list is a draggable bottom panel** below the time slider:
  - **Collapsed (default):** shows 2-3 venue cards peeking above the bottom edge
  - **Expanded:** user drags list up to cover the map, revealing the full scrollable venue list
  - **Intermediate positions snap** to collapsed or expanded (no free-floating)
- This follows the Google Maps / Apple Maps pattern users already know
- The time slider is always visible between map and list, never covered by either

### Bottom Sheet Behavior (Venue Detail)
- Tapping a pin or venue card opens bottom sheet at half-screen
- Swipe up for full detail view
- Swipe down to dismiss
- When open: map recenters to show venue, time slider remains accessible above the sheet
- Left/right swiping between venues is post-MVP; user dismisses and taps another pin

### Loading States
- **Initial load:** Venue list shell + optional map skeleton (gray rectangle with Halifax outline)
- **Shadow computation:** Map loads immediately without shadows. Shadows fade in when WebGL computation completes (1-3s)
- **Venue data:** Skeleton cards (gray blocks for photo, text placeholders) → real data
- **Photo loading:** Blurred placeholder → sharp image

### Performance Targets
- Time to interactive: < 3 seconds on 4G for the list-first shell
- Initial route JS: keep core shell lean; map and shadow libraries lazy-loaded after first paint
- Shadow overlay target: usable on iPhone 12 / equivalent, but not a release blocker if the list-first experience is strong
- WebGL fallback: if not supported, show venue list with pre-computed venue forecast but no visual shadow overlay. Display banner: "Shadow map requires a modern browser"

---

## Data Bootstrapping Strategy (Zero Manual Data)

Since no API reliably returns "this restaurant has a patio," we use a multi-signal pipeline:

### Step 1: Google Places Nearby Search
- All restaurants/bars/cafes in Halifax bounding box
- ~500-800 results
- Fields (Essentials tier, 10K free/mo): name, place_id, lat, lng, rating, types, hours, photos, priceLevel

### Step 2: Cross-Reference with OpenStreetMap
- Overpass API query for `outdoor_seating=yes` in Halifax bounding box
- Match to Google Places venues by name + proximity
- ~50-100 matches expected (OSM tagging in Atlantic Canada is thin)

### Step 3: Google Places Review Keyword Scan
- For remaining unmatched venues, pull top reviews
- Scan for: "patio", "outdoor", "outside seating", "deck", "rooftop", "terrace", "beer garden"
- Internal scoring: 3+ reviews mentioning patio keywords = launch candidate
- 1-2 mentions = hold for verification, not user-facing confidence copy

### Step 4: Patio Point Estimation
- For confirmed patios, estimate patio location as a single representative point:
  - Use building footprint from Overture Maps / OSM
  - MVP default: representative patio point on the building's street-facing side
  - The point must sit just outside the building footprint on the patio-facing side (target offset: 1-2m), never inside the building polygon
  - Flag all estimated geometry as "estimated" with option for users to correct via "Report a Problem"
- Display confidence: "Verified patio location" vs "Estimated patio location"
- Patio polygon support (for precise multi-point sampling) is post-MVP — added when businesses claim and draw their exact patio boundary
- Yelp is intentionally excluded from MVP to avoid API approval, caching restrictions, and another licensing dependency

### Data Refresh
- Full pipeline re-run: monthly
- Google Places data (ratings, hours, photos): weekly cron
- User corrections: applied immediately, flagged for admin review

---

## User Participation & Growth

### For Users
- **"Suggest a Patio"** — simple form: search for a venue by name, confirm it has a patio, optionally drop a pin for patio location. Low friction, like contributing to Google Maps
- **"Report a Problem"** — "this patio is closed", "patio is on the other side", "this place closed down"
- **Favorites** (localStorage for MVP, no auth required) — save preferred venues, see them highlighted on map
- **Recently Viewed** (localStorage) — quick access to last 5 viewed venues

### For Businesses (Post-MVP)
- **"Claim Your Patio"** — verify ownership, then:
  - Upload exact patio boundary (polygon drawing tool)
  - Edit hours, menu link, reservation link, happy hour times
  - Add photos
  - Get a "Verified" badge on map
- **Promoted Pins** — paid placement: larger/branded pin when patio is in the sun
- **Sponsored Cards** — appear at top of venue list during sun hours
- **Embed Widget** — venues embed a live "sun status" badge on their own website

### Viral Mechanics
- Share buttons on every venue card → deep links with OG preview
- Dynamic OG images: "3 sunny patios right now in Halifax" for the homepage
- SEO landing pages: `/sunny-now` captures "sunny patios halifax" searches
- Seasonal re-engagement: "Patio season is back! ☀️" push via PWA (post-MVP)

---

## Tech Stack

### Frontend
- **Next.js 15** (React) — SSR for SEO, App Router
- **Mapbox GL JS v3** — map rendering, markers, optional 3D context
- **mapbox-gl-shadow-simulator** (npm, v0.66.0, actively maintained) — optional client-side shadow overlay
  - Requires ShadeMap API key (from shademap.app/about)
  - Uses WebGL custom layers to render shadows from extruded geometry
  - Used for visual exploration only, not for server-side truth
  - Shadow accuracy depends on building height data quality
- **SunCalc.js** — sun position calculations (azimuth, altitude) for sunrise/sunset times and server forecast jobs
- **Tailwind CSS** — styling
- **@vercel/og** — dynamic OG image generation

### Data Sources
- **Building Height Data** — THIS IS THE CRITICAL BOTTLENECK
  - Need one geometry source for backend forecast jobs and, ideally, the client map overlay
  - **Phase 0 validation spike:** confirm Halifax downtown footprint + height coverage and validate licensing before committing to the architecture
  - **Canonical-source decision rule for MVP:** use Overture as the backend source only if the launch-zone validation shows >=90% footprint coverage and >=80% non-null height coverage with acceptable spot checks on a small sample of downtown buildings. If Overture misses that bar, NS LiDAR-derived heights become the canonical backend source and Overture/OSM remain footprint helpers only.
  - **Fallback options (in order of preference):**
    1. **Overture Maps Foundation** — footprints and any usable height data
    2. **Nova Scotia LiDAR data** — free from province (NS Elevation Data Explorer). Process to derive building heights. Best accuracy + free but most work.
    3. **ShadeMap paid tier** — LiDAR-derived heights for the downtown core if licensing works
    4. **Manual height fixes** — only for a small set of high-impact downtown buildings
- **Google Places API (New)** — venue data
  - Essentials tier: 10K free/mo (name, location, rating, hours, photos, types, priceLevel)
  - `outdoorSeating` field exists but requires Enterprise tier (1K free calls) — skip, use multi-signal pipeline instead
- **OpenStreetMap / Overpass API** — `outdoor_seating` tag, building footprints
- **Environment Canada Weather API** — current conditions for Halifax, free
- **ShadeMap API / data** (optional upgrade) — higher accuracy shadows using LiDAR + tree canopy data if licensing and cost make sense

### Backend
- **Supabase** — PostgreSQL + PostGIS for venue data, user submissions, and forecast buckets
- **Vercel** — hosting (Next.js native deployment)
- **Vercel Cron / scheduled jobs** — sunrise: full-day forecast; every 15 min: current slot recompute; nightly: delete stale forecast rows
- **Server forecast engine** — Node/TypeScript job using SunCalc + PostGIS geometry queries to estimate whether a patio point is blocked by nearby buildings (see Architecture section for algorithm)

### Data Fetching Pattern
- App Router Server Components read from Supabase directly for `/`, `/sunny-now`, and `/venue/[slug]`
- Route handlers are only needed for writes (`/api/submissions`) and share/metadata helpers if required

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Frontend                           │
│  Next.js 15 + Mapbox GL + Optional Shadow Overlay    │
│                                                       │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐          │
│  │ Map View  │  │ Time     │  │ Venue     │          │
│  │ + Markers │  │ Slider   │  │ Cards     │          │
│  └──────────┘  └──────────┘  └───────────┘          │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐          │
│  │ Weather   │  │ Filters  │  │ Share /   │          │
│  │ Banner   │  │ + Search │  │ OG Images │          │
│  └──────────┘  └──────────┘  └───────────┘          │
└───────────────────┬──────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│              Supabase (PostgreSQL + PostGIS)           │
│                                                       │
│  venues: id, name, slug, type, lat, lng,             │
│          sun_query_point, patio_confidence,           │
│          google_place_id,                            │
│          website, phone, rating, price_level,        │
│          hours, patio_season_only, address,          │
│          neighborhood, photos,                       │
│          last_verified_at                            │
│                                                       │
│  buildings: id, footprint, height_m, source          │
│                                                       │
│  venue_sun_forecast: venue_id, slot_starts_at,       │
│          status, confidence                          │
│                                                       │
│  user_submissions: id, venue_id, venue_name,         │
│          lat, lng, submission_type,                  │
│          submitted_by, status                        │
└──────────────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│              Vercel Cron Jobs                          │
│                                                       │
│  At sunrise: full-day forecast for all venues         │
│  Every 15 min: recompute current slot only           │
│  Nightly: delete forecast rows older than 2 days     │
│  Weekly: refresh Google Places data                   │
│  Monthly: re-run patio detection pipeline            │
└──────────────────────────────────────────────────────┘
```

**Authoritative venue forecast is server-side.** A scheduled job computes sun/shade predictions for the current day in 15-minute buckets using:
1. SunCalc for sun azimuth + altitude
2. Patio representative points stored in PostGIS (polygon support is post-MVP)
3. Nearby building footprints + heights to test whether the sun ray is blocked
4. All `slot_starts_at` values are `TIMESTAMPTZ` (PostgreSQL stores internally as UTC, renders in session timezone). The cron generates slots aligned to 15-minute boundaries in Atlantic Time, but stores them as `TIMESTAMPTZ` so AST/ADT transitions are handled by PostgreSQL automatically. **Do not assume the stored value is in any particular timezone — always use `AT TIME ZONE` for display.**
5. Stored geometry stays in `GEOMETRY(..., 4326)` for interchange and map rendering, but every meter-based forecast operation must cast to `geography` (or transform to a projected CRS) before using `ST_DWithin`, `ST_Distance`, or any other distance calculation. Do not use raw `4326` geometry distances for forecast logic.

**Obstruction check algorithm (pseudocode):**
```
for each venue V:
  P = V.sun_query_point  (the estimated patio point)
  sun = SunCalc.getPosition(time, P.lat, P.lng)
  if sun.altitude <= 0: classify as 'shade' (sun below horizon)

  # SunCalc azimuth is not a compass bearing; convert it first
  bearing = convert SunCalc azimuth to compass bearing
            (degrees clockwise from north)

  # Build a 500m sun ray starting at the patio point
  ray_end = project point P 500m along bearing
  sun_ray = line from P to ray_end

  # Query buildings within 500m of P using meter-based geography casts
  buildings = SELECT footprint, height_m FROM buildings
              WHERE ST_DWithin(footprint::geography, P::geography, 500)

  if count(buildings) > 0 and
     count(buildings where height_m IS NULL) / count(buildings) > 0.5:
    classify as 'unknown'  # insufficient nearby height coverage
    continue

  for each building B where height_m IS NOT NULL:
    if sun_ray does not intersect B.footprint: skip B

    # Find the first point where the ray hits the building footprint
    hit_point = first intersection point between sun_ray
                and B.footprint boundary in the ray direction

    distance = ST_Distance(P::geography, hit_point::geography)
    building_angular_elevation = atan2(B.height_m, distance)

    if building_angular_elevation > sun.altitude:
      classify as 'shade'  # this building blocks the sun
      break

  if no building blocks: classify as 'sun'
```
- **Query radius:** 500m. At the lowest useful sun altitude (~10 degrees), a 50m building casts a ~280m shadow. 500m provides margin.
- **`unknown` classification:** returned when nearby height coverage is insufficient. MVP rule: if more than 50% of buildings within the 500m query radius have `height_m IS NULL`, classify as `unknown` before ray testing.
- **Note:** this checks a single point against building edges. It does not account for gaps between buildings, trees, or terrain. Accuracy improves with better building data.

**Forecast scheduling:**
- **Daily full compute:** at sunrise (computed from SunCalc), generate all slots from sunrise to sunset for all venues. This is the primary compute run (~50-100 venues x ~60 slots = 3,000-6,000 rows).
- **Every 15 min:** recompute only the current slot for all venues (handles any data changes mid-day).
- **Nightly cleanup:** delete all `venue_sun_forecast` rows older than 2 days to prevent unbounded table growth on Supabase free tier.
- **Stale data handling:** if the cron has not run today (e.g., Vercel cold start delay), SSR pages show: "Sun predictions are loading..." instead of stale yesterday data.

**Client-side shadow rendering is optional.** The browser may render a visual shadow overlay using Mapbox + `mapbox-gl-shadow-simulator`, but that overlay is not the system of record for filtering, SEO, or sharing. Note: the client overlay and server forecast may occasionally disagree because they use different building data sources and resolution. The server forecast (venue list, filters, SEO) is always authoritative.

**MVP classification:** `sun`, `shade`, or `unknown` only. Polygon-based multi-point sampling (`full_sun`, `partial_sun`) is post-MVP — add when verified patio polygons exist.

**MVP confidence labels:** `estimated` and `verified` only.

---

## Data Model

### venues
```sql
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- generated via slugify(name) with numeric suffix for collisions
  type TEXT NOT NULL CHECK (type IN ('restaurant', 'bar', 'cafe', 'brewery')),
  lat DOUBLE PRECISION NOT NULL,  -- venue entrance / business location (used for distance calculations)
  lng DOUBLE PRECISION NOT NULL,  -- venue entrance / business location (used for distance calculations)
  sun_query_point GEOMETRY(Point, 4326) NOT NULL, -- estimated patio location (used for sun forecast queries — often different from lat/lng)
  patio_confidence TEXT DEFAULT 'estimated' CHECK (patio_confidence IN ('verified', 'estimated')),
  -- MVP uses 'estimated' and 'verified' only. Granular source tracking (user_verified, business_verified, admin_verified) is post-MVP.
  google_place_id TEXT,
  website TEXT,
  phone TEXT,
  rating NUMERIC(2,1),
  price_level INTEGER CHECK (price_level BETWEEN 1 AND 4), -- 1=$ 2=$$ 3=$$$ 4=$$$$
  hours JSONB, -- see Hours JSONB Schema below
  patio_season_only BOOLEAN DEFAULT true, -- if true, MVP assumes patio season is May-October
  address TEXT,
  neighborhood TEXT,
  photos JSONB, -- [{"url": "...", "html_attributions": ["<a href='...'>Photographer</a>"], "photo_reference": "...", "fetched_at": "2026-03-23T..."}]
  last_verified_at TIMESTAMPTZ, -- populated when patio_confidence is upgraded to 'verified'
  data_sources JSONB, -- {"google": true, "osm": true, "user": false}
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_venues_location ON venues USING GIST (
  ST_SetSRID(ST_MakePoint(lng, lat), 4326)
);
CREATE INDEX idx_venues_sun_query_point ON venues USING GIST (sun_query_point);
CREATE INDEX idx_venues_location_geog ON venues USING GIST (
  ((ST_SetSRID(ST_MakePoint(lng, lat), 4326))::geography)
);
CREATE INDEX idx_venues_sun_query_point_geog ON venues USING GIST (
  (sun_query_point::geography)
);
CREATE INDEX idx_venues_slug ON venues (slug);
CREATE INDEX idx_venues_type ON venues (type);
```

**Hours JSONB Schema:**
All times are in **Atlantic Time** (matching Google Places local timezone for Halifax venues). The format supports after-midnight closing and multiple periods per day:
```json
{
  "mon": [{"open": "11:00", "close": "22:00"}],
  "tue": [{"open": "11:00", "close": "22:00"}],
  "fri": [{"open": "11:00", "close": "02:00"}],  // close "02:00" means 2am Saturday
  "sat": [
    {"open": "10:00", "close": "15:00"},           // brunch
    {"open": "17:00", "close": "02:00"}            // dinner + late night
  ]
}
```
- A `close` time numerically less than `open` means the venue closes after midnight (the next calendar day)
- Days with no entry = closed that day
- Holiday / special hours are not tracked in MVP

**Slug generation:** `slugify(name)` lowercased, hyphens for spaces, strip special characters. On collision, append `-2`, `-3`, etc. (e.g., `the-patio`, `the-patio-2`).

### buildings
```sql
CREATE TABLE buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  footprint GEOMETRY(Polygon, 4326) NOT NULL,
  height_m DOUBLE PRECISION, -- NULL if height unknown (triggers 'unknown' classification for nearby patios)
  source TEXT NOT NULL CHECK (source IN ('overture', 'osm', 'lidar', 'manual')),
  source_id TEXT, -- original ID from the source dataset for deduplication
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_buildings_footprint ON buildings USING GIST (footprint);
CREATE INDEX idx_buildings_footprint_geog ON buildings USING GIST ((footprint::geography));
CREATE INDEX idx_buildings_source ON buildings (source);
```

**Building data import notes:**
- Phase 0 validates coverage for downtown Halifax bounding box (~44.640, -63.585 to ~44.652, -63.565)
- Buildings without `height_m` are still imported (footprint is useful even without height)
- Forecasts return `unknown` when nearby height coverage is insufficient by the rule above (>50% of buildings within 500m lack heights)
- Manual height overrides (`source = 'manual'`) are used sparingly for high-impact downtown buildings only

### venue_sun_forecast (pre-computed by scheduled job)
```sql
CREATE TABLE venue_sun_forecast (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  slot_starts_at TIMESTAMPTZ NOT NULL, -- TIMESTAMPTZ: stored as UTC internally, use AT TIME ZONE 'America/Halifax' for display
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('sun', 'shade', 'unknown')), -- MVP: point-only classification. full_sun/partial_sun added post-MVP with polygon support.
  confidence TEXT NOT NULL CHECK (confidence IN ('estimated', 'verified')), -- denormalized from venues.patio_confidence for query convenience; may lag if venue is upgraded between cron runs
  UNIQUE (venue_id, slot_starts_at)
);

CREATE INDEX idx_sun_forecast_venue ON venue_sun_forecast (venue_id, slot_starts_at);
CREATE INDEX idx_sun_forecast_slot ON venue_sun_forecast (slot_starts_at, status); -- for cross-venue queries like /sunny-now
```

**Key query for `/sunny-now` SSR page:**
```sql
SELECT v.*, f.status, f.confidence
FROM venues v
JOIN venue_sun_forecast f ON f.venue_id = v.id
WHERE f.slot_starts_at = date_trunc('hour', now()) + interval '15 min' * floor(date_part('minute', now()) / 15)
  AND f.status = 'sun'
```
This rounds `now()` down to the nearest 15-minute boundary and finds venues whose current slot is `sun`. The SSR layer then applies the default `Best match` ordering for sunny venues: continuous sun time remaining (descending), then distance if available, otherwise alphabetical. `ORDER BY f.computed_at DESC` is intentionally omitted because it is not a user-meaningful ranking.

### user_submissions
```sql
CREATE TABLE user_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id) ON DELETE SET NULL, -- populated for "Report a Problem" on an existing venue
  venue_name TEXT NOT NULL,
  lat DOUBLE PRECISION, -- optional pin drop location
  lng DOUBLE PRECISION, -- optional pin drop location
  submission_type TEXT NOT NULL CHECK (submission_type IN ('new_patio', 'correction', 'closure_report')),
  details TEXT, -- free-text description of the issue
  submitted_by TEXT, -- email (optional) or "anonymous"
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Submission form flow:**
- Accessible via "Suggest a Patio" button (in empty state card or footer) or "Report a Problem" on venue detail cards
- Fields: venue name (free text, required), submission type (radio), optional pin drop on map, optional details text, optional email
- When launched from an existing venue card, `venue_id` is passed automatically and `venue_name` is prefilled
- On submit: confirmation message "Thanks! We'll review your suggestion." No email follow-up in MVP.
- Admin review: manual via Supabase dashboard. No admin UI in MVP.
- Polygon submissions and Google Places autocomplete in the form are post-MVP.

---

## UI Design Direction

### Layout (Mobile)
```
┌─────────────────────────────────────────┐
│ ☀ SunSpot Halifax    ☁️ 18°C   [🔍]    │  ← Weather banner + search
│─────────────────────────────────────────│
│ [Sunny Now] [Hide Closed] [Type ▾] [Sort ▾] │  ← Filter chips (scrollable)
│─────────────────────────────────────────│
│                                         │
│         [    MAP WITH SHADOWS    ]      │  ← ~55% of screen
│         [    + VENUE PINS        ]      │
│         [    + CLUSTERS          ]      │
│                                         │
│  ◀━━━━━━━━━●━━━━━━━━━━━━━━━━━━━▶       │  ← Time slider
│  6am      2:30pm (now)    ✦ 8pm        │     ✦ = golden hour marker
│─────────────────────────────────────────│
│  ☀ Stubborn Goat Beer Garden    5min 🚶│  ← Venue list (draggable panel)
│    Sunny predicted · 2.5h left · ⭐4.3 · $$ │
│  ◾ Lot Six Bar Patio           3min 🚶│
│    Shade · Sun predicted at 4pm · ⭐4.1 · $$$ │
│  ◾ Good Robot Patio             8min 🚶│
│    Shade · Sun predicted at 4pm · ⭐4.5 · $ │
│─────────────────────────────────────────│
└─────────────────────────────────────────┘
```

### Venue Detail (Bottom Sheet — Half Screen)
```
┌─────────────────────────────────────────┐
│  ━━━━  (drag handle)                    │
│                                         │
│  [  PHOTO  ]  The Stubborn Goat         │
│  [         ]  Beer Garden               │
│              ☀ Sunny predicted until 5:00pm │
│                                         │
│  ⭐ 4.3  |  Bar & Restaurant  |  $$    │
│  📍 1579 Grafton St · 5 min walk       │
│  🕐 Open · Closes 11pm                 │
│                                         │
│  Sun Forecast Today:                    │
│  ░░░░██████████████░░░░  Best: 11am-5pm│
│  6am              sunset                │
│  Photo: Google Places                   │
│                                         │
│  [Directions]  [Website]  [Share 🔗]   │
│                                         │
│  📍 Patio location: Estimated           │
│     [Help us verify →]                  │
└─────────────────────────────────────────┘
```

### Empty States
- **No venues nearby:** "No patios nearby. Try: [Waterfront] [Spring Garden] [North End]"
- **No filter results:** "No venues match your filters." with a [Clear filters] button
- **All in shade:** "All patios are in shade right now. Try sliding ahead to find the next sunny window."
- **After sunset:** "Sun's down for today. Predictions resume tomorrow after sunrise."
- **Off-season:** "Patio season runs May-October. Some venues may be closed for the season."
- **WebGL not supported:** "Shadow map requires a modern browser. Here are today's sunny patios:" → shows pre-computed venue list
- **Venue not found (404):** "Venue not found. Browse all patios →"

---

## Accessibility

- **Screen readers:** Venue list provides full text alternative to visual map. Sun status communicated as text ("Sunny predicted until 5pm"), not just color.
- **Color blindness:** Sun status uses icons + text, not color alone. Palette tested against deuteranopia/protanopia.
- **Keyboard navigation:** Time slider, filter chips, and venue list all keyboard-accessible. Tab order: filters → slider → venue list.
- **Alt text:** Map has `aria-label="Map of Halifax patios with optional shadow overlay"`. Each pin has `aria-label="[Venue name], [predicted sun status], [confidence]"`.
- **Reduced motion:** Respect `prefers-reduced-motion` — disable shadow animation transitions, skip tooltip animations.

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Mapbox token invalid/expired | Hide map, keep SSR venue list and detail pages working |
| Supabase connection failure | Show error: "Could not load venues. Please try again." with retry button. Service worker caching is post-MVP. |
| WebGL not supported | Show venue list with pre-computed venue forecast, no shadow overlay |
| Shadow overlay fails | Venue list still works with server forecast; show non-blocking banner |
| Location permission denied | Default to Halifax downtown, disable distance sort |
| Location timeout | Default to Halifax downtown, retry silently |
| No building height data for area | Show venue with "Unknown" sun status badge, not hidden |
| All API rate limits hit | Show last SSR-rendered page from Vercel edge cache; degrade gracefully |

---

## Analytics (MVP)

- **Vercel Analytics** (free tier) — page views, Web Vitals
- **Custom events** (Vercel or PostHog free tier):
  - `venue_tap` — which venues get clicked
  - `filter_toggle` — which filters are used, how often
  - `share_tap` — share button usage + platform
  - `time_slider_scrub` — do people use the time slider?
  - `submission_start` — "Suggest a Patio" form opens
  - `empty_state_shown` — track when users hit dead ends
  - `webgl_fallback` — how often WebGL fails

---

## Security

- **Mapbox token:** Domain-restricted (only works from sunspothalifax.com + localhost)
- **Supabase RLS:** Read-only public access to `venues` + `venue_sun_forecast` tables. Write access only for submissions table (insert-only, no update/delete). Admin access via service role key (server-side only).
- **Read protection:** cache SSR responses at the Vercel edge and rate-limit public read endpoints/pages to reduce scraping and Supabase load
- **Rate limiting:** Supabase rate limits on submissions table (10 per IP per hour)
- **Spam prevention:** Honeypot field on submission form. CAPTCHA if spam becomes an issue.
- **API keys:** All third-party keys in environment variables, never client-side except Mapbox token (which is domain-restricted by design).

---

## Development Phases

### Phase 0: Validation Spike (1-2 days)
- [ ] Validate building footprint + height coverage for downtown Halifax bounding box (~44.640, -63.585 to ~44.652, -63.565)
- [ ] Apply the canonical-source decision rule: Overture only passes if it meets the launch-zone coverage threshold; otherwise switch the backend forecast source to NS LiDAR-derived heights
- [ ] Import buildings into `buildings` table from best available source (Overture Maps → NS LiDAR → manual)
- [ ] Validate `mapbox-gl-shadow-simulator` licensing/commercial terms
- [ ] Prototype one server-side obstruction check using the algorithm in the Architecture section for 3-5 sample venues
- [ ] Document findings — this determines whether the architecture works at all
- **GO / NO-GO decision after this phase**

### Phase 1: List-First MVP Shell (1 weekend)
- [ ] Set up Next.js 15 app shell with SSR routes
- [ ] Add time slider (sunrise to sunset, 15-minute increments, golden hour marker)
- [ ] Add weather banner (Environment Canada API)
- [ ] Add loading skeleton and venue list shell
- [ ] Add `/sunny-now` and `/venue/[slug]` routes
- [ ] Verify first paint and SSR behavior on mobile

### Phase 2: Venue Data Pipeline (1 week)
- [ ] Run Google Places Nearby Search for Halifax bounding box
- [ ] Cross-reference with OSM `outdoor_seating` tag
- [ ] Review keyword scan of Google Places reviews
- [ ] Generate representative patio points for launch-candidate venues
- [ ] Set up Supabase tables (`venues`, `buildings`, `venue_sun_forecast`, `user_submissions`)
- [ ] Import building data from Phase 0 validated source
- [ ] Import venue data
- [ ] Launch with verified/estimated venues that pass the internal launch threshold (30 minimum); hold the rest for review

### Phase 3: Forecast Engine + Filters (1 week)
- [ ] Implement server-side sun/shade forecast job using SunCalc + PostGIS obstruction checks (see Architecture section for algorithm)
- [ ] Store 15-minute forecast buckets for the current day (sunrise full compute + 15-min incremental)
- [ ] Add nightly cron to delete forecast rows older than 2 days
- [ ] Derive `sun_until` / "best predicted sun" in the API layer
- [ ] Compute `Hide Closed` at the selected slider time from `venues.hours` + `patio_season_only`
- [ ] Implement filters: Sunny Now, Hide Closed, Venue Type, Sort (with specified Best Match algorithm)
- [ ] Add text search (client-side filter on venue name)
- [ ] Add "no filter results" empty state
- [ ] Bottom venue list sorted by remaining sun time, with distance

### Phase 4: Map + Venue Details (1 week)
- [ ] Venue detail bottom sheet (tap to open, swipe down to dismiss — no left/right swiping)
- [ ] "Best predicted sun" derived from forecast buckets
- [ ] Add lazy-loaded Mapbox map with markers + standard clustering (count badges)
- [ ] Cluster tap → zoom to reveal pins
- [ ] Add optional shadow overlay behind capability check
- [ ] Share functionality (Web Share API + OG images)
- [ ] `/venue/[slug]` SSR detail page (standalone, map lazy-loaded below fold, "Back to all venues" link)
- [ ] Mobile-responsive polish — test on real phones
- [ ] Inline onboarding tooltips (first visit only)
- [ ] Empty states (no venues, no filter results, all shade, after sunset, off-season, venue not found)

### Phase 5: Community + Deploy (3 days)
- [ ] "Suggest a Patio" submission form (venue name + optional pin drop + optional details)
- [ ] "Report a Problem" on venue cards
- [ ] Submission confirmation UI + admin review via Supabase dashboard
- [ ] Favorites + Recently Viewed (localStorage)
- [ ] Accessibility audit (screen reader, keyboard, color contrast)
- [ ] Analytics setup (Vercel Analytics + custom events)
- [ ] Deploy to Vercel
- [ ] SEO: meta tags, sitemap, OG images
- [ ] Share on r/halifax, Halifax Twitter, local Facebook groups

### Phase 6: Growth & Business (Post-MVP)
- [ ] Verified patio polygons + multi-point sampling (`full_sun`/`partial_sun` classification)
- [ ] Swipeable bottom sheet (left/right between venues)
- [ ] Custom cluster styling (dominant sun status)
- [ ] Service worker caching for offline/degraded support
- [ ] "Claim Your Patio" for businesses (polygon editor, verified badge)
- [ ] Promoted/sponsored pins
- [ ] Happy hour data overlay
- [ ] Push notifications via PWA: "Your favorite patio just hit the sun"
- [ ] Multi-day planning (slider for tomorrow, this weekend)
- [ ] Tree shadow accuracy upgrade (ShadeMap LiDAR data — $15 for downtown)
- [ ] Dog-friendly, wheelchair accessible, covered patio filters
- [ ] Native iOS app (if web traction justifies it)
- [ ] Expansion to other cities

---

## Key Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Building heights missing or inconsistent for Halifax | HIGH | Phase 0 validation spike. Fallback chain: Overture Maps → NS LiDAR → ShadeMap data → manual fixes for a small downtown set. |
| Server forecast model is directionally wrong | HIGH | Start with downtown only, estimated patio points, and spot-check 5-10 real patios before launch. Label all estimated geometry clearly. |
| Patio detection pipeline misses venues | MEDIUM | Google Places + OSM + review keywords catches a useful subset. Launch only venues that pass the internal threshold; submissions fill gaps. |
| Weather destroys trust on cloudy days | HIGH (without mitigation) | Weather banner in MVP (Phase 1). Clear messaging that shadows show clear-sky positions. |
| Seasonal business (May-Oct) | LOW | Embrace it. Winter mode shows sunny walking routes, south-facing lunch spots. Revenue focuses on summer. |
| WebGL performance on old phones | MEDIUM | Progressive enhancement: list works without WebGL, shadows are bonus. Keep the map lazy-loaded. |
| `mapbox-gl-shadow-simulator` licensing or maintenance is not viable | MEDIUM | Treat it as optional. The core product should still ship with SSR list + forecast engine. |
| Open-hours data is messy or patio-specific hours differ | MEDIUM | Keep `Hide Closed` defeatable, label seasonal uncertainty, and avoid implying patio-specific hours unless verified. |
| Low initial venue coverage | MEDIUM | Start with ~30-50 launch-ready venues. Clearly label `estimated` vs `verified`. User submissions fill gaps. |

---

## Cost Estimate (Annual, Hobby Scale)

| Service | Cost |
|---------|------|
| Mapbox GL JS | Free up to 50K map loads/mo |
| ShadeMap API key | Optional for shadow overlay only. Educational/hobby: free. Commercial: TBD |
| Supabase | Free tier (500MB, 50K requests) |
| Vercel | Free tier (hobby) |
| Google Places API | ~$5-20/mo for venue data refresh |
| Environment Canada API | Free |
| Domain | ~$12/year |
| NS LiDAR / derived height processing | Mostly time cost unless outsourced |
| ShadeMap LiDAR (optional) | ~$15 one-time for downtown Halifax |
| **Total** | **~$17-60/year + implementation time** (hobby) |

---

## Success Metrics

| Phase | Success Criteria |
|-------|-----------------|
| Phase 0 | Building data + licensing validated, and one server-side obstruction prototype works |
| Phase 1 | Fast SSR shell works on mobile and communicates the concept clearly |
| Phase 2 | 30+ venues imported with usable representative patio points and confidence labels |
| Phase 3 | Forecast engine is directionally accurate (spot check 5-10 patios in person) |
| Phase 4 | End-to-end flow works: find sunny patio → inspect venue → get directions → share with friend |
| Phase 5 | 100+ unique visitors in first week from local sharing |
| Long-term | Becomes the go-to "where's sunny" tool for Halifax summers |

---

## Open Questions

1. ~~Which building dataset becomes the canonical backend geometry source?~~ **Resolved decision rule:** Phase 0 promotes Overture only if launch-zone validation shows >=90% footprint coverage and >=80% non-null height coverage with acceptable spot checks. Otherwise NS LiDAR-derived heights become the canonical backend source. ShadeMap/manual remain fallback options.
2. ~~Does MVP launch with estimated patio points only?~~ **Resolved:** MVP uses estimated patio points only. Polygon support is post-MVP.
3. **How many launch-ready patios will the pipeline actually find?** Unknown until we run it. 30 minimum is a hard gate.
4. **Is the optional shadow overlay worth the licensing/performance complexity for MVP, or should it wait until v1.1?**
5. **Time slider auto-advance behavior:** Does the "now" marker auto-advance in real-time, or is it fixed to page load time with a "Right now" button to refresh? Recommended: fixed to page load, refresh on button tap (simpler, avoids continuous re-renders).
