-- =====================================================================
--  Sabi Consults – complete database setup
--  Run this ONE file in the Supabase SQL Editor (Dashboard > SQL Editor).
--
--  • Safe on a brand-new project and on an existing one: it never drops
--    tables or deletes data, so you can re-run it after updates.
--  • Then optionally run supabase/seed.sql for sample Abuja listings.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- Properties (land and houses, with optional plot sizes / unit types)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price BIGINT NOT NULL DEFAULT 0,
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
  variations JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold', 'pending')),
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS variations JSONB DEFAULT '[]';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS bq INTEGER DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS land_size INTEGER;

CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(type);
CREATE INDEX IF NOT EXISTS idx_properties_district ON properties(district);
CREATE INDEX IF NOT EXISTS idx_properties_featured ON properties(featured);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at DESC);

DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------
-- Inquiries from the contact and property forms
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at DESC);

-- ---------------------------------------------------------------------
-- Staff accounts. Roles: super_admin, admin, staff.
-- (The ADMIN_EMAIL / ADMIN_PASSWORD env vars always work as a super admin.)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check CHECK (role IN ('super_admin', 'admin', 'staff'));

-- ---------------------------------------------------------------------
-- Site settings: contact details and branding (key/value)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO site_settings (key, value) VALUES
  ('whatsapp_number', '2349112122288'),
  ('phone_number', '+234 911 212 2288'),
  ('email', 'info.sabiconsults@gmail.com'),
  ('instagram_handle', 'sabi_consults'),
  ('address', 'Plot 137, Adetokunbo Ademola Crescent, Wuse II, Abuja-FCT'),
  ('brand_name', 'Sabi Consults'),
  ('brand_tagline', 'Helping people find their way home in Abuja'),
  ('brand_logo_url', '/logo.svg'),
  ('brand_color_primary', '#0055CC'),
  ('brand_color_ink', '#1a1a1a'),
  ('brand_color_surface', '#f8f6f3')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------
-- Blog
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blogs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image TEXT,
  author TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS blogs_slug_idx ON blogs(slug);
CREATE INDEX IF NOT EXISTS blogs_status_idx ON blogs(status);
DROP TRIGGER IF EXISTS update_blogs_updated_at ON blogs;
CREATE TRIGGER update_blogs_updated_at BEFORE UPDATE ON blogs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------
-- Team members shown on the About page
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  bio TEXT,
  image TEXT,
  email TEXT,
  phone TEXT,
  linkedin TEXT,
  twitter TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS team_members_order_idx ON team_members(display_order ASC);
DROP TRIGGER IF EXISTS update_team_members_updated_at ON team_members;
CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------
-- Row level security.
-- The public (anon key) can only read what the website shows and send
-- inquiries. Everything else goes through the server with the service key.
-- ---------------------------------------------------------------------
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view available properties" ON properties;
CREATE POLICY "Public can view available properties" ON properties
  FOR SELECT USING (status IN ('available', 'pending'));

DROP POLICY IF EXISTS "Anyone can create inquiries" ON inquiries;
CREATE POLICY "Anyone can create inquiries" ON inquiries
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view site settings" ON site_settings;
CREATE POLICY "Public can view site settings" ON site_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read of published blogs" ON blogs;
CREATE POLICY "Allow public read of published blogs" ON blogs
  FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "Allow public read of active team members" ON team_members;
CREATE POLICY "Allow public read of active team members" ON team_members
  FOR SELECT USING (is_active = true);

-- admin_users has no public policy: only the service role can read it.

-- ---------------------------------------------------------------------
-- Storage bucket for uploaded photos and logos (public read)
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ---------------------------------------------------------------------
-- Hardening (from the Supabase security advisor)
-- ---------------------------------------------------------------------
ALTER FUNCTION update_updated_at_column() SET search_path = '';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable') THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
  END IF;
END $$;

-- Done. Sign in at /admin with ADMIN_EMAIL and ADMIN_PASSWORD from your env vars.
