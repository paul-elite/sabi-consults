-- =====================================================================
--  Runs the email worker every minute from the database (pg_cron + pg_net).
--
--  Before running, store the worker secret (the same value as CRON_SECRET
--  in Vercel) in Supabase Vault. Do this in the SQL editor, not in git:
--
--    select vault.create_secret('<CRON_SECRET value>', 'email_worker_secret');
--
--  and the site address if it isn't https://sabiconsults.com.ng:
--
--    select vault.create_secret('https://your-domain', 'email_worker_url');
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.call_email_worker()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_secret TEXT;
  v_url TEXT;
BEGIN
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'email_worker_secret' LIMIT 1;
  IF v_secret IS NULL THEN RETURN; END IF;
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'email_worker_url' LIMIT 1;
  PERFORM net.http_post(
    url := COALESCE(v_url, 'https://sabiconsults.com.ng') || '/api/email/worker',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret, 'Content-Type', 'application/json', 'x-worker-source', 'pg_cron'),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.call_email_worker() FROM PUBLIC, anon, authenticated;

-- Replace any previous schedule with the same name
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'email-worker';
SELECT cron.schedule('email-worker', '* * * * *', 'SELECT public.call_email_worker()');

-- Keep pg_net's response log small
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'email-worker-cleanup';
SELECT cron.schedule('email-worker-cleanup', '17 3 * * *', $$DELETE FROM net._http_response WHERE created < NOW() - INTERVAL '2 days'$$);
