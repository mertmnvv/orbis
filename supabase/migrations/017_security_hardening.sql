-- ============================================================
-- 017_security_hardening.sql
-- Güvenlik güçlendirme: delivery_zones RLS iyileştirmesi,
-- eksik politika denetimleri, courier okuma hakları
-- ============================================================

-- ============================================================
-- delivery_zones: restaurant_id bağlantısı ekle
-- ============================================================
ALTER TABLE delivery_zones
  ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE;

-- Mevcut kayıtları ilk restoran sahibiyle ilişkilendir (migration güvenliği)
UPDATE delivery_zones dz
SET restaurant_id = (
  SELECT r.id FROM restaurants r
  ORDER BY r.created_at ASC
  LIMIT 1
)
WHERE dz.restaurant_id IS NULL;

-- Yeni kayıtlarda restaurant_id zorunlu olsun
-- (mevcut null olanlar yukarıda dolduruldu)
ALTER TABLE delivery_zones
  ALTER COLUMN restaurant_id SET NOT NULL;

-- ============================================================
-- delivery_zones: mevcut aşırı geniş policy'yi düzelt
-- Eski: "herhangi bir restaurant sahibi TÜM zone'ları yönetir"
-- Yeni: "sadece kendi restaurant_id'sine ait zone'ları yönetir"
-- ============================================================
DROP POLICY IF EXISTS "delivery_zones: restaurant owner all" ON delivery_zones;

CREATE POLICY "delivery_zones: owner crud"
  ON delivery_zones FOR ALL
  USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid())
  )
  WITH CHECK (
    restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid())
  );

-- Kuryeler aktif teslimat bölgelerini okuyabilir (rota filtrelemesi için)
CREATE POLICY "delivery_zones: courier read active"
  ON delivery_zones FOR SELECT
  USING (
    is_active = true
    AND EXISTS (SELECT 1 FROM couriers c WHERE c.user_id = auth.uid())
  );

-- ============================================================
-- orders: courier_status_note güncelleme policy'sini kısıtla
-- Sadece siparişe atanmış kurye kendi notunu güncelleyebilir
-- ============================================================
DROP POLICY IF EXISTS "orders: courier status note update" ON orders;

CREATE POLICY "orders: courier status note update"
  ON orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM couriers c
      WHERE c.id = orders.courier_id
        AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM couriers c
      WHERE c.id = courier_id
        AND c.user_id = auth.uid()
    )
  );

-- ============================================================
-- Index: delivery_zones restaurant_id için
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_delivery_zones_restaurant
  ON delivery_zones (restaurant_id, is_active);

-- ============================================================
-- orders: kurye sadece kendi alanlarını güncelleyebilmeli
-- payment_notes ve courier_status_note dışındaki alanları
-- korumak için column-level security notu:
-- (Supabase RLS WITH CHECK ile satır bazlı, sütun bazlı değil —
--  bu güvenlik, uygulama katmanında da uygulanmalı)
-- ============================================================

-- Hatırlatıcı view: hangi policy'ler aktif (audit amaçlı)
COMMENT ON TABLE delivery_zones IS
  'Teslimat bölgeleri. Her zone bir restaurant''a aittir. '
  'RLS: sadece sahibi düzenleyebilir, kuryeler aktif olanları okuyabilir.';

COMMENT ON TABLE orders IS
  'Siparişler. RLS: restaurant sahibi tüm CRUD, kurye sadece kendi '
  'atandığı siparişleri güncelleyebilir (status + payment + note).';
