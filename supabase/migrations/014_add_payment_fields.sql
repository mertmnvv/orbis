ALTER TABLE orders
  ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'card', 'online_paid')),
  ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('not_required', 'pending', 'collected', 'failed')),
  ADD COLUMN payment_collected_at TIMESTAMPTZ,
  ADD COLUMN payment_notes TEXT;

-- Mevcut platform siparişlerini güncelle
UPDATE orders SET payment_method = 'online_paid', payment_status = 'not_required'
  WHERE platform IN ('yemeksepeti', 'getir', 'trendyol', 'pakettaksi');

UPDATE orders SET payment_method = 'cash', payment_status = 'pending'
  WHERE platform = 'manual' AND status NOT IN ('delivered', 'cancelled');

UPDATE orders SET payment_method = 'cash', payment_status = 'collected'
  WHERE platform = 'manual' AND status = 'delivered';
