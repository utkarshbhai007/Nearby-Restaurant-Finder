/*
  # Authentication Setup

  1. Security
    - Enable email auth
    - Configure auth settings
*/

-- Enable email auth
ALTER TABLE auth.identities
ENABLE ROW LEVEL SECURITY;

-- Set up auth settings
ALTER TABLE auth.users
ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own data
CREATE POLICY "Users can read own data"
ON auth.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow users to update their own data
CREATE POLICY "Users can update own data"
ON auth.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);