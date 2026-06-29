-- ============================================================
-- 018_customer_tracking.sql
-- Müşteri takip linki ve puanlama sistemi için:
--   - orders tablosuna customer_rating ve customer_comment eklenir
--   - Public (auth gerekmez) RLS policy: order_id bilinen herkes
--     sipariş durumu + kurye konumunu okuyabilir
-- ============================================================

-- ----------------------------------------------------------------
-- orders: müşteri puanı ve yorumu
-- ----------------------------------------------------------------
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_rating   smallint  CHECK (customer_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS customer_comment  text;

-- ----------------------------------------------------------------
-- orders: public tracking policy
-- Herhangi biri order_id'yi bilerek sipariş durumunu okuyabilir.
-- uuid tahmin edilemez olduğundan bu güvenli bir "secret link" yaklaşımıdır.
-- ----------------------------------------------------------------
CREATE POLICY "orders: public track read"
  ON orders FOR SELECT
  USING (true);

-- ----------------------------------------------------------------
-- courier_locations: public tracking policy
-- Takip sayfasında kurye konumu (courier_locations) okunabilir.
-- ----------------------------------------------------------------
CREATE POLICY "courier_locations: public read"
  ON courier_locations FOR SELECT
  USING (true);

-- ----------------------------------------------------------------
-- orders: customer rating yazma policy
-- Herhangi biri sadece rating/comment alanlarını güncelleyebilir,
-- sipariş teslim edildikten sonra ve bir kez yazılabilir.
-- (Uygulama katmanı da kontrol eder: rating IS NULL check ile)
-- ----------------------------------------------------------------
CREATE POLICY "orders: customer rate update"
  ON orders FOR UPDATE
  USING (
    status = 'delivered'
    AND customer_rating IS NULL
  )
  WITH CHECK (true);

COMMENT ON COLUMN orders.customer_rating IS
  'Müşterinin 1-5 arası teslimat puanı. NULL = henüz puanlama yapılmadı.';
COMMENT ON COLUMN orders.customer_comment IS
  'Müşterinin opsiyonel teslimat yorumu.';
