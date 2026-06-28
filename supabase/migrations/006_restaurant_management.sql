-- Migration 006: Restaurant Order Management
-- Adds menu_items, customers tables + preparing status + prep time fields

-- 1. Add 'preparing' to order_status enum (before pending so phone orders are invisible to couriers until marked ready)
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'preparing' BEFORE 'pending';

-- 2. menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'Genel',
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON menu_items(restaurant_id);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurant_owner_menu_all" ON menu_items
  FOR ALL
  USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid())
  );

-- 3. customers table (phone-based customer lookup history)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL,
  address TEXT DEFAULT '',
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(restaurant_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(restaurant_id, phone);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurant_owner_customers_all" ON customers
  FOR ALL
  USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid())
  );

-- 4. Add columns to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS preparation_time_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS estimated_ready_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS order_source TEXT DEFAULT 'manual';

-- 5. Add avg prep time to restaurants
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS avg_prep_time_minutes INTEGER DEFAULT 20;

-- 6. Publish menu_items to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;
