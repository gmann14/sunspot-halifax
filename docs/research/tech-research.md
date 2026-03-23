# SunSpot Tech Research: Shadow/Sun Detection Libraries

**Date:** 2026-03-22

---

## 1. mapbox-gl-shadow-simulator

**Repo:** https://github.com/ted-piotrowski/mapbox-gl-shadow-simulator
**npm:** https://www.npmjs.com/package/mapbox-gl-shadow-simulator
**Author:** Ted Piotrowski (same person behind ShadeMap)
**Stars:** 74 | **Last pushed:** 2026-03-17 (actively maintained)
**Weekly downloads:** ~12 (very low adoption)
**Package size:** ~781 kB (UMD bundle)
**License:** No license specified in repo metadata (potential concern for commercial use)

### API Surface

Constructor options:
- `apiKey` (String) -- **required**, obtained from https://shademap.app/about/
- `date` (Date) -- sun position based on this date
- `color` (String) -- shade overlay color
- `opacity` (Number) -- shade overlay opacity
- `terrainSource` (Object) -- DEM tile config for terrain shadows
- `getFeatures` (Function) -- returns GeoJSON (buildings) for shadow casting
- `sunExposure` (Object) -- sun exposure mode settings

Methods:
- `addTo(map)` -- add shadow layer to map
- `setDate(date)` -- update shadow time
- `setColor(color)` -- change shade color
- `setOpacity(opacity)` -- change opacity
- `setSunExposure(enabled, options)` -- toggle sun exposure mode
- `getHoursOfSun(x, y)` -- hours of sunlight for a pixel (requires sun exposure mode)
- **`isPositionInSun(x, y)`** -- check if a screen position is in the sun
- **`isPositionInShade(x, y)`** -- check if a screen position is in shade
- `remove()` -- remove layer

Events:
- `idle` -- fired when shadow layer finishes rendering

### Point-in-Shadow Query: YES, SUPPORTED

```javascript
shadeMap.on('idle', async () => {
  const latlng = [42.12, -121.74];
  const { x, y } = map.latLngToContainerPoint(latlng);
  const inTheSun = await shadeMap.isPositionInSun(x, y);
});
```

**Important caveats:**
- Takes **screen coordinates** (x, y), not lat/lng -- you must convert via `map.latLngToContainerPoint()`
- Shadow layer must fully render first (wait for `idle` event)
- The point must be visible in the current viewport -- off-screen points cannot be queried
- This is a **pixel-based readback** from WebGL, not a geometric calculation

### Sun Exposure Mode

Can calculate cumulative sun exposure over a date range:
```javascript
sunExposure: {
  enabled: true,
  startDate: new Date('2026-06-01'),
  endDate: new Date('2026-06-30'),
  iterations: 32  // more = better accuracy but slower
}
```
Then call `getHoursOfSun(x, y)` per pixel.

### How It Works with Mapbox 3D Buildings

Buildings are extracted from Mapbox vector tiles, NOT the 3D extrusion layer:
```javascript
getFeatures: () => {
  const buildingData = map.querySourceFeatures('composite', { sourceLayer: 'building' })
    .filter((feature) => {
      return feature.properties &&
             feature.properties.underground !== "true" &&
             (feature.properties.height || feature.properties.render_height)
    });
  return buildingData;
}
```
- Uses the `building` source layer from Mapbox's `composite` source
- Filters by `height` or `render_height` properties
- Only supports `Polygon` and `MultiPolygon` geometry types
- Does NOT use Mapbox's built-in 3D building extrusion -- it renders shadows independently via WebGL

### Terrain Data Requirements

Requires a separate DEM (Digital Elevation Model) tile source. Three options documented:
1. **AWS Open Data** (free) -- `elevation-tiles-prod/terrarium` tiles, max zoom 15
2. **Mapbox Terrain DEM V1** -- requires Mapbox API key, max zoom 14
3. **MapTiler Terrain RGB v2** -- requires MapTiler key, max zoom 12

### Performance / Mobile Concerns

- **WebGL required** -- renders shadows as a custom WebGL layer
- **781 kB package** + Mapbox GL JS (~700 kB) = significant bundle
- Shadow computation happens on GPU via shader -- performant for rendering
- `isPositionInSun()` requires WebGL pixel readback (can be slow, especially on mobile)
- Sun exposure mode with high `iterations` count is computationally expensive
- DEM tile fetching adds network overhead
- No documented performance benchmarks for mobile devices
- The library is a **visual overlay first**, point queries are secondary

### Known Issues / Limitations (from GitHub Issues)

- **#14 (open):** No React Native support
- **#12 (open):** Cannot render shadows of buildings outside viewport
- **#10 (open):** Documentation described as unclear
- **#7 (open):** Sun exposure during polar day always shows 12 hours (edge case bug)
- **#4 (open):** Questions about shade area size accuracy
- **#15 (closed):** Had issues with Next.js/React apps
- **#11 (closed):** Errors with MapLibre integration
- Shadow accuracy depends entirely on quality of DEM data and building footprint data
- Off-screen buildings do NOT cast shadows into the viewport (#12)

### Critical Limitation for Patio Use Case

The `isPositionInSun()` method works on **screen coordinates only**. To check if a patio is in sun:
1. The map must be rendered and visible
2. The patio location must be in the current viewport
3. You must wait for the `idle` event after each `setDate()` call
4. You cannot batch-query multiple times efficiently -- each time change requires a full re-render

For a "is my patio in sun right now?" feature, this works but is heavy. For "when will my patio be in sun today?" you'd need to loop through times, re-render shadows each time, and query -- very expensive.

---

## 2. ShadeMap API (shademap.app)

**Site:** https://shademap.app
**About/API:** https://shademap.app/about/
**Author:** Ted Piotrowski (same as mapbox-gl-shadow-simulator)
**Examples repo:** https://github.com/ted-piotrowski/shademap-examples

### What It Is

ShadeMap is the hosted product built on top of the same shadow simulation engine. The npm packages (`mapbox-gl-shadow-simulator` and `leaflet-shadow-simulator`) are the open-source client-side libraries that power ShadeMap.

### API Key / Pricing

- **API key required** for the npm packages (obtain from shademap.app/about)
- **Educational tier:** Free (academic/hobby projects)
- **Commercial tier:** Monthly fee (exact amount not publicly listed -- must contact)
- **Enterprise tier:** Custom pricing, includes basemaps and building data

**ShadeMap Pro (consumer product):**
- Free tier: 2017-era map/building data, no 3D terrain, some elevation errors
- Pro: $2/30 days or $5/90 days (one-time, no subscription)

**Data accuracy tiers:**
- Free: Volunteer/estimated data, 1-3m accuracy
- Paid: LiDAR/photogrammetry, 0.25m accuracy
- Premium data purchased per square kilometer

### Route/Path Sun Exposure

The examples repo shows a `_generateShadeProfile()` method that can calculate sun/shade along a route:
- Divides route into evenly-spaced sample points
- Returns a bitmap where each pixel = one location
- Red channel value: 0 = shade, 255 = sun
- Can calculate across multiple time steps

This is more powerful than single-point queries but still requires rendering.

### Capabilities Summary

- Shadow simulation accounting for terrain + buildings + trees
- Point-in-sun/shade queries via `isPositionInSun(x, y)`
- Route shade profiles
- Annual sun exposure calculations
- GeoTIFF export of shadow/exposure data
- Works with Mapbox GL JS, MapLibre GL JS, and Leaflet

### Limitations

- Client-side rendering only -- no server-side "is this point in shadow?" REST API
- Requires a visible map canvas with WebGL
- Cannot run headlessly without a browser context
- API key required even for the npm package

---

## 3. SunCalc.js

**Repo:** https://github.com/mourner/suncalc
**npm:** https://www.npmjs.com/package/suncalc
**Author:** Vladimir Agafonkin (Mapbox co-founder, creator of Leaflet)
**Stars:** 3,353 | **Last pushed:** 2025-08-09
**Weekly downloads:** ~121,000 (very widely used)
**Package size:** 18.9 kB (tiny)
**License:** BSD-2-Clause
**Last version:** 1.9.0 (last significant update: Dec 2016)

### API Surface

**`SunCalc.getTimes(date, lat, lng, height)`**
Returns Date objects for: sunrise, sunriseEnd, goldenHourEnd, solarNoon, goldenHour, sunsetStart, sunset, dusk, nauticalDusk, night, nadir, nightEnd, nauticalDawn, dawn

**`SunCalc.getPosition(date, lat, lng)`**
Returns:
- `altitude`: sun altitude above horizon in radians (0 = horizon, PI/2 = zenith)
- `azimuth`: direction in radians (0 = south, measured clockwise)

**`SunCalc.addTime(angle, morningName, eveningName)`**
Add custom sun event at a given angle.

**`SunCalc.getMoonPosition(date, lat, lng)`**
Returns altitude, azimuth, distance, parallacticAngle.

**`SunCalc.getMoonIllumination(date)`**
Returns fraction, phase, angle.

**`SunCalc.getMoonTimes(date, lat, lng, inUTC)`**
Returns rise/set times, alwaysUp/alwaysDown flags.

### What SunCalc Does Well

- Extremely lightweight (18.9 kB, zero dependencies)
- Pure math -- no DOM, no WebGL, no network requests
- Runs anywhere: browser, Node.js, React Native, serverless functions
- Very fast: microseconds per calculation
- Battle-tested with 121K weekly downloads
- Gives you sun altitude and azimuth for any point on Earth at any time

### What SunCalc Does NOT Do

- **No shadow calculation** -- knows where the sun is, not what's blocking it
- **No building/terrain awareness** -- purely astronomical
- **No "is this point in shadow?"** -- only tells you sun angle
- **No concept of obstructions** -- a point at sun altitude > 0 is "in sun" astronomically, but could be shadowed by a building

### How SunCalc Could Be Used for Patio Sun Status

You could use SunCalc to determine:
1. Is the sun above the horizon? (`altitude > 0`)
2. What direction is the sun? (`azimuth`)
3. How high in the sky is it? (`altitude`)

Combined with known building heights and positions, you could **manually calculate** if a building blocks the sun from a specific point. But you'd need to:
- Know the height and position of nearby buildings
- Calculate the angular elevation of each building from your point
- Compare building elevation angle to sun altitude in that direction
- This is essentially reimplementing shadow casting from scratch

### SunCalc Variants

- **suncalc3** (npm): Updated fork with additional features, TypeScript types
- **@types/suncalc**: TypeScript definitions for the original

---

## 4. Shadowmap.org (Competitor to ShadeMap)

**Site:** https://shadowmap.org
**Pricing page:** https://shadowmap.org/pricing (content not extractable -- JS-rendered)

- Commercial product for solar analysis
- 3D visualization of sun/shadow
- Claims high-precision solar exposure data
- Has iOS app (Shadowmap: Solar Intelligence)
- Pricing tiers exist but specific amounts not publicly visible
- More focused on architecture/solar industry than developer APIs

---

## 5. Alternative Approaches for "Is This Patio in Sun?"

### Option A: mapbox-gl-shadow-simulator (Full visual + query)
- **Pros:** Handles buildings + terrain, has `isPositionInSun()`, visual overlay for users
- **Cons:** Heavy (WebGL required), needs visible map, API key cost, can't query off-screen points, each time-step requires full re-render
- **Best for:** If you're already showing a map and want visual shadows + occasional point queries

### Option B: SunCalc + Manual Obstruction Model
- **Pros:** Tiny, fast, works anywhere, no API key, no WebGL
- **Cons:** You must build your own obstruction model (building heights, positions)
- **Approach:**
  1. Use SunCalc to get sun position (altitude, azimuth) for any time
  2. Use Mapbox building data or Overpass API to get nearby building footprints + heights
  3. For each building, calculate if it blocks the sun from the patio's perspective
  4. Simple ray-casting: does any building subtend an angle greater than the sun's altitude in the sun's direction?
- **Best for:** Lightweight "is it sunny now?" without a visible map

### Option C: Pre-computed Shadow Profile
- **Pros:** Fast at runtime, works offline
- **Cons:** Complex setup, only works for known locations
- **Approach:**
  1. For each saved patio location, pre-compute a "horizon profile" (elevation angle in each compass direction)
  2. At runtime, compare sun position (from SunCalc) against the horizon profile
  3. If sun altitude > horizon elevation in sun's direction = sunny
- **Best for:** Frequent queries on a small set of saved locations

### Option D: Server-Side Shadow Rendering (Headless)
- **Pros:** Offload computation from mobile
- **Cons:** Complex infrastructure, rendering overhead
- **Approach:**
  1. Use Puppeteer/Playwright on server with mapbox-gl-shadow-simulator
  2. Render shadows headlessly, read pixel values
  3. Return sun/shade status via API
- **Best for:** If you need the accuracy of full shadow simulation but can't run it on mobile

### Option E: Hybrid SunCalc + ShadeMap
- **Pros:** Best of both worlds
- **Cons:** Two dependencies, ShadeMap API key cost
- **Approach:**
  1. Use SunCalc for quick "is sun above horizon?" checks (free, instant)
  2. Only invoke ShadeMap for detailed shadow queries when sun is up
  3. Use ShadeMap's sun exposure mode to pre-compute a daily sun schedule for saved locations
- **Best for:** Production app that needs accuracy without constant re-rendering

---

## 6. Recommendation for SunSpot Patio Feature

**For MVP:** Option B (SunCalc + simplified obstruction) or Option E (hybrid)

**Reasoning:**
- `mapbox-gl-shadow-simulator` is the most capable but heaviest option. Its `isPositionInSun()` requires a visible WebGL map canvas, making it impractical for background checks or notifications
- SunCalc is rock-solid for sun position and is essentially free and instant
- The ShadeMap API key is needed even for the npm package, adding a cost dependency
- For "is my patio sunny right now?", you likely need to pre-compute a horizon/obstruction profile per saved location, then compare against SunCalc at runtime. This gives instant answers without rendering

**Suggested architecture:**
1. **On location save:** Use mapbox-gl-shadow-simulator (or server-side rendering) to compute a 360-degree horizon profile for the patio location. Store this as a compact array (e.g., elevation angle per 5-degree azimuth slice = 72 numbers)
2. **At query time:** Use SunCalc to get current sun position. Compare sun altitude vs. stored horizon elevation at sun's azimuth. If sun is higher than the horizon profile = sunny. This is O(1) and works offline
3. **Visual overlay:** When user is viewing the map, optionally render the shadow overlay using mapbox-gl-shadow-simulator for the visual experience

---

## Sources

- https://github.com/ted-piotrowski/mapbox-gl-shadow-simulator
- https://www.npmjs.com/package/mapbox-gl-shadow-simulator
- https://github.com/mourner/suncalc
- https://www.npmjs.com/package/suncalc
- https://shademap.app/about/
- https://tedpiotrowski.svbtle.com/shade-map-pro
- https://github.com/ted-piotrowski/shademap-examples
- https://shadowmap.org/pricing
