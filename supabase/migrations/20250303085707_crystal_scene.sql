/*
  # Add rating column to restaurants table

  1. Changes
    - Add `rating` column to `restaurants` table
    - This allows restaurant owners to rate their own establishments
    - Rating is stored as a numeric value between 1-5
  
  2. Notes
    - Uses a check constraint to ensure ratings are between 1 and 5
    - Existing restaurants will have NULL rating by default
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