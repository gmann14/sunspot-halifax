# SunSpot Halifax

## What This Is
A mobile-first web app showing which Halifax patios are currently in sunlight, using real-time shadow simulation from building geometry + sun position. See `docs/spec.md` for the full product spec.

## Tech Stack
- Next.js 15 (App Router)
- Mapbox GL JS v3 + mapbox-gl-shadow-simulator
- SunCalc.js
- Tailwind CSS
- Supabase (PostgreSQL + PostGIS)
- Vercel (hosting + cron)

## Project Structure
```
docs/
  spec.md                    — Product spec (source of truth)
  research/
    competitive-research.md  — incumbent + competitor analysis
    tech-research.md         — Shadow simulation libraries deep dive
    spec-analysis-v1.md      — Gap analysis of v1 spec (addressed in v2)
```

## Key Decisions
- Authoritative venue sun forecasts are server-side; the shadow map is optional progressive enhancement
- Zero manual venue data for launch — multi-signal pipeline (Google Places + OSM + review keywords)
- MVP uses estimated patio points first, with verified polygons added over time
- Weather banner is MVP (not post-MVP) — critical for trust
- Phase 0 validation spike must happen before any code: validate building data, licensing, and one server-side obstruction prototype

## Development Workflow
- Run `npm run dev` for local development
- Run `npx tsc --noEmit` before committing
- Run tests with `npm test`
- Commit messages: `type(scope): description`
