-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Venues table
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('restaurant', 'bar', 'cafe', 'brewery')),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  sun_query_point GEOMETRY(Point, 4326) NOT NULL,
  patio_confidence TEXT DEFAULT 'estimated' CHECK (patio_confidence IN ('verified', 'estimated')),
  google_place_id TEXT,
  website TEXT,
  phone TEXT,
  rating NUMERIC(2,1),
  price_level INTEGER CHECK (price_level BETWEEN 1 AND 4),
  hours JSONB,
  patio_season_only BOOLEAN DEFAULT true,
  address TEXT,
  neighborhood TEXT,
  photos JSONB,
  last_verified_at TIMESTAMPTZ,
  data_sources JSONB,
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

-- Buildings table
CREATE TABLE buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  footprint GEOMETRY(Polygon, 4326) NOT NULL,
  height_m DOUBLE PRECISION,
  source TEXT NOT NULL CHECK (source IN ('overture', 'osm', 'lidar', 'manual')),
  source_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_buildings_footprint ON buildings USING GIST (footprint);
CREATE INDEX idx_buildings_footprint_geog ON buildings USING GIST ((footprint::geography));
CREATE INDEX idx_buildings_source ON buildings (source);

-- Venue sun forecast table
CREATE TABLE venue_sun_forecast (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  slot_starts_at TIMESTAMPTZ NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('sun', 'shade', 'unknown')),
  confidence TEXT NOT NULL CHECK (confidence IN ('estimated', 'verified')),
  UNIQUE (venue_id, slot_starts_at)
);

CREATE INDEX idx_sun_forecast_venue ON venue_sun_forecast (venue_id, slot_starts_at);
CREATE INDEX idx_sun_forecast_slot ON venue_sun_forecast (slot_starts_at, status);

-- User submissions table
CREATE TABLE user_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
  venue_name TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  submission_type TEXT NOT NULL CHECK (submission_type IN ('new_patio', 'correction', 'closure_report')),
  details TEXT,
  submitted_by TEXT DEFAULT 'anonymous',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_sun_forecast ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_submissions ENABLE ROW LEVEL SECURITY;

-- Public read access for venues
CREATE POLICY "venues_public_read" ON venues
  FOR SELECT USING (true);

-- Public read access for buildings
CREATE POLICY "buildings_public_read" ON buildings
  FOR SELECT USING (true);

-- Public read access for forecasts
CREATE POLICY "forecast_public_read" ON venue_sun_forecast
  FOR SELECT USING (true);

-- Public insert-only access for submissions
CREATE POLICY "submissions_public_insert" ON user_submissions
  FOR INSERT WITH CHECK (true);

-- Function to find buildings within a radius (meters) of a point
-- Used by the forecast engine
CREATE OR REPLACE FUNCTION buildings_within_radius(
  p_lng DOUBLE PRECISION,
  p_lat DOUBLE PRECISION,
  radius_m DOUBLE PRECISION
)
RETURNS TABLE (
  id UUID,
  footprint GEOMETRY,
  height_m DOUBLE PRECISION,
  source TEXT,
  centroid_lat DOUBLE PRECISION,
  centroid_lng DOUBLE PRECISION
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    b.id,
    b.footprint,
    b.height_m,
    b.source,
    ST_Y(ST_Centroid(b.footprint)) as centroid_lat,
    ST_X(ST_Centroid(b.footprint)) as centroid_lng
  FROM buildings b
  WHERE ST_DWithin(
    b.footprint::geography,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    radius_m
  );
$$;
