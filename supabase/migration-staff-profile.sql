-- Add profile fields to admin_users for staff self-registration
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)

ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS bio TEXT;

-- Index for quick lookups when showing team/staff lists
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(active) WHERE active = true;
