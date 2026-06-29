-- 020_pos_terminal.sql
-- Bluetooth POS terminal entegrasyonu için orders tablosuna yeni alanlar

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS pos_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS collected_amount   NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS pos_sync_status    TEXT NOT NULL DEFAULT 'not_applicable'
    CHECK (pos_sync_status IN ('not_applicable', 'pending', 'synced', 'failed')),
  ADD COLUMN IF NOT EXISTS pos_synced_at      TIMESTAMPTZ;

-- Hızlı sorgu için index (dashboard'da failed/pending filtresi)
CREATE INDEX IF NOT EXISTS idx_orders_pos_sync_status
  ON orders (pos_sync_status)
  WHERE pos_sync_status IN ('pending', 'failed');

COMMENT ON COLUMN orders.pos_transaction_id IS
  'POS sağlayıcısından (iyzico/SumUp) dönen işlem kimliği. Yalnızca kart ödemelerinde dolu.';
COMMENT ON COLUMN orders.collected_amount IS
  'POS''tan onaylanan gerçek tahsilat tutarı (TL). total_amount ile eşleşmesi gerekir.';
COMMENT ON COLUMN orders.pos_sync_status IS
  'not_applicable: kart dışı ödeme | pending: offline sırasında bekliyor | synced: Supabase''e yazıldı | failed: 3 deneme sonrası başarısız';
COMMENT ON COLUMN orders.pos_synced_at IS
  'Supabase sync tamamlandığı zaman damgası.';
