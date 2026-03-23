# SunSeekr Competitive Research

**Date:** 2026-03-22
**Purpose:** Inform build/buy/skip decision for a sun-tracking patio finder product

---

## 1. SunSeekr Overview

- **Product:** Real-time sunshine mapping for pubs, cafes, restaurants, and rooftops
- **Tagline:** "Find your place in the sun"
- **Founded:** 2024 (SunSeekr Ltd, London, UK, Company #16428463)
- **Founder:** Mo Dawod -- architect by trade, background in computational design and urban systems
- **Launched:** April 2025 (web app, London only)
- **Platforms:** iOS 14+, Android 8+, Web (sunseekr.com)
- **App Size:** 8.6 MB (very lightweight -- likely a webview or thin native wrapper)
- **Contact:** hello@sunseekr.com
- **Social:** @sunseekr.app (Instagram), @sunseekr_app (X/Twitter)

### Traction

- 250K+ users claimed (website), 180K+ active users, 90K App Store downloads (per press)
- Hit #1 UK App Store Lifestyle category within 2 weeks of launch
- 4.8/5 rating claimed on website (250K reviews) -- **but App Store shows 3.8/5 with only 4 ratings** (vanity metrics on website likely inflated or include web users)
- Viral Reddit post: 300K+ views, comments like "This is exactly what I didn't know I needed"
- Press: BBC, The Times, TimeOut, Evening Standard, Londonist, Secret London, Shortlist

---

## 2. Cities & Markets

### Confirmed Cities (from website + press)
1. London (launch city, April 2025)
2. Berlin
3. Copenhagen
4. Barcelona
5. Amsterdam
6. New York
7. Sydney
8. Paris
9. Milan

### Expansion Timeline
- **April 2025:** London only
- **August 2025:** UK-wide expansion
- **Late 2025:** Global expansion to 25 cities
- **Current claim:** "Works anywhere in the world" with 25 cities having verified venue lists

### What "25 cities" likely means
The app's shadow simulation likely works globally (it uses OpenStreetMap building data which is worldwide), but the **curated/verified venue lists** only exist for 25 cities. Outside those cities, you probably get shadow data but no venue recommendations.

**Gap:** The full list of 25 cities is not publicly documented. Based on their target demographic (European + Anglo cities with outdoor drinking culture), likely candidates for the remaining ~16 include: Dublin, Edinburgh, Manchester, Bristol, Brighton, Lisbon, Madrid, Rome, Munich, Vienna, Prague, Stockholm, Oslo, Toronto, Melbourne, Auckland.

---

## 3. Core UX Flow

### Opening the App
1. User opens app -> sees a **map view** (Mapbox-based) centered on their location
2. Venues (pubs, cafes, restaurants) are shown as pins on the map
3. Each venue shows a **sun exposure indicator** -- what percentage of its terrace is currently in sunlight
4. Shadow overlay shows which areas of the city are currently in sun vs shade

### Finding a Sunny Patio
1. **Browse map:** Scroll around to see nearby venues with sun indicators
2. **Filter:** Filter by venue type (pub, cafe, restaurant, rooftop), amenities (dog-friendly, laptop-friendly, riverside)
3. **Time slider:** Check sun exposure hour-by-hour for any venue -- see when the terrace catches sun and when it loses it
4. **Venue detail:** Tap a venue to see:
   - Mapped terrace outline (actual shape of outdoor seating area)
   - Current sun percentage on that terrace
   - Hour-by-hour sun exposure chart
   - Weather data (temperature, wind, rain)
5. **Explore tab:** Curated lists of verified sunny spots, trending beer gardens, local events
6. **Smart notifications:** Get alerts when saved favorite spots hit ideal sunny conditions

### v3.0 Rebuild (Feb 2026)
Major update described as "complete rebuild from the ground up":
- Mapped terraces (actual terrace polygons, not just point locations)
- Hourly exposure charts per venue
- Weather intelligence integration
- Smart notifications
- Community mapping (users can draw/contribute terrace data)
- Explore page with verified venues

---

## 4. Key Features

| Feature | Details |
|---------|---------|
| **Real-time shadow map** | Shadow overlay on Mapbox showing sun/shade across the city |
| **Mapped terraces** | Actual polygon outlines of outdoor seating areas with % sun |
| **Hour-by-hour forecast** | Sun exposure timeline for each venue throughout the day |
| **Venue filters** | Type (pub/cafe/restaurant/rooftop), amenities (dog-friendly, laptop-friendly, riverside, outdoor seating) |
| **Weather integration** | Temperature, wind, rain data layered into sun recommendations |
| **Smart notifications** | Alerts when saved spots reach ideal conditions |
| **Favorites** | Save preferred venues for quick access |
| **Explore/discover** | Curated lists, trending spots, verified venues |
| **Community mapping** | Users can draw terrace outlines and add missing venues |
| **Branded experiences** | "AperolSeekr" -- branded venue collections for partners |

---

## 5. The Data Problem -- How They Handle It

### Shadow/Sun Computation
- Uses **building geometry from OpenStreetMap** + **sun position algorithms** to calculate shadows
- Built on **Mapbox** for mapping/navigation
- Real-time shadow simulation -- not pre-computed, calculated dynamically based on time of day
- **Does NOT account for trees, hedges, or natural shade** (confirmed by user reviews)
- Relies on OSM building height data, which varies in quality by city

### Venue Data
- Venues discovered from **OpenStreetMap POI data** (pubs, cafes, restaurants)
- Likely supplemented with Google Places or similar for completeness
- **Terrace polygons are manually mapped** -- this is their key differentiator
- v3.0 introduced **community mapping** where users can draw terrace outlines
- "Verified venues" suggests a manual curation/verification process

### Known Accuracy Issues (from user reviews)
- "The simulation relies on a couple of data points meaning there can be huge inaccuracies"
- "Pubs nearby don't have outdoor drinking spaces" (wrong venue data)
- "Always in shade past a certain time because of shadows from surrounding buildings" (but app shows sun)
- "Under a flyover that never gets sun" (major obstacles not in OSM building data)
- **Trees not included** -- a fundamental limitation acknowledged by users
- OSM building heights are inconsistent, especially outside major cities

### The Terrace Polygon Problem
This is the hardest data problem in the product. There is no public dataset of "where outdoor seating exists" at restaurants. SunSeekr's approaches:
1. **Manual mapping** by the team (doesn't scale)
2. **User-contributed mapping** via community feature (v3.0)
3. **Venue self-service** via business dashboard (venues claim and map their own terraces)

---

## 6. Business Model

### Consumer Side: Free
- App is free to download and use
- No subscription tier visible
- No ads mentioned

### Revenue: B2B Venue Partnerships
- **Venue verification:** Venues can claim their listing, map their terrace, get analytics
- **Promotional visibility:** Premium placement during optimal sun conditions
- **Dashboard & analytics:** Venue owners get data on views/engagement
- **Tiered system:** Basic tier (standard visibility) and Pro tier (premium features, priority placement)
- **Pricing:** Not publicly disclosed

### Brand Partnerships
- **AperolSeekr:** Branded collaboration with Aperol (the drink brand)
  - Dedicated branded experience within the app (sunseekr.com/?brand=aperol)
  - Users can discover venues serving Aperol in sunny conditions
  - Likely a significant revenue source -- alcohol brands pay well for summer activation
- **Partner experiences:** v2.0 introduced "partner experiences" as a feature category

### Revenue Assessment
- Primary monetization appears to be **B2B: venue listings + brand partnerships**
- The Aperol deal suggests they're pursuing **FMCG/alcohol brand sponsorships** as the main revenue play
- This is essentially a **seasonal advertising business** -- revenue concentrates in spring/summer
- No evidence of venture funding, likely bootstrapped

---

## 7. What Users Love & Complain About

### What Users Love
- **The core concept:** "For years I wished someone made this app and now that dream has come true"
- **Solves a real pain:** Arriving at a pub garden only to find it shaded is a universal frustration
- **Viral appeal:** 300K views on Reddit; the idea is instantly understandable
- **Time-planning feature:** Knowing *when* a terrace gets sun, not just if it has sun now
- **Discovery:** Finding new venues they didn't know about

### What Users Complain About
- **Accuracy issues:** Shadow simulation misses trees, flyovers, and other non-building obstacles
- **Slow performance:** "It's slow" (multiple reports)
- **UI quality:** "User interface is not good" / "UI could be more slick"
- **Missing venues:** Some venues listed don't actually have outdoor seating
- **Wrong data:** Some venues shown as sunny are permanently shaded due to structures not in OSM
- **Limited outside London:** Best experience is in London; other cities have fewer verified venues

### App Store Ratings
- **iOS (UK):** 3.8/5 (only 4 ratings -- very low review count despite 90K downloads)
- **Website claim:** 4.8/5 (250K reviews) -- this seems to be inflated or refers to a different metric

---

## 8. Technical Approach

### Architecture (inferred)
- **Frontend:** Likely React/React Native or Flutter (8.6 MB app size suggests thin wrapper)
- **Mapping:** Mapbox GL JS (confirmed by press articles)
- **Building data:** OpenStreetMap (confirmed)
- **Shadow computation:** Custom real-time shadow simulation
  - Takes sun position (calculated from date/time/location using astronomical algorithms)
  - Traces rays from sun through building geometry from OSM
  - Pixels in shadow of buildings are marked as shaded
  - Does NOT include: trees, temporary structures, awnings, flyovers
- **Weather data:** Integrated (likely OpenWeather or similar API)
- **Venue data:** OSM POIs + manual curation + community contributions
- **Terrace polygons:** Manual + community-contributed GeoJSON shapes

### What's Missing Technically
- **No tree shadows** -- this is a major gap. Trees provide significant shade.
- **No LiDAR data** -- using OSM building footprints + estimated heights, not precise measurements
- **No 3D terrain** -- likely doesn't account for hills affecting shadow patterns
- **No temporal validation** -- unclear if shadow predictions are verified against reality

### Developer Background
- **Sunny Days (dawodx.com):** The app was originally called "Sunny Days" before rebranding to SunSeekr
- App ID on Google Play: `io.dawodx.sunnydays` (confirms the rebrand)
- Mo Dawod's architecture background gives him computational geometry expertise

---

## 9. Competitor Analysis

### 9.1 ShadeMap (shademap.app)

**What it is:** Global shadow simulation tool for any date/time/location. Developer toolkit + consumer web app.

**Technical approach:**
- Uses elevation data (radar DEMs for global coverage)
- OpenStreetMap building footprints + heights
- **LiDAR data** for premium accuracy (30cm precision for buildings + trees)
- Can simulate mountain, building, AND tree shadows
- Open source npm packages: `mapbox-gl-shadow-simulator` and `leaflet-shadow-simulator`
- Users can draw custom shapes and set heights (add/remove buildings)

**Key differences from SunSeekr:**
- **More technically accurate** -- includes trees, uses LiDAR where available
- **No venue data** -- it's a shadow tool, not a venue discovery app
- **Developer-focused** -- offers API/SDK for building shadow features into other apps
- **Global from day one** -- works anywhere, not limited to curated cities
- **Aggregation features** -- can show total sun hours per day or per year
- Can load custom terrain data (GeoTIFF, DSMs, DTMs)

**Pricing:**
- Educational: Free (academic/hobby use)
- Commercial: Monthly subscription (price not public)
- Enterprise: Custom pricing

**Team:** Based in Bothell, Washington, USA. Created by Ted Piotrowski.

**Press:** Fast Company, Forbes, New York Times, NPR, Hacker News

**Assessment:** ShadeMap is the **technical gold standard** for shadow mapping. It's a *tool*, not a *consumer product*. Could be used as infrastructure to build a SunSeekr competitor. The npm packages mean you could embed their shadow engine in your own app.

---

### 9.2 Shadowmap (shadowmap.org)

**What it is:** Award-winning 3D sunlight simulation web app with professional/enterprise tiers.

**Technical approach:**
- Full 3D rendering with textured environments
- Integrates Google's photorealistic 3D tiles
- Supports custom 3D model uploads (IFC, OBJ, FBX, DAE, GLB)
- Solar irradiance analysis (not just shadow yes/no, but energy calculations)
- Real-time 3D camera view of sun path

**Key features:**
- 3D digital twin environments
- Solar panel placement analysis
- Building orientation optimization
- Interactive facade/roof irradiance maps
- Monthly/annual solar statistics

**Pricing tiers:**
- **Free:** Basic shadow simulation, explore global 3D map, edit buildings/trees
- **Explorer:** Change date/time, 3D camera sun view
- **Home:** Weather forecasts, high-quality 3D maps, extended objects
- **Studio:** Upload 3D models, solar analytics, share/embed projects

**Target users:** Architects, urban planners, solar industry, real estate, photographers

**Assessment:** Very different product from SunSeekr. Professional-grade 3D analysis tool, not a consumer venue finder. Overkill for "which pub has sun right now" use case.

---

### 9.3 Sunlitt (flippinghues.com/sunlitt)

**What it is:** iOS sun position and path tracking app with shadow visualization.

**Key features:**
- Sun position tracking (works offline)
- Shadow visualization on buildings/streets for any date/time
- AR mode -- walk around and see where sun/shadows will fall
- Terrain shadows (mountains, hills)
- Solar events (sunrise, sunset, golden hour, blue hour)
- Shadow ratio calculations

**Pricing:** Freemium -- basic sun tracking free, Sunlitt PRO unlocks date changes, AR shadows, weather, etc.

**Reviews:** Highly praised UI -- "reminiscent of favorites like Flighty or Slopes"

**Assessment:** Personal sun tracking tool, not venue-focused. Beautiful execution but different use case. More useful for photographers, gardeners, homeowners than pub-goers.

---

### 9.4 Other Competitors

| Product | What It Does | Relevance |
|---------|-------------|-----------|
| **SunOnTrack** | Sun position planning with AR and maps | Photography/filmmaking focused |
| **FindMyShadow.com** | Custom scene shadow plotting | Web-based, manual scene building |
| **SunCalc** | Sun position calculator with map | Lightweight web tool, no buildings |
| **ShadowCalculator** | Building shadows on Google Maps | Simple web tool for property analysis |
| **Sun Seeker** (Ajnaware) | AR sun tracker (since 2009!) | OG sun tracking app, no venues |
| **CityShadeMapper** | Open source R package for shade maps from LiDAR | Academic/research tool |

---

## 10. Strategic Analysis

### What SunSeekr Got Right
1. **Nailed the consumer insight:** "Which pub garden is sunny right now?" is a question millions of people ask
2. **Timing:** Launched in spring (April 2025) when demand is highest
3. **Distribution:** Viral Reddit post + UK press coverage drove massive awareness
4. **B2B angle:** Smart to monetize through venues/brands rather than consumer subscriptions
5. **Aperol partnership:** Proved the advertising model works with a relevant brand

### SunSeekr's Weaknesses (Opportunities for Us)
1. **Accuracy:** No tree shadows is a dealbreaker for accuracy. Many pub gardens are shaded by trees, not buildings.
2. **Performance:** Multiple complaints about slowness
3. **UI quality:** Users say the interface needs work
4. **Data moat is thin:** OSM building data is free. Their only proprietary data is terrace polygons, which they're crowdsourcing anyway.
5. **Seasonal business:** Revenue concentrates in 4-5 warm months. Hard to sustain year-round team.
6. **App Store ratings:** 3.8/5 with 4 reviews despite 90K downloads suggests poor retention or engagement
7. **Vanity metrics:** Claiming 250K reviews on website when App Store shows 4 reviews is a red flag

### Key Technical Decisions If We Build

| Decision | SunSeekr's Approach | Better Approach |
|----------|-------------------|-----------------|
| Shadow engine | Custom, buildings only | Use ShadeMap's npm package (includes trees + LiDAR) |
| Building data | OSM only | OSM + LiDAR where available (ShadeMap premium data) |
| Tree shadows | Not included | Must include -- use LiDAR canopy data |
| Venue data | OSM + manual curation | Google Places API + community + venue self-service |
| Terrace polygons | Manual + crowdsource | Satellite imagery + ML detection + crowdsource |
| Performance | Slow (per reviews) | Pre-compute shadow maps at common times, serve as tiles |

### The Real Moat Question
SunSeekr's moat is **not technical** (shadow simulation is well-understood, open source tools exist). Their moat is:
1. **Brand awareness** in the UK pub scene
2. **Terrace polygon data** (but crowdsourced, so replicable)
3. **First-mover advantage** in "sunny patio finder" category
4. **Brand partnerships** (Aperol relationship)

A competitor with better accuracy (tree shadows), better UX, and better performance could win. The question is whether the market is big enough to justify the effort given the **seasonal nature** of the business.

### Market Size Concerns
- Product is only relevant in temperate climates with outdoor dining culture
- Only useful ~5 months/year in most target cities
- Core market is essentially: UK + Northern Europe + parts of North America + Australia
- Revenue model depends on venue/brand partnerships that are also seasonal
- This may explain why SunSeekr appears bootstrapped -- VCs may see the TAM as too small

---

## 11. Sources

- [SunSeekr Official Site](https://www.sunseekr.com/)
- [SunSeekr App Store (UK)](https://apps.apple.com/gb/app/sunseekr/id6745050996)
- [SunSeekr Google Play](https://play.google.com/store/apps/details?id=io.dawodx.sunnydays)
- [TimeOut London -- "This very useful app shows which London pub gardens are in the sunshine" (March 2026)](https://www.timeout.com/london/news/this-very-useful-app-shows-which-london-pub-gardens-are-currently-in-the-sunshine-031826)
- [TimeOut UK -- SunSeekr UK-wide launch (August 2025)](https://www.timeout.com/uk/news/a-useful-new-uk-pub-map-shows-which-boozers-are-currently-in-the-sunshine-082225)
- [Comunicaffe -- Mo Dawod interview](https://www.comunicaffe.com/mohamed-dawod-talks-about-the-app-sunseekr/)
- [Shortlist -- SunSeekr coverage](https://www.shortlist.com/news/sunseekr-lets-you-find-london-pubs-that-are-in-the-sun-405593)
- [ShadeMap](https://shademap.app/) / [About](https://shademap.app/about/)
- [ShadeMap npm package (mapbox-gl-shadow-simulator)](https://github.com/ted-piotrowski/mapbox-gl-shadow-simulator)
- [Ted Piotrowski -- Using LiDAR for tree shadows](https://tedpiotrowski.svbtle.com/using-lidar-for-tree-shadows-in-shademap)
- [Shadowmap.org](https://shadowmap.org/) / [Pricing](https://shadowmap.org/pricing)
- [Sunlitt](https://www.flippinghues.com/sunlitt) / [App Store](https://apps.apple.com/us/app/sunlitt-sun-position-and-path/id1628751457)
- [SunOnTrack](https://www.sunontrack.app/)
- [SunCalc](https://www.suncalc.org/)
- [ShadowCalculator](https://shadowcalculator.eu/)
- [FindMyShadow](https://www.findmyshadow.com/)
- [Indie Hackers -- Reddit viral post analysis](https://www.indiehackers.com/post/how-to-go-viral-on-reddit-725-000-views-5-7k-upvotes-1-000-signups-d029809634)
