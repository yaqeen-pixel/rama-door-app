-- Hourly Instagram sync: calls the sync-instagram Edge Function at minute 17 of every hour.
-- The Authorization header uses the project's public anon key (the function itself uses the
-- service role key internally and ignores runs less than 10 minutes apart).
create extension if not exists pg_net;
create extension if not exists pg_cron;

select cron.schedule(
  'sync-instagram-hourly',
  '17 * * * *',
  $$select net.http_post(
      url := 'https://gzuoztakfmpaugtgmctd.supabase.co/functions/v1/sync-instagram',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer <ANON_KEY>'),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    );$$
);
-- Replace <ANON_KEY> with the project's anon key if you recreate this on another project.
