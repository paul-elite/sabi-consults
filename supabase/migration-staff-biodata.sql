-- Add biodata fields to admin_users for staff self-registration
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)

ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS position TEXT;

-- Update existing setup.sql reference comment
COMMENT ON COLUMN admin_users.date_of_birth IS 'Staff date of birth';
COMMENT ON COLUMN admin_users.position IS 'Staff position/role in the company';
