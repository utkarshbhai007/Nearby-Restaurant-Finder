/*
  # Create restaurants table and authentication setup

  1. New Tables
    - `restaurants`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `address` (text)
      - `latitude` (double precision)
      - `longitude` (double precision)
      - `owner_id` (uuid, references auth.users)
      - `created_at` (timestamp)
      - `phone` (text)
      - `cuisine_type` (text)
      - `opening_hours` (text)

  2. Security
    - Enable RLS on restaurants table
    - Add policies for:
      - Public read access
      - Authenticated users can create restaurants
      - Owners can update their own restaurants
*/

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
  CONSTRAINT valid_coordinates CHECK (
    latitude BETWEEN -90 AND 90 AND
    longitude BETWEEN -180 AND 180
  )
);

ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Restaurants are viewable by everyone"
  ON restaurants
  FOR SELECT
  USING (true);

-- Allow authenticated users to create restaurants
CREATE POLICY "Authenticated users can create restaurants"
  ON restaurants
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Allow restaurant owners to update their own restaurants
CREATE POLICY "Users can update own restaurants"
  ON restaurants
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);