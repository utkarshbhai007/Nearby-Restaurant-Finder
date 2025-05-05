/*
  # Add WKT support for spatial queries

  1. Changes
    - Add WKT conversion functions
    - Update find_nearby_restaurants to use WKT
    - Add WKT output to existing functions

  2. New Functions
    - get_restaurant_location_wkt: Converts restaurant location to WKT
    - find_nearby_restaurants_wkt: Find nearby restaurants with WKT output
*/

-- Function to get restaurant location as WKT
CREATE OR REPLACE FUNCTION get_restaurant_location_wkt(restaurant_id uuid)
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT ST_AsText(geom)
    FROM restaurants
    WHERE id = restaurant_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced find_nearby_restaurants function with WKT
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
  location_wkt text
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
    ST_AsText(r.geom) as location_wkt
  FROM restaurants r
  WHERE ST_DWithin(
    r.geom::geography,
    ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography,
    radius_km * 1000
  )
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;