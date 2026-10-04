-- =====================================================================
-- Lead Capture & Scoring System Migration
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Leads table: Enhanced contact capture with scoring and attribution
-- Links anonymous visitor tracking to identified leads
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contact Information (explicitly provided by visitor)
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,

  -- Anonymous Tracking Link (connects to analytics_events)
  visitor_id TEXT,                    -- Links to localStorage visitor ID
  session_id TEXT,                    -- Session when lead was captured

  -- Lead Source Attribution
  source TEXT,                        -- google, facebook, direct, referral, etc.
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  referrer TEXT,
  landing_page TEXT,

  -- Device & Location
  device_type TEXT,
  browser TEXT,
  country TEXT,
  city TEXT,

  -- Lead Scoring
  score INTEGER DEFAULT 0,
  score_breakdown JSONB DEFAULT '{}', -- { "property_view": 5, "phone_click": 10, ... }
  quality TEXT DEFAULT 'cold' CHECK (quality IN ('cold', 'warm', 'hot')),

  -- Engagement Metrics (aggregated from events)
  total_visits INTEGER DEFAULT 1,
  total_sessions INTEGER DEFAULT 1,
  total_page_views INTEGER DEFAULT 0,
  total_property_views INTEGER DEFAULT 0,
  properties_viewed TEXT[] DEFAULT '{}',
  most_viewed_property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  total_contact_clicks INTEGER DEFAULT 0,
  saved_properties TEXT[] DEFAULT '{}',

  -- Timestamps
  first_visit_at TIMESTAMPTZ,
  last_visit_at TIMESTAMPTZ,
  first_contact_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),

  -- Status
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  assigned_to UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_leads_visitor_id ON leads(visitor_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_quality ON leads(quality);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------
-- Lead Preferences: What the lead is looking for
-- Progressive capture - not all fields required initially
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lead_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  -- Intent
  intent TEXT CHECK (intent IN ('buy', 'rent', 'invest', 'undecided')),

  -- Property Preferences
  property_types TEXT[] DEFAULT '{}',   -- ['house', 'land']
  preferred_districts TEXT[] DEFAULT '{}',
  min_bedrooms INTEGER,
  max_bedrooms INTEGER,
  min_budget BIGINT,
  max_budget BIGINT,
  land_size_min INTEGER,
  land_size_max INTEGER,

  -- Features
  required_features TEXT[] DEFAULT '{}',

  -- Timeline
  timeline TEXT,                       -- 'immediately', '1-3 months', '3-6 months', '6+ months'

  -- Additional Context
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(lead_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_preferences_lead ON lead_preferences(lead_id);

DROP TRIGGER IF EXISTS update_lead_preferences_updated_at ON lead_preferences;
CREATE TRIGGER update_lead_preferences_updated_at BEFORE UPDATE ON lead_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------
-- Lead Property Interests: Specific properties a lead has shown interest in
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lead_property_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- Interest Level
  interest_type TEXT NOT NULL CHECK (interest_type IN ('viewed', 'saved', 'inquired', 'viewing_requested')),

  -- Engagement Metrics
  view_count INTEGER DEFAULT 1,
  total_time_seconds INTEGER DEFAULT 0,
  gallery_views INTEGER DEFAULT 0,
  map_interactions INTEGER DEFAULT 0,

  -- Timestamps
  first_viewed_at TIMESTAMPTZ DEFAULT NOW(),
  last_viewed_at TIMESTAMPTZ DEFAULT NOW(),
  inquired_at TIMESTAMPTZ,
  viewing_requested_at TIMESTAMPTZ,

  UNIQUE(lead_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_property_interests_lead ON lead_property_interests(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_property_interests_property ON lead_property_interests(property_id);

-- ---------------------------------------------------------------------
-- Saved Properties: Bookmarks by anonymous visitors (before they become leads)
-- Links via visitor_id, converted to lead_property_interests when lead created
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS saved_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(visitor_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_properties_visitor ON saved_properties(visitor_id);
CREATE INDEX IF NOT EXISTS idx_saved_properties_property ON saved_properties(property_id);

-- ---------------------------------------------------------------------
-- Viewing Requests: Scheduled property viewings
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS viewing_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- Contact (in case lead_id is null or for quick reference)
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,

  -- Scheduling
  preferred_date DATE,
  preferred_time TEXT,                -- 'morning', 'afternoon', 'evening', or specific time

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  confirmed_datetime TIMESTAMPTZ,

  -- Notes
  visitor_notes TEXT,
  agent_notes TEXT,

  -- Attribution
  visitor_id TEXT,
  session_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_viewing_requests_lead ON viewing_requests(lead_id);
CREATE INDEX IF NOT EXISTS idx_viewing_requests_property ON viewing_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_viewing_requests_status ON viewing_requests(status);
CREATE INDEX IF NOT EXISTS idx_viewing_requests_date ON viewing_requests(preferred_date);

DROP TRIGGER IF EXISTS update_viewing_requests_updated_at ON viewing_requests;
CREATE TRIGGER update_viewing_requests_updated_at BEFORE UPDATE ON viewing_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------
-- Lead Events: Timeline of lead activity (for lead profile view)
-- Copies relevant analytics_events data when a lead is identified
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lead_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  -- Event Details
  event_type TEXT NOT NULL,
  event_label TEXT,

  -- Property Context
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  property_title TEXT,

  -- Page Context
  page_path TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- When it happened
  occurred_at TIMESTAMPTZ NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_events_lead ON lead_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_occurred ON lead_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_events_type ON lead_events(event_type);

-- ---------------------------------------------------------------------
-- Popup Dismissals: Track when users dismiss popups (frequency control)
-- Stored in localStorage but synced here for analytics
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS popup_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL,
  popup_type TEXT NOT NULL,           -- 'property_interest', 'exit_intent', etc.
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  dismissed_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(visitor_id, popup_type, property_id)
);

CREATE INDEX IF NOT EXISTS idx_popup_dismissals_visitor ON popup_dismissals(visitor_id);

-- ---------------------------------------------------------------------
-- Add new event types to analytics for enhanced tracking
-- (The table already exists, we're just documenting expected event_types)
-- ---------------------------------------------------------------------
COMMENT ON TABLE analytics_events IS 'Raw analytics events. Extended event types:
- page_view: Page loaded
- property_view: Property detail page viewed
- property_view_duration: Time spent on property (duration_seconds)
- gallery_open: Gallery modal opened
- gallery_image_view: Individual image viewed (event_value = index)
- gallery_complete: All images viewed
- map_open: Map expanded/opened
- map_interaction: Map clicked/zoomed/panned
- amenities_view: Amenities section viewed
- description_expand: Description expanded
- floorplan_view: Floorplan image viewed
- video_play: Video started
- video_complete: Video finished
- share_click: Share button clicked (event_label = platform)
- save_property: Property bookmarked
- unsave_property: Property bookmark removed
- search: Search performed (metadata = query)
- filter_applied: Filter changed (metadata = filters)
- sort_changed: Sort order changed (event_label = sort_type)
- similar_property_click: Clicked similar property
- agent_profile_view: Agent profile opened
- whatsapp_click: WhatsApp button clicked
- phone_click: Phone link clicked
- email_click: Email link clicked
- inquiry_started: Form opened/focused
- inquiry_submitted: Form submitted
- popup_view: Lead capture popup shown (event_label = popup_type)
- popup_dismissed: Popup closed without action
- popup_submitted: Popup form submitted
- viewing_requested: Viewing request submitted
- scroll_depth: Scroll milestone reached (event_value = percentage)
';

-- ---------------------------------------------------------------------
-- Function to calculate lead score
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_lead_score(p_lead_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_breakdown JSONB := '{}';
  v_lead leads%ROWTYPE;
  v_property_views INTEGER;
  v_contact_clicks INTEGER;
  v_saved_count INTEGER;
  v_viewing_requests INTEGER;
  v_repeat_views INTEGER;
BEGIN
  -- Get lead record
  SELECT * INTO v_lead FROM leads WHERE id = p_lead_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- Property views (1 point each, max 10)
  v_property_views := LEAST(v_lead.total_property_views, 10);
  v_score := v_score + v_property_views;
  v_breakdown := v_breakdown || jsonb_build_object('property_views', v_property_views);

  -- Contact clicks (4 points each)
  v_contact_clicks := v_lead.total_contact_clicks * 4;
  v_score := v_score + v_contact_clicks;
  v_breakdown := v_breakdown || jsonb_build_object('contact_clicks', v_contact_clicks);

  -- Saved properties (3 points each)
  v_saved_count := array_length(v_lead.saved_properties, 1);
  IF v_saved_count IS NOT NULL THEN
    v_score := v_score + (v_saved_count * 3);
    v_breakdown := v_breakdown || jsonb_build_object('saved_properties', v_saved_count * 3);
  END IF;

  -- Return visits (3 points if > 1 visit)
  IF v_lead.total_visits > 1 THEN
    v_score := v_score + 3;
    v_breakdown := v_breakdown || jsonb_build_object('return_visitor', 3);
  END IF;

  -- Multiple sessions (2 points if > 1 session)
  IF v_lead.total_sessions > 1 THEN
    v_score := v_score + 2;
    v_breakdown := v_breakdown || jsonb_build_object('multiple_sessions', 2);
  END IF;

  -- Viewing requests (10 points each)
  SELECT COUNT(*) INTO v_viewing_requests
  FROM viewing_requests WHERE lead_id = p_lead_id;
  IF v_viewing_requests > 0 THEN
    v_score := v_score + (v_viewing_requests * 10);
    v_breakdown := v_breakdown || jsonb_build_object('viewing_requests', v_viewing_requests * 10);
  END IF;

  -- Has email (2 points - shows serious intent)
  IF v_lead.email IS NOT NULL AND v_lead.email != '' THEN
    v_score := v_score + 2;
    v_breakdown := v_breakdown || jsonb_build_object('has_email', 2);
  END IF;

  -- Update lead with new score
  UPDATE leads
  SET
    score = v_score,
    score_breakdown = v_breakdown,
    quality = CASE
      WHEN v_score >= 20 THEN 'hot'
      WHEN v_score >= 10 THEN 'warm'
      ELSE 'cold'
    END,
    updated_at = NOW()
  WHERE id = p_lead_id;

  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- Function to link visitor events to a newly created lead
-- Called after a lead is created to populate lead_events timeline
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION link_visitor_to_lead(p_lead_id UUID, p_visitor_id TEXT)
RETURNS void AS $$
DECLARE
  v_event RECORD;
  v_first_visit TIMESTAMPTZ;
  v_last_visit TIMESTAMPTZ;
  v_total_views INTEGER;
  v_property_views INTEGER;
  v_contact_clicks INTEGER;
  v_properties_viewed TEXT[];
  v_saved TEXT[];
BEGIN
  -- Get visitor stats from analytics_events
  SELECT
    MIN(created_at),
    MAX(created_at),
    COUNT(*) FILTER (WHERE event_type = 'page_view'),
    COUNT(*) FILTER (WHERE event_type = 'property_view'),
    COUNT(*) FILTER (WHERE event_type IN ('whatsapp_click', 'phone_click', 'email_click'))
  INTO v_first_visit, v_last_visit, v_total_views, v_property_views, v_contact_clicks
  FROM analytics_events
  WHERE visitor_id = p_visitor_id;

  -- Get unique properties viewed
  SELECT ARRAY_AGG(DISTINCT property_id::TEXT)
  INTO v_properties_viewed
  FROM analytics_events
  WHERE visitor_id = p_visitor_id
    AND property_id IS NOT NULL
    AND event_type = 'property_view';

  -- Get saved properties
  SELECT ARRAY_AGG(property_id::TEXT)
  INTO v_saved
  FROM saved_properties
  WHERE visitor_id = p_visitor_id;

  -- Update lead with aggregated stats
  UPDATE leads SET
    first_visit_at = COALESCE(v_first_visit, first_visit_at),
    last_visit_at = COALESCE(v_last_visit, last_visit_at),
    total_page_views = COALESCE(v_total_views, 0),
    total_property_views = COALESCE(v_property_views, 0),
    total_contact_clicks = COALESCE(v_contact_clicks, 0),
    properties_viewed = COALESCE(v_properties_viewed, '{}'),
    saved_properties = COALESCE(v_saved, '{}')
  WHERE id = p_lead_id;

  -- Copy recent events to lead_events timeline (last 50)
  INSERT INTO lead_events (lead_id, event_type, event_label, property_id, property_title, page_path, metadata, occurred_at)
  SELECT
    p_lead_id,
    event_type,
    event_label,
    property_id,
    property_title,
    page_path,
    metadata,
    created_at
  FROM analytics_events
  WHERE visitor_id = p_visitor_id
  ORDER BY created_at DESC
  LIMIT 50;

  -- Convert saved_properties to lead_property_interests
  INSERT INTO lead_property_interests (lead_id, property_id, interest_type, first_viewed_at)
  SELECT p_lead_id, property_id, 'saved', saved_at
  FROM saved_properties
  WHERE visitor_id = p_visitor_id
  ON CONFLICT (lead_id, property_id) DO UPDATE SET
    interest_type = 'saved';

  -- Calculate and update score
  PERFORM calculate_lead_score(p_lead_id);
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_property_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE viewing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE popup_dismissals ENABLE ROW LEVEL SECURITY;

-- saved_properties can be written by anyone (via API with visitor_id)
DROP POLICY IF EXISTS "Allow insert saved_properties" ON saved_properties;
CREATE POLICY "Allow insert saved_properties" ON saved_properties
  FOR INSERT WITH CHECK (true);

-- popup_dismissals can be written by anyone (via API with visitor_id)
DROP POLICY IF EXISTS "Allow insert popup_dismissals" ON popup_dismissals;
CREATE POLICY "Allow insert popup_dismissals" ON popup_dismissals
  FOR INSERT WITH CHECK (true);

-- All other tables are admin-only (service role)

-- ---------------------------------------------------------------------
-- Comments for documentation
-- ---------------------------------------------------------------------
COMMENT ON TABLE leads IS 'Identified leads with contact info, scoring, and attribution';
COMMENT ON TABLE lead_preferences IS 'What the lead is looking for (progressive capture)';
COMMENT ON TABLE lead_property_interests IS 'Specific properties a lead has engaged with';
COMMENT ON TABLE saved_properties IS 'Anonymous visitor bookmarks (before lead identification)';
COMMENT ON TABLE viewing_requests IS 'Scheduled property viewing appointments';
COMMENT ON TABLE lead_events IS 'Timeline of lead activity for admin view';
COMMENT ON TABLE popup_dismissals IS 'Tracks popup dismissals for frequency control';
COMMENT ON FUNCTION calculate_lead_score IS 'Calculates lead quality score based on engagement';
COMMENT ON FUNCTION link_visitor_to_lead IS 'Links anonymous visitor history to a newly identified lead';
