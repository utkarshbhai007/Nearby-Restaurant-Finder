/*
  # Initial schema setup for restaurant map application

  1. Tables
    - restaurants table with location support
    - PostGIS integration for spatial queries

  2. Security
    - Row Level Security (RLS) policies
    - Public read access
    - Owner-based write access
*/

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create restaurants table
CREATE TABLE restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  address text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  owner_id uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now(),
  phone text,
  cuisine_type text,
  opening_hours text,
  geom geometry(Point, 4326),
  CONSTRAINT valid_coordinates CHECK (
    latitude BETWEEN -90 AND 90 AND
    longitude BETWEEN -180 AND 180
  )
);

-- Create spatial index
CREATE INDEX restaurants_geom_idx ON restaurants USING GIST (geom);

-- Enable RLS
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Restaurants are viewable by everyone"
  ON restaurants FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create restaurants"
  ON restaurants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own restaurants"
  ON restaurants FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Create function to update geometry from lat/lon
CREATE OR REPLACE FUNCTION update_restaurant_geom()
RETURNS TRIGGER AS $$
BEGIN
  NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for geometry updates
CREATE TRIGGER update_restaurant_geom_trigger
  BEFORE INSERT OR UPDATE
  ON restaurants
  FOR EACH ROW
  EXECUTE FUNCTION update_restaurant_geom();

-- Create nearby restaurants function
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