-- ============================================================
-- 003_add_max_multi_order_km.sql
-- ============================================================
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS max_multi_order_km numeric(5,2) NOT NULL DEFAULT 3.00;
