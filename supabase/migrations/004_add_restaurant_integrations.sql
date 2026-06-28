-- ============================================================
-- 004_add_restaurant_integrations.sql
-- ============================================================
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS integrations jsonb NOT NULL DEFAULT '{}'::jsonb;
