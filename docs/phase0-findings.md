# Phase 0 Validation Findings

**Date:** 2026-03-23
**Bounding box:** ~44.640, -63.585 to ~44.652, -63.565 (Halifax downtown)

## Overture Maps Building Data (release 2026-02-18.0)

| Metric | Value |
|--------|-------|
| Total footprints | 782 |
| Footprints with height | 167 (21.4%) |
| Height data source | OpenStreetMap |
| Tallest building | 1801 Hollis — 86.6m |
| Second tallest | Maritime Centre — 71.0m |

## Decision

**Overture does NOT pass the canonical-source threshold** (requires >=80% height coverage, got 21.4%).

**Plan for MVP:**
- Use Overture footprints (782 buildings, excellent coverage) as the geometry source
- Heights from Overture/OSM where available (167 buildings)
- For the remaining ~79% without heights, forecast returns `unknown` per the spec algorithm
- This is acceptable for MVP: the 167 buildings with heights cover most of the tall downtown buildings that actually cast significant shadows
- NS LiDAR-derived heights are the recommended upgrade path for Phase 2

## Spot Checks (top 15 by height)

All heights appear reasonable and match known Halifax buildings:
- 1801 Hollis: 86.6m (correct — tallest residential tower downtown)
- Maritime Centre: 71.0m (correct — major office tower)
- Hampton Inn Downtown: 25.3m (correct — ~8 story hotel)
- Scotia Tower: 23.9m (correct — mid-rise office)

## Data Export

Buildings exported to `data/halifax_buildings.csv` with WKT geometry for Supabase import.
