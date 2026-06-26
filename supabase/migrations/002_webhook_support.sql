-- ============================================================
-- 002_webhook_support.sql
-- PostGIS kurye ataması, platform eşleştirme, webhook loglama iyileştirmeleri
-- ============================================================

-- PostGIS (kurye yakınlık sorguları için)
CREATE EXTENSION IF NOT EXISTS postgis;

-- ----------------------------------------------------------------
-- platform_webhooks: hata sütunu + nullable restaurant_id
-- (başarısız webhook'lar restaurant bilinmeden loglanabilsin)
-- ----------------------------------------------------------------
ALTER TABLE platform_webhooks ADD COLUMN IF NOT EXISTS error text;
ALTER TABLE platform_webhooks ALTER COLUMN restaurant_id DROP NOT NULL;

-- ----------------------------------------------------------------
-- couriers: FCM token + PostGIS konum kolonu
-- ----------------------------------------------------------------
ALTER TABLE couriers ADD COLUMN IF NOT EXISTS fcm_token text;
ALTER TABLE couriers ADD COLUMN IF NOT EXISTS location geography(Point, 4326);

-- Mevcut numeric lat/lng'yi geography kolonuna taşı
UPDATE couriers
SET location = ST_SetSRID(
  ST_MakePoint(current_lng::float8, current_lat::float8),
  4326
)::geography
WHERE current_lat IS NOT NULL
  AND current_lng IS NOT NULL;

-- Kurye konumu için spatial index
CREATE INDEX IF NOT EXISTS idx_couriers_location
  ON couriers USING GIST (location);

-- ----------------------------------------------------------------
-- orders: sipariş kalemleri (platform'dan gelen ham veriler)
-- ----------------------------------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS items jsonb;

-- ----------------------------------------------------------------
-- restaurant_platforms: platform ↔ restoran eşleştirme + webhook secret
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS restaurant_platforms (
  id                     uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id          uuid          NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  platform               platform_type NOT NULL,
  platform_restaurant_id text          NOT NULL,
  webhook_secret         text          NOT NULL,
  created_at             timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (platform, platform_restaurant_id)
);

CREATE INDEX IF NOT EXISTS idx_restaurant_platforms_lookup
  ON restaurant_platforms (platform, platform_restaurant_id);

ALTER TABLE restaurant_platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurant_platforms: owner can read"
  ON restaurant_platforms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM restaurants r
      WHERE r.id = restaurant_platforms.restaurant_id
        AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "restaurant_platforms: owner can insert"
  ON restaurant_platforms FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM restaurants r
      WHERE r.id = restaurant_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "restaurant_platforms: owner can update"
  ON restaurant_platforms FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM restaurants r
      WHERE r.id = restaurant_platforms.restaurant_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "restaurant_platforms: owner can delete"
  ON restaurant_platforms FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM restaurants r
      WHERE r.id = restaurant_platforms.restaurant_id AND r.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------
-- find_nearest_courier: PostGIS <-> operatörüyle en yakın müsait kurye
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION find_nearest_courier(
  order_lat float8,
  order_lng float8
)
RETURNS TABLE (
  id          uuid,
  name        text,
  fcm_token   text,
  current_lat numeric,
  current_lng numeric
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    c.id,
    c.name,
    c.fcm_token,
    c.current_lat,
    c.current_lng
  FROM couriers c
  WHERE c.is_active = true
    AND c.location IS NOT NULL
    AND c.id NOT IN (
      SELECT o.courier_id
      FROM orders o
      WHERE o.status IN ('assigned', 'picked_up')
        AND o.courier_id IS NOT NULL
    )
  ORDER BY c.location <-> ST_SetSRID(ST_MakePoint(order_lng, order_lat), 4326)::geography
  LIMIT 1;
$$;
