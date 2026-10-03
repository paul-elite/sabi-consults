-- Migration: Update schema for Land/House property types
-- Run this in your Supabase SQL Editor

-- Step 1: Drop the existing properties table (WARNING: This deletes all data!)
DROP TABLE IF EXISTS properties CASCADE;

-- Step 2: Create the new properties table with updated schema
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price BIGINT NOT NULL,
  price_label TEXT,
  type TEXT NOT NULL CHECK (type IN ('land', 'house')),
  district TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  bedrooms INTEGER,
  bathrooms INTEGER,
  bq INTEGER DEFAULT 0,
  land_size INTEGER,
  images TEXT[] DEFAULT '{}',
  features TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold', 'pending')),
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create indexes
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_type ON properties(type);
CREATE INDEX idx_properties_district ON properties(district);
CREATE INDEX idx_properties_featured ON properties(featured);
CREATE INDEX idx_properties_created_at ON properties(created_at DESC);

-- Step 4: Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 5: Enable RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies
DROP POLICY IF EXISTS "Public can view available properties" ON properties;
CREATE POLICY "Public can view available properties" ON properties
  FOR SELECT
  USING (status = 'available' OR status = 'pending');

DROP POLICY IF EXISTS "Service role has full access to properties" ON properties;
CREATE POLICY "Service role has full access to properties" ON properties
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Done! Now add your properties via the admin dashboard.
