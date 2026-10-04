-- One row per page load, written by src/proxy.ts on the server so ad blockers
-- and visitors who leave before scripts run are still counted.
-- No IP addresses are stored; visitor_id is a random first-party cookie.

CREATE TABLE IF NOT EXISTS site_visits (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  visitor_id TEXT,
  path TEXT NOT NULL,
  referrer TEXT,
  referrer_host TEXT,
  source TEXT NOT NULL,          -- Google, Instagram, WhatsApp, Direct, example.com ...
  medium TEXT NOT NULL,          -- search, social, messaging, referral, campaign, direct, internal
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  country TEXT,                  -- ISO 3166-1 alpha-2
  region TEXT,
  city TEXT,
  device TEXT,                   -- mobile, tablet, desktop
  browser TEXT,
  os TEXT,
  is_bot BOOLEAN NOT NULL DEFAULT false,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS site_visits_created_at_idx ON site_visits (created_at DESC);
CREATE INDEX IF NOT EXISTS site_visits_visitor_idx ON site_visits (visitor_id, created_at DESC);

-- Server-only: the service role bypasses RLS; the public anon key gets nothing
ALTER TABLE site_visits ENABLE ROW LEVEL SECURITY;
