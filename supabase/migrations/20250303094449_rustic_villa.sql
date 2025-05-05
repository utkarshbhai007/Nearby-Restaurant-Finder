/*
  # Add rating column to restaurants table

  1. Changes
    - Add `rating` column to the `restaurants` table if it doesn't already exist
    - Set appropriate constraints (rating between 1 and 5)
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurants' AND column_name = 'rating'
  ) THEN
    ALTER TABLE restaurants 
    ADD COLUMN rating numeric(2,1) CHECK (rating >= 1 AND rating <= 5);
  END IF;
END $$;