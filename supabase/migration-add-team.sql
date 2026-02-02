-- Create team_members table
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for ordering
CREATE INDEX IF NOT EXISTS team_members_order_idx ON team_members(display_order ASC);
CREATE INDEX IF NOT EXISTS team_members_active_idx ON team_members(is_active);

-- Enable RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active team members
CREATE POLICY "Allow public read of active team members" ON team_members
  FOR SELECT USING (is_active = true);

-- Allow all operations for service role (admin)
CREATE POLICY "Allow service role full access on team" ON team_members
  FOR ALL USING (true) WITH CHECK (true);

-- Insert sample team members
INSERT INTO team_members (name, role, bio, image, email, linkedin, display_order, is_active) VALUES
(
  'Adaeze Okonkwo',
  'Founder & Principal Consultant',
  'With over 15 years of experience in Abuja real estate, Adaeze founded Sabi Consults to bridge the gap between quality properties and discerning buyers. Her deep knowledge of the FCT market and commitment to transparency has made her a trusted name in the industry.',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
  'adaeze@sabiconsults.com',
  'https://linkedin.com/in/',
  1,
  true
),
(
  'Emeka Nwosu',
  'Head of Sales',
  'Emeka brings 10 years of real estate sales experience to the team. His expertise in property valuation and negotiation has helped countless clients secure their dream properties at the best prices.',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400',
  'emeka@sabiconsults.com',
  'https://linkedin.com/in/',
  2,
  true
),
(
  'Fatima Ibrahim',
  'Client Relations Manager',
  'Fatima ensures every client receives personalized attention throughout their property journey. Her background in hospitality brings a unique touch to client service, making the buying process smooth and enjoyable.',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400',
  'fatima@sabiconsults.com',
  'https://linkedin.com/in/',
  3,
  true
),
(
  'Chukwudi Eze',
  'Property Analyst',
  'Chukwudi specializes in market research and property analysis. His data-driven approach helps clients make informed investment decisions based on market trends and growth potential.',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
  'chukwudi@sabiconsults.com',
  'https://linkedin.com/in/',
  4,
  true
);
