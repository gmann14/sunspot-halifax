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

## Initial Decision

**Overture alone did NOT pass the canonical-source threshold** (requires >=80% height coverage, got 21.4%).

## OSM Height Enrichment (2026-03-24)

Ran `scripts/enrich-heights.ts` — an OSM Overpass query for building heights matching Overture footprints by proximity. Results:

| Metric | Before | After |
|--------|--------|-------|
| Height coverage | 21.4% (167/782) | **99.5%** (778/782) |

This **passes the canonical-source threshold**. Overture footprints + OSM heights are the production geometry source.

## Final Architecture
- **Footprints:** Overture Maps (782 buildings, excellent coverage)
- **Heights:** OSM Overpass enrichment (99.5% coverage)
- **Remaining 4 buildings without heights:** forecast returns `unknown` per spec algorithm — negligible impact
- NS LiDAR-derived heights remain an optional accuracy upgrade for post-MVP

## Spot Checks (top 15 by height)

All heights appear reasonable and match known Halifax buildings:
- 1801 Hollis: 86.6m (correct — tallest residential tower downtown)
- Maritime Centre: 71.0m (correct — major office tower)
- Hampton Inn Downtown: 25.3m (correct — ~8 story hotel)
- Scotia Tower: 23.9m (correct — mid-rise office)

## Data Export

Buildings exported to `data/halifax_buildings.csv` with WKT geometry for Supabase import.
