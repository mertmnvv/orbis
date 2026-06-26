-- ============================================================
-- 004_cron_cleanup.sql
-- pg_cron ile cleanup-locations Edge Function'ını günlük tetikle.
-- pg_cron ve pg_net extension'larının etkin olması gerekir.
-- (Supabase Pro/Team planlarında mevcuttur.)
-- ============================================================

-- pg_net: Edge Function'a HTTP isteği gönderir
create extension if not exists pg_net;

-- Cron job: her gece 03:00 UTC'de çalışır
select cron.schedule(
  'cleanup-courier-locations',   -- job adı (benzersiz olmalı)
  '0 3 * * *',                   -- cron ifadesi: günlük 03:00 UTC
  $$
    select net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/cleanup-locations',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body    := '{}'::jsonb
    );
  $$
);

-- Not: Supabase Dashboard → Database → Extensions'dan pg_net ve pg_cron
-- etkinleştirildikten sonra bu migration çalıştırılmalıdır.
-- Alternatif olarak Supabase Dashboard → Edge Functions → Schedules kullanılabilir.
