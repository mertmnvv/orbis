-- ============================================================
-- 002_delivery_zones_and_pickup_coords.sql
-- Teslimat bölgeleri tablosu + siparişlere teslim alım koordinatları
-- ============================================================

-- ============================================================
-- delivery_zones TABLOSU
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_zones (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  polygon    jsonb       NOT NULL,
  color      text        DEFAULT '#f97316',
  is_active  boolean     DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;

-- Restoran sahibi tüm CRUD işlemlerini yapabilir
CREATE POLICY "delivery_zones: restaurant owner all"
  ON delivery_zones FOR ALL
  USING (
    EXISTS (SELECT 1 FROM restaurants r WHERE r.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM restaurants r WHERE r.user_id = auth.uid())
  );

-- ============================================================
-- orders TABLOSUNA KONUM SÜTUNLARI
-- ============================================================
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS picked_up_lat double precision,
  ADD COLUMN IF NOT EXISTS picked_up_lng double precision;
