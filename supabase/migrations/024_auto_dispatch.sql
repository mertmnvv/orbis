-- ============================================================
-- 024_auto_dispatch.sql
-- Restoran bazlı otomatik kurye atama (auto-dispatch) özelliği:
--   - restaurants tablosuna auto_dispatch_enabled kolonu eklenir
--   - Varsayılan: false (manuel mod)
-- ============================================================

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS auto_dispatch_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN restaurants.auto_dispatch_enabled IS
  'true ise yeni "pending" siparişler uygun en yakın kuryeye otomatik atanır.';
