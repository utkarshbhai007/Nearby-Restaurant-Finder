/*
  # Add PostGIS Support and Geospatial Features

  1. Changes
    - Enable PostGIS extension
    - Add geometry column to restaurants table
    - Create spatial index for efficient queries
    - Add trigger to automatically update geometry column
    - Add function for calculating nearby restaurants

  2. Security
    - Maintain existing RLS policies
    - Add secure function for nearby restaurant calculations
*/

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geometry column to restaurants table
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326);

-- Create spatial index
CREATE INDEX IF NOT EXISTS restaurants_geom_idx 
ON restaurants USING GIST (geom);

-- Create function to update geometry from lat/lon
CREATE OR REPLACE FUNCTION update_restaurant_geom()
RETURNS TRIGGER AS $$
BEGIN
  NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update geometry
DROP TRIGGER IF EXISTS update_restaurant_geom_trigger ON restaurants;
CREATE TRIGGER update_restaurant_geom_trigger
  BEFORE INSERT OR UPDATE
  ON restaurants
  FOR EACH ROW
  EXECUTE FUNCTION update_restaurant_geom();

-- Update existing records
UPDATE restaurants 
SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE geom IS NULL;

-- Create function to find nearby restaurants
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
  distance_km double precision
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
    ) / 1000 AS distance_km
  FROM restaurants r
  WHERE ST_DWithin(
    r.geom::geography,
    ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography,
    radius_km * 1000
  )
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;