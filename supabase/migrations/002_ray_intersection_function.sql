-- Function to check which buildings a sun ray intersects, returning
-- the closest intersection distance for each building.
-- The ray is a line from the patio point to a projected endpoint.
CREATE OR REPLACE FUNCTION ray_intersecting_buildings(
  p_lng DOUBLE PRECISION,
  p_lat DOUBLE PRECISION,
  ray_end_lng DOUBLE PRECISION,
  ray_end_lat DOUBLE PRECISION,
  radius_m DOUBLE PRECISION
)
RETURNS TABLE (
  id UUID,
  height_m DOUBLE PRECISION,
  distance_m DOUBLE PRECISION
)
LANGUAGE sql
STABLE
AS $$
  WITH patio AS (
    SELECT ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326) AS pt
  ),
  ray AS (
    SELECT ST_SetSRID(
      ST_MakeLine(
        ST_MakePoint(p_lng, p_lat),
        ST_MakePoint(ray_end_lng, ray_end_lat)
      ), 4326
    ) AS line
  )
  SELECT
    b.id,
    b.height_m,
    ST_Distance(
      (SELECT pt FROM patio)::geography,
      ST_ClosestPoint(b.footprint, (SELECT pt FROM patio))::geography
    ) AS distance_m
  FROM buildings b, ray
  WHERE b.height_m IS NOT NULL
    AND ST_DWithin(
      b.footprint::geography,
      (SELECT pt FROM patio)::geography,
      radius_m
    )
    AND ST_Intersects(b.footprint, ray.line)
    AND ST_Distance(
      (SELECT pt FROM patio)::geography,
      ST_ClosestPoint(b.footprint, (SELECT pt FROM patio))::geography
    ) > 5  -- skip buildings at the patio point itself
  ORDER BY distance_m ASC;
$$;
