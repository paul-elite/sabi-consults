-- Migration: Add variations column to properties table
-- Run this in your Supabase SQL Editor if you have an existing database

-- Add variations column (JSONB array for multiple unit types/plot sizes)
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS variations JSONB DEFAULT '[]';

-- Example variation structure:
-- [
--   {
--     "id": "uuid-here",
--     "name": "3 Bedroom Terrace",
--     "price": 85000000,
--     "bedrooms": 3,
--     "bathrooms": 3,
--     "bq": 1,
--     "landSize": null,
--     "unitsAvailable": 5,
--     "status": "available"
--   },
--   {
--     "id": "uuid-here",
--     "name": "4 Bedroom Semi-Detached",
--     "price": 120000000,
--     "bedrooms": 4,
--     "bathrooms": 4,
--     "bq": 1,
--     "landSize": null,
--     "unitsAvailable": 3,
--     "status": "available"
--   }
-- ]
