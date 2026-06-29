-- Tarih bazlı raporlama sorgularını hızlandırmak için kompozit indeks
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id_created_at 
  ON orders (restaurant_id, created_at DESC);
