-- ============================================================
-- 019_menu_items_stock.sql
-- menu_items tablosuna stok takibi ekle:
--   - stock_count: NULL = sınırsız, integer = kalan adet
--   - Sipariş oluşturulduğunda stok otomatik düşer (trigger)
--   - Stok 0'a düşünce is_available = false olur
-- ============================================================

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS stock_count integer CHECK (stock_count IS NULL OR stock_count >= 0);

-- ----------------------------------------------------------------
-- Trigger: Sipariş INSERT'inde menu_items.stock_count'ı düş
-- orders.items JSONB array içindeki her ürünün name'ine göre eşleştir
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION decrement_stock_on_order()
RETURNS TRIGGER AS $$
DECLARE
  item_rec  jsonb;
  item_name text;
  item_qty  int;
BEGIN
  -- Only process new orders (INSERT) or status change to 'preparing'
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status <> 'preparing' AND NEW.status = 'preparing') THEN
    FOR item_rec IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      item_name := item_rec->>'name';
      item_qty  := COALESCE((item_rec->>'quantity')::int, 1);

      UPDATE menu_items
      SET
        stock_count   = GREATEST(stock_count - item_qty, 0),
        is_available  = CASE WHEN stock_count - item_qty <= 0 THEN false ELSE is_available END
      WHERE
        restaurant_id = NEW.restaurant_id
        AND name      = item_name
        AND stock_count IS NOT NULL;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_decrement_stock ON orders;
CREATE TRIGGER trg_decrement_stock
  AFTER INSERT OR UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION decrement_stock_on_order();

COMMENT ON COLUMN menu_items.stock_count IS
  'NULL = sınırsız stok. 0 = tükendi (is_available otomatik false olur).';
