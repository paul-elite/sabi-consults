-- =====================================================================
--  Email, CRM and automation system
--  Safe to run more than once. Never drops tables or deletes data.
--  Run after setup.sql and migration-leads.sql.
--
--  Everything here is read and written only by server routes using the
--  service role key, so RLS is on with no public policies.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Leads: full sales pipeline and links to contacts
-- ---------------------------------------------------------------------
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check CHECK (status IN (
  'new', 'contacted', 'qualified', 'interested', 'inspection_scheduled', 'inspected',
  'negotiating', 'offer_submitted', 'converted', 'lost', 'dormant'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'buyer';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_follow_up_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS unassigned_alert_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_follow_up ON leads(next_follow_up_at) WHERE next_follow_up_at IS NOT NULL;

-- ---------------------------------------------------------------------
-- Contacts: one row per email address (the audience)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  kind TEXT NOT NULL DEFAULT 'buyer'
    CHECK (kind IN ('buyer', 'owner', 'landowner', 'developer', 'corporate', 'partner', 'other')),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  source TEXT,                  -- website, property_listing, newsletter, social, paid, referral, direct, guide, inspection, import, admin
  source_detail TEXT,           -- e.g. the guide slug or property id
  utm JSONB NOT NULL DEFAULT '{}',
  -- Marketing consent (promotional email). Transactional mail never depends on this.
  marketing_status TEXT NOT NULL DEFAULT 'none'
    CHECK (marketing_status IN ('none', 'pending', 'subscribed', 'unsubscribed')),
  consent_at TIMESTAMPTZ,
  consent_source TEXT,
  confirmed_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  -- Follow-ups about an enquiry the person made (not promotional). They can opt out.
  followups_opt_out BOOLEAN NOT NULL DEFAULT false,
  frequency TEXT NOT NULL DEFAULT 'instant' CHECK (frequency IN ('instant', 'weekly', 'important_only')),
  interests JSONB NOT NULL DEFAULT '{}', -- { types, districts, minBudget, maxBudget, bedrooms, topics }
  birthday DATE,
  customer_since DATE,
  -- Deliverability
  suppressed BOOLEAN NOT NULL DEFAULT false,
  suppression_reason TEXT,
  bounce_count INTEGER NOT NULL DEFAULT 0,
  last_emailed_at TIMESTAMPTZ,
  last_engaged_at TIMESTAMPTZ,
  reactivation_sent_at TIMESTAMPTZ,
  notes TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT contacts_lengths CHECK (char_length(email) <= 254 AND char_length(coalesce(name, '')) <= 160)
);
CREATE UNIQUE INDEX IF NOT EXISTS contacts_email_key ON contacts (lower(email));
CREATE INDEX IF NOT EXISTS idx_contacts_lead ON contacts(lead_id);
CREATE INDEX IF NOT EXISTS idx_contacts_marketing ON contacts(marketing_status) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_kind ON contacts(kind);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON contacts USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_contacts_created ON contacts(created_at DESC);
DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Every change to consent, kept for NDPA accountability
CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  action TEXT NOT NULL,          -- requested, confirmed, subscribed, unsubscribed, followups_off, followups_on, imported, admin_change
  source TEXT,
  ip TEXT,
  user_agent TEXT,
  actor TEXT,                    -- 'contact' or a staff name
  wording TEXT,                  -- the consent text that was shown
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_consent_contact ON consent_records(contact_id, created_at DESC);

-- ---------------------------------------------------------------------
-- Enquiries, inspections: references, types, assignment
-- ---------------------------------------------------------------------
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS reference TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS enquiry_type TEXT NOT NULL DEFAULT 'general';
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS budget TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS preferred_location TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS attribution JSONB NOT NULL DEFAULT '{}';
CREATE UNIQUE INDEX IF NOT EXISTS inquiries_reference_key ON inquiries(reference) WHERE reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inquiries_lead ON inquiries(lead_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_contact ON inquiries(contact_id);

ALTER TABLE viewing_requests ADD COLUMN IF NOT EXISTS reference TEXT;
ALTER TABLE viewing_requests ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES admin_users(id) ON DELETE SET NULL;
ALTER TABLE viewing_requests ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE viewing_requests ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE viewing_requests ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE viewing_requests ADD COLUMN IF NOT EXISTS feedback TEXT;
ALTER TABLE viewing_requests ADD COLUMN IF NOT EXISTS missed_alert_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS viewing_requests_reference_key ON viewing_requests(reference) WHERE reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_viewing_requests_assigned ON viewing_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_viewing_requests_confirmed ON viewing_requests(confirmed_datetime);

-- ---------------------------------------------------------------------
-- Pipeline history (who changed what, for agent follow-up reporting)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL,             -- status_change, assignment, note, email, replied, follow_up_set
  from_value TEXT,
  to_value TEXT,
  actor_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  actor_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities(lead_id, created_at DESC);

-- ---------------------------------------------------------------------
-- Transactions (between inspection and completed sale)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  stage TEXT NOT NULL DEFAULT 'interest' CHECK (stage IN (
    'interest', 'offer_submitted', 'offer_accepted', 'offer_rejected', 'negotiating',
    'documentation_requested', 'payment_instructions', 'payment_received', 'completed', 'cancelled')),
  offer_amount BIGINT,
  agreed_price BIGINT,
  amount_received BIGINT,
  assigned_to UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transactions_lead ON transactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_transactions_contact ON transactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_transactions_stage ON transactions(stage);
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS transaction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  note TEXT,
  amount BIGINT,
  customer_notified BOOLEAN NOT NULL DEFAULT false,
  actor_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  actor_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transaction_events_tx ON transaction_events(transaction_id, created_at DESC);

-- ---------------------------------------------------------------------
-- Referrals
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  referred_name TEXT NOT NULL,
  referred_email TEXT,
  referred_phone TEXT,
  referred_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'rewarded', 'invalid')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_contact_id);
DROP TRIGGER IF EXISTS update_referrals_updated_at ON referrals;
CREATE TRIGGER update_referrals_updated_at BEFORE UPDATE ON referrals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------
-- Property alerts and watches (saved properties for people with an email)
-- property_id set = watch one listing; null = match criteria
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS property_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  criteria JSONB NOT NULL DEFAULT '{}',  -- { types, districts, minBudget, maxBudget, bedrooms }
  active BOOLEAN NOT NULL DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS property_alerts_watch_key ON property_alerts(contact_id, property_id) WHERE property_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_property_alerts_active ON property_alerts(active, property_id);

-- ---------------------------------------------------------------------
-- Downloadable guides (lead magnets). Shown only once a file is attached.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lead_magnets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  topic TEXT,
  active BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  request_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO lead_magnets (slug, title, description, topic, sort_order) VALUES
  ('abuja-property-buying-guide', 'Abuja Property Buying Guide', 'How buying a home or plot in Abuja works, step by step.', 'buying', 1),
  ('first-time-buyer-checklist', 'First-Time Home Buyer''s Checklist', 'What to prepare and check before your first purchase.', 'buying', 2),
  ('land-acquisition-guide', 'Land Acquisition and Documentation Guide', 'Titles, surveys and the paperwork that protects a land purchase.', 'land', 3),
  ('abuja-investment-guide', 'Abuja Real Estate Investment Guide', 'Where and how people invest in Abuja property.', 'investment', 4),
  ('property-inspection-checklist', 'Property Inspection Checklist', 'What to look at when you inspect a property.', 'buying', 5),
  ('nigerian-property-documentation', 'Understanding Property Documentation in Nigeria', 'C of O, R of O, deeds and what each one means.', 'documentation', 6)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------
-- Templates. System templates are seeded by the app; admins edit or copy them.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_templates (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,          -- enquiry, inspection, nurture, property, newsletter, transaction, retention, referral, b2b, subscription, internal
  audience TEXT NOT NULL DEFAULT 'transactional' CHECK (audience IN ('transactional', 'service', 'marketing', 'internal')),
  subject TEXT NOT NULL,
  preheader TEXT,
  body TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  default_version INTEGER NOT NULL DEFAULT 1,
  edited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------
-- Campaigns
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'newsletter',  -- new_property, newsletter, investment, promotion, seasonal, owner_acquisition, retention
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled')),
  template_key TEXT NOT NULL DEFAULT 'newsletter',
  subject TEXT NOT NULL DEFAULT '',
  preheader TEXT,
  body TEXT NOT NULL DEFAULT '',
  property_ids UUID[] NOT NULL DEFAULT '{}',
  audience JSONB NOT NULL DEFAULT '{}',
  exclude JSONB NOT NULL DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  expand_cursor TEXT,               -- last contact id queued, so expansion resumes after a restart
  recipient_count INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status, scheduled_at);
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------
-- Automations: trigger -> conditions -> steps (stored in order as JSON)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE,                  -- set for the built-in workflows
  name TEXT NOT NULL,
  description TEXT,
  trigger TEXT NOT NULL,            -- an app event type, e.g. inquiry.created
  conditions JSONB NOT NULL DEFAULT '[]',
  steps JSONB NOT NULL DEFAULT '[]',
  exit_on TEXT[] NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  allow_reenrol BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_automations_trigger ON automations(trigger) WHERE active;
DROP TRIGGER IF EXISTS update_automations_updated_at ON automations;
CREATE TRIGGER update_automations_updated_at BEFORE UPDATE ON automations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  subject_key TEXT NOT NULL,         -- what this run is about; one run per automation per subject
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  event_id UUID,
  context JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'exited', 'failed')),
  step_index INTEGER NOT NULL DEFAULT 0,
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_until TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  exit_reason TEXT,
  enrolled_by TEXT NOT NULL DEFAULT 'trigger',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  UNIQUE (automation_id, subject_key)
);
CREATE INDEX IF NOT EXISTS idx_automation_runs_due ON automation_runs(next_run_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_automation_runs_contact ON automation_runs(contact_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_lead ON automation_runs(lead_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_automation ON automation_runs(automation_id, started_at DESC);

CREATE TABLE IF NOT EXISTS automation_step_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES automation_runs(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL,
  step_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('done', 'skipped', 'failed', 'stopped')),
  detail TEXT,
  message_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (run_id, step_index)
);

-- ---------------------------------------------------------------------
-- Application events (the event bus). dedupe_key stops double processing.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  dedupe_key TEXT NOT NULL UNIQUE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  error TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_app_events_pending ON app_events(created_at) WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_app_events_type ON app_events(type, created_at DESC);

-- ---------------------------------------------------------------------
-- Outgoing email (one row per message) and provider events
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  to_email TEXT NOT NULL,
  to_name TEXT,
  category TEXT NOT NULL CHECK (category IN ('transactional', 'service', 'marketing', 'internal')),
  template_key TEXT NOT NULL,
  subject TEXT,
  context JSONB NOT NULL DEFAULT '{}',
  html TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued', 'sending', 'sent', 'delivered', 'bounced', 'complained', 'failed', 'cancelled', 'skipped')),
  status_reason TEXT,
  provider TEXT,
  provider_id TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  send_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  open_count INTEGER NOT NULL DEFAULT 0,
  clicked_at TIMESTAMPTZ,
  click_count INTEGER NOT NULL DEFAULT 0,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  automation_id UUID REFERENCES automations(id) ON DELETE SET NULL,
  run_id UUID REFERENCES automation_runs(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  viewing_id UUID REFERENCES viewing_requests(id) ON DELETE SET NULL,
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_messages_due ON email_messages(send_after) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_email_messages_contact ON email_messages(contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_messages_lead ON email_messages(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_messages_campaign ON email_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_automation ON email_messages(automation_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_viewing ON email_messages(viewing_id) WHERE viewing_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_messages_provider ON email_messages(provider_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_created ON email_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_messages_transaction ON email_messages(transaction_id) WHERE transaction_id IS NOT NULL;
DROP TRIGGER IF EXISTS update_email_messages_updated_at ON email_messages;
CREATE TRIGGER update_email_messages_updated_at BEFORE UPDATE ON email_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES email_messages(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  type TEXT NOT NULL,              -- sent, delivered, delivery_delayed, bounced, complained, opened, clicked, failed
  provider_event_id TEXT UNIQUE,   -- webhook id (or click id), so a repeated webhook is stored once
  url TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_events_message ON email_events(message_id);
CREATE INDEX IF NOT EXISTS idx_email_events_type ON email_events(type, occurred_at DESC);

-- What the business got from email: direct (came through a tracked click) or assisted
CREATE TABLE IF NOT EXISTS email_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversion_type TEXT NOT NULL CHECK (conversion_type IN ('lead', 'enquiry', 'inspection', 'transaction')),
  entity_id UUID NOT NULL,
  model TEXT NOT NULL CHECK (model IN ('direct', 'assisted')),
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  message_id UUID REFERENCES email_messages(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  automation_id UUID REFERENCES automations(id) ON DELETE SET NULL,
  template_key TEXT,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  value BIGINT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (conversion_type, entity_id, model)
);
CREATE INDEX IF NOT EXISTS idx_email_attr_campaign ON email_attributions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_attr_time ON email_attributions(occurred_at DESC);

-- Background job heartbeat and daily-job guard
CREATE TABLE IF NOT EXISTS worker_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job TEXT NOT NULL,
  run_key TEXT UNIQUE,             -- e.g. daily:2026-11-23 so a daily job runs once
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  ok BOOLEAN,
  stats JSONB NOT NULL DEFAULT '{}',
  error TEXT
);
CREATE INDEX IF NOT EXISTS idx_worker_runs_started ON worker_runs(job, started_at DESC);

-- ---------------------------------------------------------------------
-- Configurable lead scoring
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scoring_rules (
  signal TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  points INTEGER NOT NULL,
  max_points INTEGER,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0
);
INSERT INTO scoring_rules (signal, label, points, max_points, sort_order) VALUES
  ('property_view', 'Each property viewed', 1, 10, 1),
  ('multiple_properties', 'Viewed 3 or more different properties', 4, NULL, 2),
  ('contact_click', 'Call, WhatsApp or email click', 4, 20, 3),
  ('property_saved', 'Each property saved or watched', 3, 15, 4),
  ('return_visit', 'Came back more than once', 3, NULL, 5),
  ('enquiry', 'Each enquiry submitted', 8, 24, 6),
  ('consultation', 'Asked for a consultation or valuation', 10, NULL, 7),
  ('inspection_booked', 'Each inspection booked', 15, 30, 8),
  ('inspection_completed', 'Each inspection completed', 15, 30, 9),
  ('email_click', 'Each email link clicked', 2, 10, 10),
  ('offer_submitted', 'Offer submitted', 25, NULL, 11),
  ('has_email', 'Gave an email address', 2, NULL, 12)
ON CONFLICT (signal) DO NOTHING;

CREATE OR REPLACE FUNCTION calculate_lead_score(p_lead_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_lead leads%ROWTYPE;
  v_score INTEGER := 0;
  v_breakdown JSONB := '{}';
  r RECORD;
  v_count INTEGER;
  v_points INTEGER;
BEGIN
  SELECT * INTO v_lead FROM leads WHERE id = p_lead_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  FOR r IN SELECT * FROM scoring_rules WHERE active ORDER BY sort_order LOOP
    v_count := CASE r.signal
      WHEN 'property_view' THEN COALESCE(v_lead.total_property_views, 0)
      WHEN 'multiple_properties' THEN CASE WHEN COALESCE(array_length(v_lead.properties_viewed, 1), 0) >= 3 THEN 1 ELSE 0 END
      WHEN 'contact_click' THEN COALESCE(v_lead.total_contact_clicks, 0)
      WHEN 'property_saved' THEN COALESCE(array_length(v_lead.saved_properties, 1), 0)
        + (SELECT COUNT(*) FROM property_alerts a JOIN contacts c ON c.id = a.contact_id WHERE c.lead_id = p_lead_id AND a.property_id IS NOT NULL)::INT
      WHEN 'return_visit' THEN CASE WHEN COALESCE(v_lead.total_visits, 1) > 1 THEN 1 ELSE 0 END
      WHEN 'enquiry' THEN (SELECT COUNT(*) FROM inquiries WHERE lead_id = p_lead_id)::INT
      WHEN 'consultation' THEN CASE WHEN EXISTS (SELECT 1 FROM inquiries WHERE lead_id = p_lead_id AND enquiry_type IN ('consultation', 'valuation')) THEN 1 ELSE 0 END
      WHEN 'inspection_booked' THEN (SELECT COUNT(*) FROM viewing_requests WHERE lead_id = p_lead_id AND status <> 'cancelled')::INT
      WHEN 'inspection_completed' THEN (SELECT COUNT(*) FROM viewing_requests WHERE lead_id = p_lead_id AND status = 'completed')::INT
      WHEN 'email_click' THEN (SELECT COUNT(*) FROM email_messages WHERE lead_id = p_lead_id AND clicked_at IS NOT NULL)::INT
        + (SELECT COUNT(*) FROM email_messages m JOIN contacts c ON c.id = m.contact_id WHERE c.lead_id = p_lead_id AND m.lead_id IS NULL AND m.clicked_at IS NOT NULL)::INT
      WHEN 'offer_submitted' THEN CASE WHEN EXISTS (SELECT 1 FROM transactions WHERE lead_id = p_lead_id AND stage NOT IN ('interest', 'cancelled')) THEN 1 ELSE 0 END
      WHEN 'has_email' THEN CASE WHEN COALESCE(v_lead.email, '') <> '' THEN 1 ELSE 0 END
      ELSE 0
    END;
    v_points := v_count * r.points;
    IF r.max_points IS NOT NULL THEN v_points := LEAST(v_points, r.max_points); END IF;
    IF v_points <> 0 THEN
      v_score := v_score + v_points;
      v_breakdown := v_breakdown || jsonb_build_object(r.signal, v_points);
    END IF;
  END LOOP;

  UPDATE leads SET
    score = v_score,
    score_breakdown = v_breakdown,
    quality = CASE WHEN v_score >= 30 THEN 'hot' WHEN v_score >= 12 THEN 'warm' ELSE 'cold' END
  WHERE id = p_lead_id;
  RETURN v_score;
END;
$$;

-- ---------------------------------------------------------------------
-- Work queues. Each claim uses SKIP LOCKED, so two workers running at the
-- same time never take the same item; anything stuck is released after a
-- timeout so a crashed worker's items are picked up again.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION claim_email_messages(p_limit INTEGER)
RETURNS SETOF email_messages
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE email_messages SET status = 'queued', locked_at = NULL
   WHERE status = 'sending' AND locked_at < NOW() - INTERVAL '10 minutes';
  RETURN QUERY
  UPDATE email_messages m SET status = 'sending', locked_at = NOW(), attempts = m.attempts + 1
   WHERE m.id IN (
     SELECT id FROM email_messages
      WHERE status = 'queued' AND send_after <= NOW()
      ORDER BY CASE category WHEN 'transactional' THEN 0 WHEN 'internal' THEN 1 WHEN 'service' THEN 2 ELSE 3 END, send_after
      LIMIT p_limit
      FOR UPDATE SKIP LOCKED)
  RETURNING m.*;
END;
$$;

CREATE OR REPLACE FUNCTION claim_app_events(p_limit INTEGER)
RETURNS SETOF app_events
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE app_events e SET status = 'processing', locked_until = NOW() + INTERVAL '5 minutes', attempts = e.attempts + 1
   WHERE e.id IN (
     SELECT id FROM app_events
      WHERE (status = 'pending' OR (status = 'processing' AND locked_until < NOW()))
        AND attempts < 5
      ORDER BY created_at
      LIMIT p_limit
      FOR UPDATE SKIP LOCKED)
  RETURNING e.*;
END;
$$;

CREATE OR REPLACE FUNCTION claim_automation_runs(p_limit INTEGER)
RETURNS SETOF automation_runs
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE automation_runs r SET locked_until = NOW() + INTERVAL '5 minutes'
   WHERE r.id IN (
     SELECT id FROM automation_runs
      WHERE status = 'active' AND next_run_at <= NOW()
        AND (locked_until IS NULL OR locked_until < NOW())
      ORDER BY next_run_at
      LIMIT p_limit
      FOR UPDATE SKIP LOCKED)
  RETURNING r.*;
END;
$$;

-- ---------------------------------------------------------------------
-- Analytics in one round trip. Opens are reported but flagged as
-- unreliable in the UI; clicks and conversions are the business signals.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION email_analytics(p_from TIMESTAMPTZ, p_to TIMESTAMPTZ, p_campaign UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH m AS (
    SELECT * FROM email_messages
     WHERE created_at >= p_from AND created_at < p_to
       AND category <> 'internal'
       AND (p_campaign IS NULL OR campaign_id = p_campaign)
  ),
  sent AS (SELECT * FROM m WHERE status IN ('sent', 'delivered', 'bounced', 'complained'))
  SELECT jsonb_build_object(
    'totals', jsonb_build_object(
      'queued', (SELECT COUNT(*) FROM m WHERE status IN ('queued', 'sending')),
      'sent', (SELECT COUNT(*) FROM sent),
      'delivered', (SELECT COUNT(*) FROM m WHERE delivered_at IS NOT NULL OR status = 'delivered'),
      'bounced', (SELECT COUNT(*) FROM m WHERE status = 'bounced'),
      'complained', (SELECT COUNT(*) FROM m WHERE status = 'complained'),
      'failed', (SELECT COUNT(*) FROM m WHERE status = 'failed'),
      'skipped', (SELECT COUNT(*) FROM m WHERE status IN ('skipped', 'cancelled')),
      'opened', (SELECT COUNT(*) FROM sent WHERE opened_at IS NOT NULL),
      'clicked', (SELECT COUNT(*) FROM sent WHERE clicked_at IS NOT NULL),
      'marketing_sent', (SELECT COUNT(*) FROM sent WHERE category = 'marketing'),
      'unsubscribes', (SELECT COUNT(*) FROM consent_records WHERE action = 'unsubscribed' AND created_at >= p_from AND created_at < p_to),
      'new_subscribers', (SELECT COUNT(*) FROM consent_records WHERE action IN ('confirmed', 'subscribed') AND created_at >= p_from AND created_at < p_to),
      'new_contacts', (SELECT COUNT(*) FROM contacts WHERE created_at >= p_from AND created_at < p_to),
      'new_leads', (SELECT COUNT(*) FROM leads WHERE created_at >= p_from AND created_at < p_to)
    ),
    'conversions', (
      SELECT COALESCE(jsonb_object_agg(k, v), '{}') FROM (
        SELECT conversion_type || '_' || model AS k, COUNT(*) AS v FROM email_attributions
         WHERE occurred_at >= p_from AND occurred_at < p_to AND (p_campaign IS NULL OR campaign_id = p_campaign)
         GROUP BY 1) x),
    'transaction_value', (
      SELECT jsonb_build_object(
        'direct', COALESCE(SUM(value) FILTER (WHERE model = 'direct'), 0),
        'assisted', COALESCE(SUM(value) FILTER (WHERE model = 'assisted'), 0))
        FROM email_attributions
       WHERE conversion_type = 'transaction' AND occurred_at >= p_from AND occurred_at < p_to
         AND (p_campaign IS NULL OR campaign_id = p_campaign)),
    'daily', (
      SELECT COALESCE(jsonb_agg(d ORDER BY d->>'day'), '[]') FROM (
        SELECT jsonb_build_object('day', to_char(date_trunc('day', created_at), 'YYYY-MM-DD'),
          'sent', COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'bounced', 'complained')),
          'clicked', COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)) AS d
          FROM m GROUP BY date_trunc('day', created_at)) y),
    'subscriber_growth', (
      SELECT COALESCE(jsonb_agg(g ORDER BY g->>'day'), '[]') FROM (
        SELECT jsonb_build_object('day', to_char(date_trunc('day', created_at), 'YYYY-MM-DD'),
          'joined', COUNT(*) FILTER (WHERE action IN ('confirmed', 'subscribed')),
          'left', COUNT(*) FILTER (WHERE action = 'unsubscribed')) AS g
          FROM consent_records WHERE created_at >= p_from AND created_at < p_to
         GROUP BY date_trunc('day', created_at)) z),
    'campaigns', (
      SELECT COALESCE(jsonb_agg(c ORDER BY c->>'started_at' DESC NULLS LAST), '[]') FROM (
        SELECT jsonb_build_object(
          'id', c.id, 'name', c.name, 'type', c.type, 'status', c.status, 'started_at', c.started_at,
          'sent', COUNT(e.id) FILTER (WHERE e.status IN ('sent', 'delivered', 'bounced', 'complained')),
          'delivered', COUNT(e.id) FILTER (WHERE e.delivered_at IS NOT NULL),
          'bounced', COUNT(e.id) FILTER (WHERE e.status = 'bounced'),
          'opened', COUNT(e.id) FILTER (WHERE e.opened_at IS NOT NULL),
          'clicked', COUNT(e.id) FILTER (WHERE e.clicked_at IS NOT NULL),
          'enquiries', (SELECT COUNT(*) FROM email_attributions a WHERE a.campaign_id = c.id AND a.conversion_type IN ('enquiry', 'lead')),
          'inspections', (SELECT COUNT(*) FROM email_attributions a WHERE a.campaign_id = c.id AND a.conversion_type = 'inspection'),
          'transactions_direct', (SELECT COUNT(*) FROM email_attributions a WHERE a.campaign_id = c.id AND a.conversion_type = 'transaction' AND a.model = 'direct'),
          'transactions_assisted', (SELECT COUNT(*) FROM email_attributions a WHERE a.campaign_id = c.id AND a.conversion_type = 'transaction' AND a.model = 'assisted')
        ) AS c
          FROM campaigns c LEFT JOIN email_messages e ON e.campaign_id = c.id
         WHERE (p_campaign IS NULL OR c.id = p_campaign)
           AND (c.started_at IS NULL OR (c.started_at >= p_from AND c.started_at < p_to))
           AND c.status IN ('sending', 'sent', 'paused', 'cancelled')
         GROUP BY c.id) w),
    'templates', (
      SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'clicked')::INT DESC, (t->>'sent')::INT DESC), '[]') FROM (
        SELECT jsonb_build_object('key', template_key,
          'sent', COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'bounced', 'complained')),
          'clicked', COUNT(*) FILTER (WHERE clicked_at IS NOT NULL),
          'opened', COUNT(*) FILTER (WHERE opened_at IS NOT NULL)) AS t
          FROM m GROUP BY template_key) v),
    'automations', (
      SELECT COALESCE(jsonb_agg(a), '[]') FROM (
        SELECT jsonb_build_object('id', au.id, 'name', au.name,
          'sent', (SELECT COUNT(*) FROM m WHERE m.automation_id = au.id AND m.status IN ('sent', 'delivered', 'bounced', 'complained')),
          'clicked', (SELECT COUNT(*) FROM m WHERE m.automation_id = au.id AND m.clicked_at IS NOT NULL),
          'enquiries', (SELECT COUNT(*) FROM email_attributions x WHERE x.automation_id = au.id AND x.conversion_type IN ('enquiry', 'lead') AND x.occurred_at >= p_from AND x.occurred_at < p_to),
          'inspections', (SELECT COUNT(*) FROM email_attributions x WHERE x.automation_id = au.id AND x.conversion_type = 'inspection' AND x.occurred_at >= p_from AND x.occurred_at < p_to),
          'transactions_direct', (SELECT COUNT(*) FROM email_attributions x WHERE x.automation_id = au.id AND x.conversion_type = 'transaction' AND x.model = 'direct' AND x.occurred_at >= p_from AND x.occurred_at < p_to),
          'transactions_assisted', (SELECT COUNT(*) FROM email_attributions x WHERE x.automation_id = au.id AND x.conversion_type = 'transaction' AND x.model = 'assisted' AND x.occurred_at >= p_from AND x.occurred_at < p_to)
        ) AS a FROM automations au) u),
    'properties', (
      SELECT COALESCE(jsonb_agg(p ORDER BY (p->>'clicks')::INT DESC), '[]') FROM (
        SELECT jsonb_build_object('id', pr.id, 'title', pr.title, 'district', pr.district,
          'emails', COUNT(*), 'clicks', COUNT(*) FILTER (WHERE m.clicked_at IS NOT NULL)) AS p
          FROM m JOIN properties pr ON pr.id = m.property_id
         GROUP BY pr.id LIMIT 20) q),
    'sources', (
      SELECT COALESCE(jsonb_agg(s ORDER BY (s->>'leads')::INT DESC), '[]') FROM (
        SELECT jsonb_build_object('source', COALESCE(l.source, 'unknown'),
          'leads', COUNT(*),
          'inspections', COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM viewing_requests v WHERE v.lead_id = l.id AND v.status <> 'cancelled')),
          'converted', COUNT(*) FILTER (WHERE l.status = 'converted'),
          'avg_score', ROUND(AVG(l.score))) AS s
          FROM leads l WHERE l.created_at >= p_from AND l.created_at < p_to
         GROUP BY COALESCE(l.source, 'unknown')) r),
    'segments', (
      SELECT COALESCE(jsonb_agg(s ORDER BY (s->>'contacts')::INT DESC), '[]') FROM (
        SELECT jsonb_build_object('kind', c.kind,
          'contacts', COUNT(DISTINCT c.id),
          'subscribed', COUNT(DISTINCT c.id) FILTER (WHERE c.marketing_status = 'subscribed'),
          'clicked', COUNT(DISTINCT c.id) FILTER (WHERE EXISTS (SELECT 1 FROM m WHERE m.contact_id = c.id AND m.clicked_at IS NOT NULL)),
          'converted', COUNT(DISTINCT c.id) FILTER (WHERE EXISTS (SELECT 1 FROM email_attributions a WHERE a.contact_id = c.id AND a.occurred_at >= p_from AND a.occurred_at < p_to))) AS s
          FROM contacts c WHERE c.archived_at IS NULL GROUP BY c.kind) t2),
    'agents', (
      SELECT COALESCE(jsonb_agg(ag ORDER BY (ag->>'leads')::INT DESC), '[]') FROM (
        SELECT jsonb_build_object('id', u.id, 'name', u.name,
          'leads', COUNT(l.id),
          'contacted', COUNT(l.id) FILTER (WHERE l.last_contacted_at IS NOT NULL OR l.status NOT IN ('new')),
          'median_hours_to_contact', ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (
              (SELECT MIN(a.created_at) FROM lead_activities a WHERE a.lead_id = l.id AND a.type IN ('status_change', 'email') AND a.actor_id = u.id)
              - COALESCE(l.assigned_at, l.created_at))) / 3600))::NUMERIC, 1),
          'inspections', COUNT(l.id) FILTER (WHERE l.status IN ('inspection_scheduled', 'inspected', 'negotiating', 'offer_submitted', 'converted')),
          'converted', COUNT(l.id) FILTER (WHERE l.status = 'converted')) AS ag
          FROM admin_users u JOIN leads l ON l.assigned_to = u.id
         WHERE l.created_at >= p_from AND l.created_at < p_to
         GROUP BY u.id) t3)
  );
$$;

-- ---------------------------------------------------------------------
-- Settings defaults (editable at /admin/email/settings)
-- ---------------------------------------------------------------------
INSERT INTO site_settings (key, value) VALUES
  ('email_sender_name', 'Sabi Consults'),
  ('email_sender_address', ''),
  ('email_reply_to', ''),
  ('email_double_opt_in', 'true'),
  ('email_batch_size', '40'),
  ('email_daily_limit', '2000'),
  ('email_notify_recipients', ''),
  ('email_unassigned_hours', '2'),
  ('email_reminder_hours', '24'),
  ('email_dayof_hours', '3'),
  ('email_reactivation_days', '120'),
  ('email_tracking_opens', 'true')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------
-- Row level security: service role only
-- ---------------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['contacts', 'consent_records', 'lead_activities', 'transactions', 'transaction_events',
    'referrals', 'property_alerts', 'lead_magnets', 'email_templates', 'campaigns', 'automations', 'automation_runs',
    'automation_step_logs', 'app_events', 'email_messages', 'email_events', 'email_attributions', 'worker_runs', 'scoring_rules']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

REVOKE EXECUTE ON FUNCTION claim_email_messages(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION claim_app_events(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION claim_automation_runs(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION email_analytics(TIMESTAMPTZ, TIMESTAMPTZ, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION calculate_lead_score(UUID) FROM PUBLIC, anon, authenticated;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'link_visitor_to_lead') THEN
    REVOKE EXECUTE ON FUNCTION link_visitor_to_lead(UUID, TEXT) FROM PUBLIC, anon, authenticated;
  END IF;
END $$;
