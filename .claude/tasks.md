# SunSpot Halifax — Tasks

> Source of truth for project status. Updated after every work session.
> Last updated: 2026-03-30

## Phases 0–5: ✅ ALL DONE

Phases 0 through 5 are complete. Summary:
- **Phase 0:** Building data validated (782 buildings, 99.5% heights via OSM enrichment)
- **Phase 1:** Next.js 16 app shell, time slider, weather banner, routes, components
- **Phase 2:** Supabase schema, 49 venues imported, 780 buildings, 2,450 forecast rows
- **Phase 3:** SunCalc + PostGIS forecast engine, filters, sort, search, 13 geometry tests
- **Phase 4:** Mapbox GL map with clustering + shadow overlay, venue detail sheet, OG images, share, empty states
- **Phase 5:** Community modals, toast system, favorites, recently viewed, SEO/sitemap, 68 tests passing

---

## Phase 6: Launch Readiness — IN PROGRESS

### 🧑 Manual Tasks (require you / human action)

- [ ] **Production Supabase setup** — create cloud Supabase project, run migrations, set env vars in Vercel dashboard
  - Run `supabase/migrations/001_initial_schema.sql` and `002_ray_intersection_function.sql` against prod
  - Run `npx tsx scripts/import-buildings.ts` and `npx tsx scripts/seed-venues.ts` against prod Supabase
  - Set Vercel env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`
  - Verify cron jobs fire and populate `venue_sun_forecast`
- [ ] **Patio location verification** — use `patio-verification.md` + `patio-photos/` to verify/correct patio coordinates via Google Maps satellite view, then update Supabase records
- [ ] **Real-device testing** — test on actual iPhone/Android: map, time slider, share, filters, venue detail
- [ ] **OG image validation** — test shared links with Facebook debugger + Twitter card validator
- [ ] **Launch distribution** — post to r/halifax, Halifax Twitter/X, local Facebook groups
- [ ] **Domain setup** (optional) — register custom domain, configure in Vercel + Mapbox token restrictions

### 🤖 Automatable Tasks (Claude can do these)

- [ ] **Accessibility audit + fixes** — keyboard nav, aria labels, screen reader testing, color contrast, `prefers-reduced-motion`
- [ ] **Analytics integration** — add Vercel Analytics (`@vercel/analytics`) + custom event tracking (venue_tap, filter_toggle, share_tap, time_slider_scrub, submission_start, empty_state_shown)
- [ ] **Inline onboarding tooltips** — first-visit-only tooltips on time slider, first venue pin, Sunny Now filter (deferred from Phase 4)
- [ ] **OSM outdoor_seating cross-reference** — script to match OSM `outdoor_seating=yes` tags to existing venues for data quality (deferred from Phase 2)
- [ ] **Google review keyword scan** — scan venue reviews for patio keywords to improve patio confidence (deferred from Phase 2)

---

## Post-MVP (Phase 7+)

- [ ] Verified patio polygons + multi-point sampling (`full_sun`/`partial_sun`)
- [ ] Swipeable venue detail sheet (left/right between venues)
- [ ] Custom cluster styling by dominant sun status
- [ ] Real routing API for walking times (currently haversine)
- [ ] Multi-day forecast (tomorrow, weekend planning)
- [ ] Admin panel for reviewing user submissions
- [ ] "Claim Your Patio" for businesses (polygon editor, verified badge)
- [ ] Promoted/sponsored pins
- [ ] Service worker caching for offline/degraded support
- [ ] Push notifications via PWA
- [ ] Tree shadow accuracy upgrade (ShadeMap LiDAR data)
- [ ] Expansion to other cities

---

## Infra / Config

- Vercel project linked: `sunspot-halifax` (prj_LcsbHf8EDIBVPJBzXKVveoT7LWDY)
- GitHub: `gmann14/sunspot-halifax`
- Supabase: local dev running (Docker), 780 buildings + 49 venues + 2,450 forecasts
- `.env.local`: Mapbox token, Google Places API key, Supabase local keys — all set
- 68 tests passing, TypeScript clean (`npx tsc --noEmit`)
- Deployed to Vercel: https://sunspot-halifax.vercel.app (needs cloud Supabase for production data)

## Active Blocker

**Cloud Supabase is the critical path.** The app is deployed to Vercel but all API routes hit localhost. Nothing else matters until production Supabase is set up and env vars are configured.
