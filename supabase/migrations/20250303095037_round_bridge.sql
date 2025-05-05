/*
  # Fix rating column in database functions

  1. Changes
    - Update the find_nearby_restaurants_wkt function to include the rating column in its return values
    - Ensure the rating column is properly handled in all database operations
*/

-- Update the find_nearby_restaurants_wkt function to include rating
CREATE OR REPLACE FUNCTION find_nearby_restaurants_wkt(
  lat double precision,
  lon double precision,
  radius_km double precision DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  address text,
  latitude double precision,
  longitude double precision,
  phone text,
  cuisine_type text,
  opening_hours text,
  distance_km double precision,
  location_wkt text,
  rating numeric(2,1)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.description,
    r.address,
    r.latitude,
    r.longitude,
    r.phone,
    r.cuisine_type,
    r.opening_hours,
    ST_Distance(
      r.geom::geography,
      ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography
    ) / 1000 AS distance_km,
    ST_AsText(r.geom) as location_wkt,
    r.rating
  FROM restaurants r
  WHERE ST_DWithin(
    r.geom::geography,
    ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography,
    radius_km * 1000
  )
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the find_nearby_restaurants function to include rating
CREATE OR REPLACE FUNCTION find_nearby_restaurants(
  lat double precision,
  lon double precision,
  radius_km double precision DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  address text,
  latitude double precision,
  longitude double precision,
  phone text,
  cuisine_type text,
  opening_hours text,
  distance_km double precision,
  rating numeric(2,1)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.description,
    r.address,
    r.latitude,
    r.longitude,
    r.phone,
    r.cuisine_type,
    r.opening_hours,
    ST_Distance(
      r.geom::geography,
      ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography
    ) / 1000 AS distance_km,
    r.rating
  FROM restaurants r
  WHERE ST_DWithin(
    r.geom::geography,
    ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography,
    radius_km * 1000
  )
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;