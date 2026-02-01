-- Sabi Consults Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price BIGINT NOT NULL,
  price_label TEXT,
  type TEXT NOT NULL CHECK (type IN ('sale', 'rent')),
  property_type TEXT NOT NULL CHECK (property_type IN ('house', 'apartment', 'land', 'commercial', 'villa')),
  district TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  bedrooms INTEGER,
  bathrooms INTEGER,
  size INTEGER,
  images TEXT[] DEFAULT '{}',
  features TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold', 'rented', 'pending')),
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inquiries table
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

-- Admin users table (for additional staff management if needed)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Site settings table (key-value store for configuration)
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO site_settings (key, value) VALUES
  ('whatsapp_number', '2348000000000'),
  ('phone_number', '+234 800 000 0000'),
  ('email', 'hello@sabiconsults.com'),
  ('instagram_handle', 'sabi_consults'),
  ('address', 'Abuja, Nigeria')
ON CONFLICT (key) DO NOTHING;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(type);
CREATE INDEX IF NOT EXISTS idx_properties_district ON properties(district);
CREATE INDEX IF NOT EXISTS idx_properties_featured ON properties(featured);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at DESC);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for properties updated_at
DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Properties: Public read access for available properties
CREATE POLICY "Public can view available properties" ON properties
  FOR SELECT
  USING (status = 'available' OR status = 'pending');

-- Properties: Service role has full access
CREATE POLICY "Service role has full access to properties" ON properties
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Inquiries: Anyone can insert
CREATE POLICY "Anyone can create inquiries" ON inquiries
  FOR INSERT
  WITH CHECK (true);

-- Inquiries: Service role can read/update
CREATE POLICY "Service role has full access to inquiries" ON inquiries
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Admin users: Service role only
CREATE POLICY "Service role has full access to admin_users" ON admin_users
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Site settings: Public read access
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view site settings" ON site_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Service role has full access to site_settings" ON site_settings
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Insert sample data (optional - can be removed after testing)
INSERT INTO properties (title, description, price, type, property_type, district, address, latitude, longitude, bedrooms, bathrooms, size, images, features, status, featured)
VALUES
  (
    '5 Bedroom Detached Duplex with BQ',
    'Exquisite 5-bedroom detached duplex in the heart of Maitama. This property features modern finishes, spacious living areas, a well-equipped kitchen, and a beautifully landscaped garden.',
    450000000,
    'sale',
    'house',
    'Maitama',
    '24 Yedseram Street, Maitama, Abuja',
    9.0820,
    7.4878,
    5,
    6,
    650,
    ARRAY['https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200'],
    ARRAY['Swimming Pool', 'Generator House', 'Security Post', 'Landscaped Garden'],
    'available',
    true
  ),
  (
    '4 Bedroom Terrace Duplex',
    'Contemporary 4-bedroom terrace duplex in Asokoro. Features include high-quality finishes, open-plan living and dining, fitted kitchen, and private garden.',
    280000000,
    'sale',
    'house',
    'Asokoro',
    '8 Danube Close, Asokoro, Abuja',
    9.0406,
    7.5149,
    4,
    5,
    420,
    ARRAY['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200'],
    ARRAY['Fitted Kitchen', 'Private Garden', 'Gated Estate', '24/7 Security'],
    'available',
    true
  ),
  (
    'Luxury 3 Bedroom Apartment',
    'Stunning 3-bedroom apartment in a prime Wuse II location with panoramic city views and modern interiors.',
    120000000,
    'sale',
    'apartment',
    'Wuse II',
    'Aminu Kano Crescent, Wuse II, Abuja',
    9.0677,
    7.4626,
    3,
    4,
    220,
    ARRAY['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200'],
    ARRAY['City Views', 'Gym Access', 'Swimming Pool', 'Concierge'],
    'available',
    true
  ),
  (
    '6 Bedroom Villa with Pool',
    'Magnificent 6-bedroom villa set on expansive grounds in Katampe Extension with infinity pool and entertainment areas.',
    800000000,
    'sale',
    'villa',
    'Katampe',
    '15 Katampe Extension, Abuja',
    9.0892,
    7.4456,
    6,
    7,
    950,
    ARRAY['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200'],
    ARRAY['Infinity Pool', 'Home Cinema', 'Wine Cellar', 'Staff Quarters'],
    'available',
    true
  ),
  (
    '3 Bedroom Flat for Rent',
    'Well-maintained 3-bedroom flat available for rent in Jabi with modern amenities and excellent natural lighting.',
    4500000,
    'rent',
    'apartment',
    'Jabi',
    'Jabi District, Abuja',
    9.0736,
    7.4237,
    3,
    3,
    180,
    ARRAY['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200'],
    ARRAY['Serviced', 'Furnished Option', 'Security', 'Generator'],
    'available',
    false
  );
