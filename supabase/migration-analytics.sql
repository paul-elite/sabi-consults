-- Analytics tables for tracking website events
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)

-- Main analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event identification
  event_type TEXT NOT NULL,           -- page_view, property_view, inquiry, click, search, etc.
  event_category TEXT,                -- engagement, conversion, navigation, etc.

  -- Session tracking
  session_id TEXT,                    -- Anonymous session identifier
  visitor_id TEXT,                    -- Persistent visitor identifier (cookie-based)

  -- Page context
  page_path TEXT,                     -- /properties, /properties/123, /contact
  page_title TEXT,
  referrer TEXT,                      -- Where visitor came from
  utm_source TEXT,                    -- Marketing attribution
  utm_medium TEXT,
  utm_campaign TEXT,

  -- Property context (for property-related events)
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  property_title TEXT,
  property_district TEXT,
  property_type TEXT,
  property_price BIGINT,

  -- Event details
  event_label TEXT,                   -- Additional context (button name, link text, etc.)
  event_value NUMERIC,                -- Numeric value if applicable
  metadata JSONB DEFAULT '{}',        -- Flexible additional data

  -- Device & location
  device_type TEXT,                   -- desktop, mobile, tablet
  browser TEXT,
  os TEXT,
  screen_resolution TEXT,
  country TEXT,
  city TEXT,

  -- Timing
  duration_seconds INTEGER,           -- Time on page or engagement time
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_property_id ON analytics_events(property_id);
CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_visitor ON analytics_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_page_path ON analytics_events(page_path);

-- Daily aggregated stats for faster dashboard queries
CREATE TABLE IF NOT EXISTS analytics_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,

  -- Traffic metrics
  page_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  unique_sessions INTEGER DEFAULT 0,

  -- Engagement metrics
  total_inquiries INTEGER DEFAULT 0,
  property_views INTEGER DEFAULT 0,
  avg_session_duration INTEGER DEFAULT 0,  -- seconds

  -- Source breakdown (JSONB for flexibility)
  traffic_sources JSONB DEFAULT '{}',      -- { "direct": 100, "google": 50, ... }
  device_breakdown JSONB DEFAULT '{}',     -- { "mobile": 60, "desktop": 40 }

  -- Top content
  top_pages JSONB DEFAULT '[]',            -- [{ "path": "/", "views": 100 }, ...]
  top_properties JSONB DEFAULT '[]',       -- [{ "id": "...", "views": 50 }, ...]
  top_districts JSONB DEFAULT '[]',        -- [{ "name": "Maitama", "views": 30 }, ...]

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(date)
);

CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON analytics_daily_stats(date);

-- Property-specific analytics (aggregated)
CREATE TABLE IF NOT EXISTS property_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,

  -- Lifetime metrics
  total_views INTEGER DEFAULT 0,
  unique_views INTEGER DEFAULT 0,
  total_inquiries INTEGER DEFAULT 0,

  -- Engagement
  avg_time_on_page INTEGER DEFAULT 0,      -- seconds
  gallery_views INTEGER DEFAULT 0,
  map_interactions INTEGER DEFAULT 0,
  share_clicks INTEGER DEFAULT 0,

  -- Contact actions
  whatsapp_clicks INTEGER DEFAULT 0,
  phone_clicks INTEGER DEFAULT 0,
  email_clicks INTEGER DEFAULT 0,

  -- Conversion
  inquiry_conversion_rate NUMERIC(5,2) DEFAULT 0,  -- inquiries / views * 100

  -- Time tracking
  first_view_at TIMESTAMPTZ,
  last_view_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(property_id)
);

CREATE INDEX IF NOT EXISTS idx_property_analytics_property ON property_analytics(property_id);

-- Function to update property analytics on new events
CREATE OR REPLACE FUNCTION update_property_analytics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.property_id IS NOT NULL THEN
    INSERT INTO property_analytics (property_id, first_view_at, last_view_at)
    VALUES (NEW.property_id, NOW(), NOW())
    ON CONFLICT (property_id) DO UPDATE SET
      total_views = CASE WHEN NEW.event_type = 'property_view'
                         THEN property_analytics.total_views + 1
                         ELSE property_analytics.total_views END,
      total_inquiries = CASE WHEN NEW.event_type = 'inquiry'
                             THEN property_analytics.total_inquiries + 1
                             ELSE property_analytics.total_inquiries END,
      gallery_views = CASE WHEN NEW.event_type = 'gallery_view'
                           THEN property_analytics.gallery_views + 1
                           ELSE property_analytics.gallery_views END,
      map_interactions = CASE WHEN NEW.event_type = 'map_interaction'
                              THEN property_analytics.map_interactions + 1
                              ELSE property_analytics.map_interactions END,
      whatsapp_clicks = CASE WHEN NEW.event_type = 'whatsapp_click'
                             THEN property_analytics.whatsapp_clicks + 1
                             ELSE property_analytics.whatsapp_clicks END,
      phone_clicks = CASE WHEN NEW.event_type = 'phone_click'
                          THEN property_analytics.phone_clicks + 1
                          ELSE property_analytics.phone_clicks END,
      email_clicks = CASE WHEN NEW.event_type = 'email_click'
                          THEN property_analytics.email_clicks + 1
                          ELSE property_analytics.email_clicks END,
      share_clicks = CASE WHEN NEW.event_type = 'share_click'
                          THEN property_analytics.share_clicks + 1
                          ELSE property_analytics.share_clicks END,
      last_view_at = NOW(),
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update property analytics
DROP TRIGGER IF EXISTS trigger_update_property_analytics ON analytics_events;
CREATE TRIGGER trigger_update_property_analytics
  AFTER INSERT ON analytics_events
  FOR EACH ROW
  EXECUTE FUNCTION update_property_analytics();

-- Comments for documentation
COMMENT ON TABLE analytics_events IS 'Raw analytics events for detailed tracking';
COMMENT ON TABLE analytics_daily_stats IS 'Pre-aggregated daily statistics for dashboard performance';
COMMENT ON TABLE property_analytics IS 'Per-property aggregated metrics';
