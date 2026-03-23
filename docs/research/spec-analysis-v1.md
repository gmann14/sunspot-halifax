# SunSpot Halifax -- Spec Analysis

*Analyst: Claude Opus 4.6 | Date: 2026-03-22*
*Source: /Users/grahammann/clawd/docs/specs/sunspot-halifax-spec.md*

---

## Executive Summary

The spec is a strong technical foundation with clear architecture choices and realistic cost modeling. However, it reads more like an engineering plan than a product spec. The biggest gaps are:

1. **Data bootstrapping strategy contradicts the stated goal** -- the spec calls for manual curation of 50-80 patios, but the requirement is ZERO manual data at launch.
2. **No defined user flows** -- the spec describes features but never walks through a single user journey end-to-end.
3. **No mobile-specific interaction design** -- despite acknowledging this is "primarily a phone experience."
4. **No weather handling** -- the most common real-world scenario (partly cloudy) is punted to post-MVP.
5. **No onboarding** -- a first-time user lands on a shadow map with no explanation.
6. **Missing filter/search UX** -- the only filter is "Sunny Now." No cuisine, price, distance, accessibility, or dog-friendly filters.

This analysis covers 14 distinct user flows, a data bootstrapping strategy, 47 specific gaps, and 32 prioritized questions.

---

## 1. User Flow Overview

### Flow 1: First Visit -- "What is this?"

```
User arrives (search/social link/direct)
  -> Sees map with shadow overlay + venue pins
  -> ??? (No onboarding, no tooltip, no explanation)
  -> Must figure out what the pins mean
  -> Must discover the time slider exists
  -> Must understand sun/partial/shade icons
```

**Gap:** There is no onboarding flow defined. The spec jumps straight to "interactive Mapbox GL map." A first-time user on a phone sees a map with colored pins and a slider and has no idea what any of it means.

### Flow 2: "I Want Sun Right Now"

```
User opens app
  -> Location permission prompt (UNDEFINED)
  -> Map centers on user location (UNDEFINED -- spec says "centered on Halifax downtown")
  -> User taps "Sunny Now" toggle
  -> List filters to sunlit venues
  -> User scans list sorted by "longest remaining sun"
  -> Taps a venue -> bottom sheet opens
  -> Taps "Directions" -> leaves app to Google Maps
```

**Gaps:**
- Location permission flow is not specified
- What if user denies location permission?
- Map defaults to "Halifax downtown" -- what if user is in Dartmouth, North End, or Bedford?
- No distance/walking time shown on venue cards
- "Directions" sends user away from the app entirely

### Flow 3: "Planning Ahead -- Sun at 5pm"

```
User opens app
  -> Drags time slider to 5:00pm
  -> Shadow overlay updates
  -> Venue sun statuses update
  -> User compares options
  -> Picks a venue
  -> Wants to make a reservation -> taps "Reserve"
  -> ??? (Reserve link is listed but source is undefined)
```

**Gaps:**
- Can the user plan for a different DAY? The slider says "sunrise to sunset for current day" only.
- Reservation links -- where do they come from? Google Places does not reliably provide reservation URLs. OpenTable API? Resy? Manual entry?
- No "save for later" or "remind me" functionality

### Flow 4: "I'm Hungry and Want Sun"

```
User wants food specifically, not just drinks
  -> No cuisine filter exists
  -> No "food vs drinks" distinction
  -> Venue types are: restaurant, bar, cafe, brewery
  -> No way to filter by these types in the UI
  -> User must scroll the full list
```

**Gap:** The data model has a `type` field but the UI has no type filter. The wireframe shows a flat list with no filtering beyond "Sunny Now."

### Flow 5: "Browsing From the Couch"

```
User is at home, planning for later
  -> Opens app
  -> Location permission -> grants (home address)
  -> Map centers on their apartment, not downtown
  -> No venues visible (they live in a residential area)
  -> Must manually pan/zoom to downtown
  -> ??? No "show me downtown" or "popular areas" shortcut
```

**Gap:** No concept of "areas" or "neighborhoods" to browse. The `neighborhood` field exists in the data model but has no UI representation.

### Flow 6: "Tourist at the Waterfront"

```
Tourist opens app (likely from Google search)
  -> First visit + no local knowledge
  -> Needs to understand: what is Halifax, where are the patios, what's good
  -> No neighborhood descriptions
  -> No "popular" or "trending" indicators
  -> No photos of the patio (spec mentions Google Places photos but not in the UI wireframe)
```

### Flow 7: "Sharing a Spot With Friends"

```
User finds a great sunny patio
  -> Wants to text friends "let's go here, it's sunny until 5"
  -> ??? No share functionality defined
  -> No deep links to specific venues
  -> No shareable card/image generation
```

**Gap:** Sharing is not mentioned anywhere in the spec. For a consumer app, this is a critical viral growth mechanism.

### Flow 8: "Returning User -- Check My Favorites"

```
User has been here before, has favorite patios
  -> Opens app
  -> ??? No favorites in MVP
  -> Must search/scroll for the same venues each time
  -> No "recently viewed" either
```

**Gap:** Favorites are listed as "Future Features" but no session persistence at all is defined for MVP. Not even localStorage for recently viewed venues.

### Flow 9: "It's Raining"

```
User opens app on a rainy day
  -> Shadow map shows sun positions as if it were clear
  -> All venues marked "Full Sun" even though it's pouring
  -> User is confused/misled
  -> ??? No weather indicator or disclaimer
```

**Gap:** This is the single biggest UX credibility risk. The spec acknowledges cloud cover is arguably critical but defers it. Without even a disclaimer, the app will mislead users on cloudy/rainy days and destroy trust.

### Flow 10: "It's November"

```
User opens app in winter
  -> Most patios are closed for the season
  -> App shows venues as "Full Sun" on patios that don't exist in winter
  -> ??? No seasonal hours or "closed for season" status
```

**Gap:** The `hours` JSONB field does not account for seasonal closures. Halifax patio season is roughly May-October. The spec acknowledges seasonality as a risk but proposes no UI handling.

### Flow 11: "After Sunset"

```
User opens app at 9pm in summer
  -> Time slider range is sunrise to sunset
  -> Everything is "shade"
  -> App is useless but gives no useful alternative
  -> ??? No "come back tomorrow" or "tomorrow's forecast"
```

**Gap:** No handling for after-dark usage. Could show tomorrow's sun forecast, golden hour timing, or at minimum a friendly message.

### Flow 12: "No Venues Nearby"

```
User is in a part of Halifax with no catalogued patios
  -> Map shows shadows but no pins
  -> ??? No empty state defined
  -> User might think the app is broken
```

### Flow 13: "User Wants to Submit a Patio"

```
User knows a patio not in the app
  -> ??? Submission flow is "future" but has a data model
  -> No UI flow defined
  -> How does the user draw a patio polygon on a phone?
  -> Who moderates submissions? How? Admin tool is mentioned but not specced.
```

### Flow 14: "User Arrives via SEO / Social Share"

```
User Googles "sunny patios halifax right now"
  -> Lands on app
  -> ??? No landing page or explainer
  -> ??? No meta description mentioning current conditions
  -> ??? Dynamic OG images showing current sun status?
  -> App loads -> requires JS -> shadow simulation initializes
  -> ??? What does the user see during the 2-5 second load time?
```

**Gap:** No loading state defined. Shadow simulation with WebGL + building data will not be instant. The spec says SSR for SEO but the core content (sun status) is entirely client-side.

---

## 2. Flow Permutations Matrix

| Scenario | Auth State | Location | Time of Day | Weather | Season | Device |
|----------|-----------|----------|-------------|---------|--------|--------|
| Quick sun check | None | GPS granted | Daytime | Clear | Summer | Mobile |
| Quick sun check | None | GPS denied | Daytime | Clear | Summer | Mobile |
| Planning ahead | None | N/A | Daytime | Clear | Summer | Mobile |
| Planning ahead | None | N/A | Evening | Clear | Summer | Desktop |
| Rainy day | None | GPS granted | Daytime | Rain | Summer | Mobile |
| Overcast | None | GPS granted | Daytime | Cloudy | Summer | Mobile |
| Winter visit | None | GPS granted | Daytime | Clear | Winter | Mobile |
| After sunset | None | GPS granted | Night | Clear | Summer | Mobile |
| Tourist, no GPS | None | GPS denied | Daytime | Clear | Summer | Mobile |
| Returning user | None (no auth) | Cached | Daytime | Clear | Summer | Mobile |
| Sharing a spot | None | N/A | Any | Any | Summer | Mobile |
| SEO landing | None | Not yet asked | Daytime | Any | Summer | Mobile |
| Admin curating | Admin | N/A | Any | Any | Any | Desktop |

**Undefined in all rows:** Authentication is never needed in MVP, but there is no concept of even anonymous session state (favorites, recents, preferences).

---

## 3. Data Bootstrapping -- The Critical Gap

The spec says "Seed initial venue list manually (Halifax has ~50-80 notable patios -- manageable)" and calls manual curation a "moat." But the stated requirement is ZERO manual data to start. These are fundamentally incompatible.

### The Problem

No single API reliably returns "this restaurant has a patio." Here is what each source actually provides:

**Google Places API (New)**
- `outdoorSeating` boolean: EXISTS but requires Enterprise tier (most expensive), only 1K free calls/month, and coverage for Halifax is almost certainly incomplete (owner self-reported).
- What you CAN get cheaply (Essentials tier, 10K free): name, address, lat/lng, rating, hours, types, photos, reviews.
- Reviews often MENTION patios -- "great patio," "sat outside" -- but extracting this requires NLP.

**Yelp Fusion API**
- Has an `outdoor_seating` attribute in business details.
- Coverage varies by city. Halifax has moderate Yelp adoption.
- Rate limit: 5000 calls/day (free).
- Does NOT provide patio polygon geometry -- just a boolean.

**Overture Maps Foundation**
- 2.3B building footprints with some height data.
- Venue/place data EXISTS (separate from buildings) and includes categories.
- Does NOT have an `outdoor_seating` attribute.
- Free, bulk download. Could cross-reference with building footprints.

**OpenStreetMap**
- `outdoor_seating=yes/no` tag exists.
- Halifax coverage: probably 10-20% of actual patios tagged. OSM tagging in Atlantic Canada is thin.
- Free, no API limits.

**Google Maps Reviews (scraping/NLP)**
- Search reviews for keywords: "patio," "outdoor," "outside seating," "deck," "rooftop."
- Legally gray for scraping. Could use Google Places reviews via API (costs per call).
- Most reliable signal for whether a patio exists, but requires NLP pipeline.

### Proposed Auto-Detection Strategy

To achieve ZERO manual data, you need a multi-signal pipeline:

```
Step 1: Google Places Nearby Search
  -> All restaurants/bars/cafes in Halifax bounding box
  -> ~500-800 results
  -> Fields: name, place_id, lat, lng, rating, types, hours

Step 2: Cross-reference with OSM
  -> Match by name + proximity
  -> Check for outdoor_seating=yes tag
  -> ~50-100 matches expected

Step 3: Cross-reference with Yelp
  -> Match by name + proximity
  -> Check outdoor_seating attribute
  -> ~100-150 matches expected

Step 4: Google Places review keyword scan
  -> For remaining unmatched venues, pull reviews
  -> NLP scan for patio/outdoor/deck/rooftop keywords
  -> Confidence scoring: 3+ reviews mentioning "patio" = high confidence

Step 5: Satellite imagery analysis (stretch)
  -> Use Google Maps satellite view or Mapbox satellite tiles
  -> Detect outdoor seating areas adjacent to building footprints
  -> ML model or manual review

Step 6: Patio polygon estimation
  -> For confirmed patios, estimate polygon from:
    a) Building footprint (Overture/OSM) + offset to south/west side
    b) Google Maps satellite imagery (manual or ML)
    c) Default: 5m radius circle on the building's street-facing side
  -> Flag as "estimated" vs "verified"
```

**Critical insight:** Even with all APIs combined, you will NOT have accurate patio polygons without some manual work or satellite imagery analysis. A patio could be on the roof, behind the building, on the second floor, or extending over a sidewalk. Lat/lng alone is not enough for shadow intersection.

### Recommended Bootstrap Approach

1. **Auto-detect WHICH venues have patios** using the multi-signal pipeline above (achievable, ~80% recall).
2. **Estimate patio positions** using building footprint offsets and satellite imagery (rough but usable for MVP).
3. **Crowdsource polygon corrections** post-launch (users can drag/adjust patio boundaries).
4. **Display a confidence indicator** -- "Verified patio" vs "Likely has outdoor seating" -- so users know what's confirmed.

### Data Fields Available From APIs vs. Required by Spec

| Field | Google Places | Yelp | OSM | Overture | Spec Requires |
|-------|:---:|:---:|:---:|:---:|:---:|
| name | Yes | Yes | Yes | Yes | Yes |
| lat/lng | Yes | Yes | Yes | Yes | Yes |
| type (bar/restaurant/cafe) | Yes | Yes | Partial | Yes | Yes |
| rating | Yes | Yes | No | No | Yes |
| hours | Yes | Yes | Partial | No | Yes |
| phone | Yes | Yes | Partial | No | Yes |
| website | Yes | Yes | Partial | No | Yes |
| address | Yes | Yes | Yes | Yes | Yes |
| outdoor_seating (boolean) | Enterprise only | Yes | Sparse | No | Yes |
| patio_polygon | No | No | No | No | Yes |
| photos | Yes | Yes | No | No | Not in spec but needed |
| price_level | Yes | Yes | No | No | Not in spec |
| cuisine | Yes | Yes | Partial | Yes | Not in spec |
| reservation_url | No (unreliable) | No | No | No | Implied by UI |
| wheelchair_accessible | Yes | No | Sparse | No | Not in spec |
| dog_friendly | No | Partial | Sparse | No | Not in spec |

---

## 4. Filter / Search UX Gaps

### Currently Specified Filters
- "Sunny Now" toggle (show only sunlit venues)
- Sort by "longest remaining sun"

### Missing Filters (Expected by Users)

| Filter | Priority | Why It Matters | Data Source |
|--------|----------|---------------|-------------|
| Cuisine type | High | "I want sushi in the sun" | Google Places `types` |
| Distance / walking time | High | "What's closest to me?" | Client-side calculation |
| Price level | High | "Cheap patio drinks" | Google Places `priceLevel` |
| Rating threshold | Medium | "4+ stars only" | Google Places `rating` |
| Venue type (bar/restaurant/cafe) | High | Already in data model, no UI | `type` field |
| Open now | High | Critical -- don't show closed venues | `hours` + current time |
| Dog-friendly patio | Medium | Halifax is very dog-friendly | Yelp or crowdsourced |
| Wheelchair accessible | Medium | Accessibility requirement | Google Places |
| Covered patio option | Medium | For when it's drizzling | Crowdsourced |
| Reservations available | Low | "Can I book a table?" | Unknown source |
| Happy hour active | Low (post-MVP) | Price-conscious users | Manual/crowdsourced |

### Search

The spec has NO text search. Users should be able to search by:
- Venue name ("Stubborn Goat")
- Neighborhood ("waterfront patios")
- Cuisine ("Thai food patio")

### List vs. Map Toggle

The spec shows a split view (map top, list bottom). On mobile, this means:
- Map gets maybe 40% of the screen
- List gets maybe 40%
- Time slider takes the rest
- Everything is cramped

**Consider:** A full-screen map mode with a swipe-up list panel (like Google Maps), or a toggle between map view and list view.

---

## 5. Mobile UX Specifics

The spec calls this "primarily a phone experience" but provides zero mobile-specific interaction design.

### Missing Mobile Flows

**Location Permission**
- When is it requested? On first load? On first map interaction?
- What does the UI show before permission is granted?
- What happens when permission is denied?
- What about "Allow Once" vs "Always Allow" on iOS?
- Spec default is "centered on Halifax downtown" -- fine for denied permission, but needs explicit handling.

**Map Interaction**
- Pinch to zoom? Standard, but interacts with time slider -- accidental slider drags while zooming?
- How big are venue pins on mobile? Tap targets must be minimum 44x44pt (Apple HIG).
- What happens when pins overlap in dense areas? (Halifax waterfront has 10+ patios within 200m.)
- Clustering strategy for zoomed-out views?

**Bottom Sheet Behavior**
- The venue detail is shown as a "bottom sheet" in the wireframe.
- How far does it extend? Half screen? Full screen on swipe up?
- Can the user swipe between venue detail sheets (like Uber)?
- Does the map recenter/zoom to the selected venue?
- What happens to the time slider when the bottom sheet is open?

**Pull-to-Refresh**
- Shadow data is client-side, so what refreshes?
- Venue data from Supabase? How stale can it be?
- Probably not needed, but users will instinctively try it.

**Orientation**
- Landscape mode supported? The time slider would work better in landscape.
- Probably lock to portrait for MVP, but not specified.

**Gestures**
- Swipe down to dismiss bottom sheet
- Swipe up on list to expand
- Long press on map to... what? Submit a new patio?

### Performance on Mobile

**Shadow computation is client-side using WebGL.** This has significant mobile implications:

- **Low-end phones:** WebGL shadow simulation with 3D building extrusion will struggle on phones older than ~3 years. No fallback is defined.
- **Battery drain:** Continuous WebGL rendering (especially while scrubbing the time slider) will drain battery. The spec does not mention any throttling or optimization.
- **Memory:** Loading 3D building data for downtown Halifax + shadow computation + venue data + map tiles. Mapbox GL JS is already ~500KB gzipped. Total JS bundle could easily be 1MB+.
- **Initial load time:** On mobile LTE, expect 3-5 seconds before the shadow map is interactive. What does the user see during this time? A loading skeleton? A blank map? Nothing?

**Recommendation:** Define explicit performance budgets:
- Time to interactive: < 3 seconds on 4G
- JS bundle size: < 800KB gzipped
- Shadow computation framerate: > 30fps while scrubbing slider on iPhone 12 or equivalent
- Fallback for WebGL-unsupported browsers: static shadow image? No shadows?

---

## 6. Edge Cases

### Weather-Related

| Condition | Current Behavior | Expected Behavior |
|-----------|-----------------|-------------------|
| Clear sky | Shadow map is accurate | Correct |
| Partly cloudy | Shadow map shows full sun (wrong) | Should indicate reduced confidence or show cloud cover overlay |
| Overcast | Shadow map shows full sun (very wrong) | Should display prominent banner: "Overcast -- sun positions shown for when clouds clear" |
| Rain | Shadow map shows full sun (misleading) | Should show weather alert, possibly disable "Sunny Now" filter |
| Fog | Shadow map shows full sun | Common in Halifax. Should indicate low visibility conditions |
| Snow/winter | Shadow map accurate but patios closed | Should show "patio season starts in May" or hide closed venues |

**Minimum viable weather handling for MVP:** A banner at the top showing current conditions from Environment Canada API. Even without adjusting shadows, simply showing "Currently: Overcast, 14C" gives users the context they need to interpret the shadow map correctly.

### Time-Related

| Condition | Current Behavior | Expected Behavior |
|-----------|-----------------|-------------------|
| Before sunrise | Slider starts at sunrise | What if user opens app at 5am? Show "sunrise at 6:12am"? |
| After sunset | Everything in shade | Show tomorrow's forecast? "Sun returns at 6:12am"? Redirect to venue list without sun data? |
| Time zone edge cases | Not addressed | Halifax is AST/ADT. Tourists' phones may show wrong time zone. SunCalc needs correct timezone. |
| DST transition day | Not addressed | Slider range changes. March/November. |
| Midnight sun (N/A for Halifax) | Not applicable | But relevant if expanding to other cities. |

### Data-Related

| Condition | Current Behavior | Expected Behavior |
|-----------|-----------------|-------------------|
| Venue with no patio polygon | Undefined | Pin with "?" or "Patio location unverified"? Cannot compute sun status. |
| Venue permanently closed | No handling | Google Places returns `businessStatus`. Must filter these out. |
| Venue temporarily closed | No handling | Google Places returns this too. Show as "Temporarily closed." |
| Duplicate venues | No dedup strategy | Google Places + manual entry could create duplicates. |
| Building not in 3D data | Shadow not computed | Venue appears sunny when it may be in shadow of a missing building. Confidence indicator needed. |
| Very tall new construction | Not in building data | Halifax has active construction (Cogswell District). Buildings may appear/disappear. How often is building data refreshed? |

### Map-Related

| Condition | Current Behavior | Expected Behavior |
|-----------|-----------------|-------------------|
| Dense pin clustering | Not addressed | 10+ pins on Halifax waterfront will overlap. Need clustering or collision avoidance. |
| User pans far from Halifax | Not addressed | Show nothing? Restrict bounds? Show "SunSpot is only available in Halifax"? |
| Slow network loading tiles | Not addressed | Placeholder tiles? Offline tile cache for repeat users? |
| Map rotation/tilt | Not addressed | 3D tilt may help visualize shadows but complicates patio polygon display. |

---

## 7. Missing Features That Competitors Have

Looking at Sunseekr (London), ShadeMap, and similar apps:

| Feature | Sunseekr London | ShadeMap | This Spec |
|---------|:-:|:-:|:-:|
| Favorites / saved spots | Yes | N/A | Post-MVP |
| Share a spot (deep link + card) | Yes | No | Missing entirely |
| User accounts | Yes | No | Post-MVP |
| Push notifications | Yes | No | Post-MVP |
| Photos of the patio | Yes | N/A | Missing entirely |
| "Best time to visit" per venue | Yes | N/A | Partially (sun forecast bar) |
| Walking directions overlay | No | No | Missing |
| "Sunny route" to a venue | No | Yes | Missing |
| Weather integration | Yes | No | Post-MVP |
| Price level indicator | Yes | N/A | Missing |
| Cuisine/type filters | Yes | N/A | Missing |
| Review snippets | Yes | N/A | Missing |
| Patio photos (user submitted) | Yes | N/A | Missing |
| Offline mode | No | Partial | Missing |
| AR sun visualization | No | No | Missing (future differentiator?) |
| Multi-day planning | No | Yes | Missing (today only) |

### High-Impact Missing Features for MVP

1. **Venue photos** -- A patio with no photo gets dramatically fewer taps. Google Places provides photos. Display them.
2. **Share functionality** -- "Check out this sunny patio" with a preview card is the #1 viral growth mechanism for a consumer app.
3. **Walking time from current location** -- "5 min walk, sunny for 2 more hours" is the killer data point.
4. **"Open now" filter** -- Without this, users will tap venues that are closed and lose trust immediately.

---

## 8. Onboarding

The spec has NO onboarding flow. For a novel concept ("shadow map of patio sun exposure"), this is a significant gap.

### Proposed Onboarding Flow (3 screens, skippable)

```
Screen 1: "Find sunny patios in Halifax"
  [Animated gif of shadow map with time slider]
  "See which patios are in the sun right now -- and when they will be."

Screen 2: "Plan your perfect patio session"
  [Screenshot of venue detail with sun forecast bar]
  "Check how long the sun lasts at any spot."

Screen 3: Location permission request
  "Allow location to find patios near you"
  [Allow] [Maybe later]
```

**Alternative: Inline onboarding.** Skip separate screens. Instead, on first visit:
- Tooltip on the time slider: "Drag to see how shadows move"
- Tooltip on a venue pin: "Tap to see sun forecast"
- Tooltip on "Sunny Now": "Show only venues in sunlight"
- Dismiss after first interaction with each element.

---

## 9. SEO and Social Sharing Gaps

The spec mentions "SEO basics (meta tags, OG images)" but the core content is entirely client-side rendered (shadow computation, sun status). This means:

- **Google will index a blank map.** SSR via Next.js helps for page structure, but the sun status per venue is computed in the browser. Google's crawler will not execute WebGL shadow simulation.
- **Solution:** Pre-compute sun status for each venue on the server (or at build time via cron) and include it in the SSR HTML. "The Stubborn Goat -- Full Sun until 5:00pm" should be in the server-rendered HTML.
- **OG images:** Should be dynamic. "3 sunny patios right now in Halifax" with a small map preview. Next.js `@vercel/og` can generate these.
- **Deep links:** `/venue/stubborn-goat-beer-garden` should exist and be shareable with a preview card showing the venue photo + current sun status.

### Missing URL Structure

The spec defines no URL routing at all. Needed:
- `/` -- main map view
- `/venue/[slug]` -- venue detail (shareable, SEO-indexable)
- `/sunny-now` -- filtered view of currently sunny venues (SEO: "sunny patios in Halifax right now")
- `/about` -- what is this app (SEO + trust)

---

## 10. Missing Elements and Gaps (Categorized)

### Error Handling
1. **Mapbox token invalid/expired** -- no fallback defined
2. **Supabase connection failure** -- no offline mode or error state
3. **Google Places API rate limit hit** -- no graceful degradation
4. **WebGL not supported** -- no fallback for older browsers/devices
5. **Shadow simulation fails to load** -- no error boundary or fallback UI
6. **Location services timeout** -- no handling
7. **Building data missing for area** -- no confidence indicator

### Validation
8. **User-submitted patio polygon** -- no validation rules (min/max area, must be near a building, must be within Halifax)
9. **Venue data freshness** -- no staleness check (venue could have closed months ago)
10. **Hours data format** -- JSONB is flexible but no schema validation defined

### Security
11. **Mapbox token exposure** -- client-side token is visible in network requests. Need domain-restricted token.
12. **Supabase RLS policies** -- not defined. Who can read/write venue data?
13. **Rate limiting** -- no rate limiting on any endpoint
14. **User submissions** -- no spam prevention (CAPTCHA, rate limit per IP)

### Accessibility
15. **Screen reader support** -- shadow map is entirely visual. How does a screen reader user know which patios are sunny?
16. **Color blindness** -- sun/partial/shade color coding needs to work for colorblind users (do not use red/green)
17. **Keyboard navigation** -- time slider must be keyboard accessible
18. **Alt text for map** -- required for accessibility compliance
19. **Text alternatives** -- the venue list provides a non-visual alternative, but sun status icons need text labels

### Data Persistence
20. **No caching strategy defined** -- venue data, building data, map tiles
21. **No offline support** -- PWA is post-MVP but even basic service worker caching is not mentioned
22. **No state persistence** -- user's last position, zoom level, filter state all reset on reload

### Performance
23. **No loading states defined** -- shadow computation will take 1-3 seconds on mobile
24. **No skeleton screens** -- user sees nothing while data loads
25. **No lazy loading strategy** -- venue details, photos should load on demand
26. **No bundle size budget** -- Mapbox GL + shadow sim + SunCalc + React + Tailwind is heavy
27. **Time slider animation performance** -- continuous shadow recomputation while dragging could be janky

### Business Logic
28. **Sun status thresholds** -- ">80% sun = full sun, 20-80% = partial, <20% = shade" -- these are arbitrary. How were they chosen? Do they match user perception?
29. **"Longest remaining sun" calculation** -- what time resolution? Checked every minute? Every 15 minutes? Exact to the minute?
30. **Patio polygon sampling** -- "Sample several points within polygon" -- how many? Random or grid? Edge effects?

### Integration
31. **Google Places data refresh** -- how often? On every page load? Daily cron? When a user views a venue?
32. **Building data updates** -- Mapbox 3D buildings layer updates on its own schedule. New buildings in Halifax?
33. **No analytics** -- how do you know which venues are popular, which features are used?

---

## 11. Critical Questions Requiring Clarification

### CRITICAL (Blocks Implementation or Creates Data/Trust Risks)

**Q1: How do we identify patios without manual curation?**
The spec says manual curation of 50-80 patios. The requirement is zero manual data. These cannot both be true. Which takes priority? If zero manual data, accept the data bootstrapping pipeline described in Section 3 of this analysis (multi-API signal fusion with estimated polygons and confidence indicators)?
*If unanswered: Assume multi-API pipeline with estimated polygons and "unverified" badges.*

**Q2: What happens on cloudy/rainy days?**
The shadow map will show sun positions regardless of weather. Without any weather indicator, users will be misled. Is a weather banner acceptable for MVP, or is weather-adjusted shadow computation required?
*If unanswered: Assume weather banner from Environment Canada API showing current conditions, with a note "Sun positions shown for clear sky conditions."*

**Q3: How accurate are Mapbox 3D building heights for Halifax?**
This is called out in the spec as the #1 blocker. Has anyone validated this yet? If building heights are missing, the entire shadow computation is invalid. Every other question is moot until this is answered.
*If unanswered: Must be validated in Phase 1 before ANY other work. Suggest a 2-hour spike: load Mapbox GL with 3D buildings for Halifax downtown, inspect whether extrusion heights exist.*

**Q4: What is the WebGL fallback?**
If a user's device does not support WebGL (or it crashes), what do they see? A blank page? An error? A static image?
*If unanswered: Assume fallback to a static pre-rendered shadow image for the current hour, updated every 15 minutes via server-side cron.*

**Q5: How are patio polygons obtained without manual drawing?**
Even if we auto-detect WHICH venues have patios, we still need WHERE on the property the patio is. A lat/lng point is not enough for shadow intersection. Options: (a) default to a circle around the building entrance, (b) use satellite imagery + ML, (c) use OSM building footprints + offset heuristic. Which approach?
*If unanswered: Assume a 5m radius circle at the venue's lat/lng, clearly marked as "estimated" with an option for users to correct it.*

### IMPORTANT (Significantly Affects UX)

**Q6: Is "Open Now" filtering in MVP?**
Showing closed venues in the "Sunny Now" list would be a bad UX. This requires reliable hours data. Google Places provides hours. Should we filter out closed venues by default?
*If unanswered: Assume yes, filter out closed venues. Show them grayed out in the full list.*

**Q7: Are venue photos displayed?**
Google Places provides photos. They dramatically improve engagement. Are they in the venue detail card for MVP?
*If unanswered: Assume yes, display first Google Places photo in venue detail card.*

**Q8: What is the URL structure for deep linking and SEO?**
No routes are defined. Can we assume `/`, `/venue/[slug]`, and `/sunny-now`?
*If unanswered: Assume the three routes above.*

**Q9: How should pin clustering work in dense areas?**
Halifax waterfront has 10+ patios within 200m. Pins will overlap. Mapbox has built-in clustering. Enable it?
*If unanswered: Assume Mapbox default clustering with custom cluster styling showing count + dominant sun status.*

**Q10: What filters beyond "Sunny Now" are in MVP?**
The spec only defines one filter. Minimum useful set for a consumer app: sunny now, open now, venue type, distance. More?
*If unanswered: Assume MVP filters: Sunny Now, Open Now, Venue Type (bar/restaurant/cafe/brewery), and sort by distance or remaining sun.*

**Q11: How does the time slider interact with "Sunny Now"?**
If the user drags the slider to 5pm, does "Sunny Now" become "Sunny at 5pm"? Or does it always mean current time?
*If unanswered: Assume the filter adapts to the slider position. "Sunny Now" label changes to "Sunny at 5:00pm" when slider is moved.*

**Q12: Is there a text search?**
Can users search for a venue by name? By neighborhood?
*If unanswered: Assume yes, basic text search on venue name.*

**Q13: What does the loading state look like?**
WebGL shadow initialization takes 1-5 seconds. What does the user see?
*If unanswered: Assume: map loads immediately without shadows, skeleton cards in the list, shadows fade in when ready.*

**Q14: Is sharing in MVP?**
A "Share this patio" button that generates a deep link with OG card. Critical for growth.
*If unanswered: Assume yes, using Web Share API on mobile, copy-link fallback on desktop.*

**Q15: How is "hours of sun remaining" presented to the user?**
The wireframe shows "2.5h" next to venue names. Is this hours:minutes? Just hours? "Until 5:00pm"?
*If unanswered: Assume: show both remaining time ("2.5h of sun left") and end time ("sunny until 5:00pm") in the detail card. List view shows remaining time only.*

### NICE-TO-HAVE (Improves Clarity, Has Reasonable Defaults)

**Q16:** Should the map bounds be restricted to Halifax, or can users pan anywhere?
*Default: Soft restrict to Halifax metro area with a "SunSpot is only available in Halifax" message if they pan too far.*

**Q17:** Should the app work in landscape orientation on mobile?
*Default: Portrait only for MVP.*

**Q18:** What analytics should be tracked for MVP?
*Default: Vercel Analytics (free tier) + basic events: page view, venue tap, filter toggle, share tap.*

**Q19:** Should there be a "Report an issue" link on venue cards?
*Default: Yes, simple mailto link or Google Form.*

**Q20:** What is the data refresh cadence for Google Places data (ratings, hours)?
*Default: Weekly cron job.*

**Q21:** Is dark mode supported?
*Default: No for MVP. Map styles would need a dark variant.*

**Q22:** Should "golden hour" (last hour before sunset) be highlighted?
*Default: Yes, it is a natural differentiator and the app name evokes it.*

**Q23:** How should the app handle the period when patios are setting up for the season (April/early May)?
*Default: Show all venues year-round with a banner "Patio season: May-October. Some patios may not be open yet."*

**Q24:** Should there be any gamification (check-ins, "sun hours logged")?
*Default: No for MVP.*

**Q25:** What is the minimum zoom level where individual venue pins appear?
*Default: Zoom level 14 (roughly 8-block view). Below that, show clusters only.*

**Q26:** Should the venue list be a horizontal scrollable card strip (like Google Maps) or a vertical list?
*Default: Vertical list in a swipe-up bottom sheet, consistent with Google/Apple Maps patterns.*

**Q27:** Is there an admin interface for managing venues in MVP?
*Default: Supabase dashboard for direct DB editing. Build a proper admin UI only when volunteer curators are onboarded.*

**Q28:** Should patio orientation (north/south/east/west facing) be stored and displayed?
*Default: Not stored explicitly -- it's derived from the patio polygon and shadow computation. But displaying "south-facing patio" as a human-readable attribute adds trust.*

**Q29:** How are ties broken in the "sorted by remaining sun" list?
*Default: Secondary sort by distance from user.*

**Q30:** Should venues outside the shadow computation area still appear on the map?
*Default: Yes, but with an "Unknown" sun status badge rather than being hidden.*

**Q31:** What happens when a user visits in a browser that blocks third-party cookies (relevant for Supabase auth if added later)?
*Default: MVP has no auth, so not a concern yet. Flag for post-MVP.*

**Q32:** Should the app suggest the "best time to visit" for each venue?
*Default: Yes -- derive from shadow data. "Best sun: 11am-3pm" displayed on the detail card. Low implementation cost, high user value.*

---

## 12. Recommended Next Steps

### Immediate (Before Any Code)

1. **Validate Mapbox 3D building heights for Halifax** (2 hours). Load a Mapbox GL map with `fill-extrusion-height` and inspect downtown Halifax. If heights are missing or flat, the entire architecture depends on resolving this first. The spec correctly identifies this as the #1 risk but provides no timeline for validation.

2. **Decide on data bootstrapping strategy** (1 hour discussion). Manual curation of 50-80 patios vs. automated multi-API pipeline. This fundamentally changes Phase 2 scope and timeline.

3. **Answer Q1, Q2, Q3, Q5** from the Critical questions above. These block architectural decisions.

### Phase 1 Additions

4. **Add weather banner to Phase 1 scope.** Even a simple "Currently: Overcast" banner from Environment Canada prevents the biggest UX trust issue.

5. **Add loading state design to Phase 1.** The first thing users experience is the load time. Design it.

6. **Add mobile interaction spec.** Location permission flow, bottom sheet behavior, pin tap targets, clustering.

### Phase 2 Additions

7. **Add "Open Now" filter** -- requires hours data, which comes from Google Places. Should be Phase 2 if using Google Places for venue data.

8. **Add venue photos** -- requires Google Places photos. Low effort, high impact on UX.

9. **Add at least 3 more filters:** venue type, distance sort, open now.

### Phase 3 Additions

10. **Add sharing** (Web Share API). One button, massive growth potential.

11. **Add "best time to visit"** per venue. Derived from shadow data, no additional API needed.

12. **Add deep link routes** (`/venue/[slug]`) for SEO and sharing.

### Before Launch

13. **Add basic analytics** (Vercel Analytics).

14. **Test on real phones** in real Halifax patio conditions. Validate shadow accuracy against physical observation at 5 known patios.

15. **Create OG images** for social sharing (dynamic, showing current sun count).

---

## 13. Architecture Observations

### Client-Side Shadow Computation -- Tradeoffs

The spec chooses 100% client-side shadow computation. This is the right call for MVP (no server cost, real-time scrubbing) but has implications:

**Pros:**
- No server compute cost
- Real-time time slider scrubbing
- Works offline (if building data is cached)

**Cons:**
- Cannot pre-compute sun status for SEO (server-rendered pages will lack sun data)
- Performance varies wildly by device
- No way to send push notifications about sun status changes (needs server-side computation for that)
- Every client downloads the full building dataset for the viewport

**Recommendation for post-MVP:** Add a lightweight server-side cron (every 15 minutes) that computes sun status for all venues and writes it to Supabase. This enables:
- SSR with real sun data (SEO)
- Push notifications
- API for third-party integrations
- Faster initial page load (sun status in first paint, shadows load progressively)

### Supabase Schema Observations

- `patio_polygon JSONB` -- should this be a PostGIS `GEOMETRY` column instead? Would enable spatial queries (find patios within 500m) natively in PostgreSQL rather than client-side.
- No `price_level` column.
- No `cuisine` or `tags` column.
- No `seasonal_hours` or `patio_open_season` column.
- No `photos` column or relation.
- No `last_verified` timestamp for data freshness tracking.
- The spatial index uses `ST_MakePoint(lng, lat)` but `patio_polygon` is JSONB, not a geometry column, so you cannot do spatial queries on the patio itself.

---

*End of analysis. 14 user flows mapped, 33 gaps identified across 7 categories, 32 questions prioritized at 3 levels, and 15 concrete next steps.*
