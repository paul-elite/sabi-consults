-- Security hardening. Safe to run more than once.
--
-- The app reads and writes these tables only through server routes that use
-- the service role key, which bypasses row level security. Turning RLS on with
-- no policies means the public anon key (shipped to every browser) can't read
-- or change them directly through the Supabase REST API.

ALTER TABLE IF EXISTS analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS analytics_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS property_analytics ENABLE ROW LEVEL SECURITY;

-- Anonymous inserts aren't used by the app (writes go through the API), so
-- close them rather than leave an unthrottled spam path.
DO $$
BEGIN
  IF to_regclass('public.saved_properties') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Allow insert saved_properties" ON saved_properties;
  END IF;
  IF to_regclass('public.popup_dismissals') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Allow insert popup_dismissals" ON popup_dismissals;
  END IF;
END $$;

-- Pin search_path so a function can't be tricked into resolving a same-named
-- object from another schema. update_updated_at_column is left alone: it is
-- already set to an empty search_path, which is stricter.
DO $$
DECLARE f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.update_property_analytics()',
    'public.calculate_lead_score(uuid)',
    'public.link_visitor_to_lead(uuid, text)'
  ] LOOP
    IF to_regprocedure(f) IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', f);
    END IF;
  END LOOP;
END $$;
