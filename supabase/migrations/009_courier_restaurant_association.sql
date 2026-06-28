-- Add restaurant_id to couriers so each courier can belong to one restaurant.
-- NULL means the courier is unassigned (system-wide, legacy behaviour).

ALTER TABLE public.couriers
  ADD COLUMN IF NOT EXISTS restaurant_id uuid
    REFERENCES restaurants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_couriers_restaurant_id
  ON public.couriers (restaurant_id);

-- Restaurant admin can read couriers that belong to their restaurant
DROP POLICY IF EXISTS "couriers: restaurant owner read" ON public.couriers;
CREATE POLICY "couriers: restaurant owner read"
  ON public.couriers FOR SELECT
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
  );

-- Restaurant admin can claim an unassigned courier or manage their own couriers
DROP POLICY IF EXISTS "couriers: restaurant owner update" ON public.couriers;
CREATE POLICY "couriers: restaurant owner update"
  ON public.couriers FOR UPDATE
  USING (
    restaurant_id IS NULL
    OR restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
    OR restaurant_id IS NULL
  );

-- Couriers only see pending orders from their assigned restaurant
DROP POLICY IF EXISTS "orders: courier read pending" ON public.orders;
CREATE POLICY "orders: courier read pending"
  ON public.orders FOR SELECT
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM couriers c
      WHERE c.user_id = auth.uid()
        AND c.restaurant_id = orders.restaurant_id
    )
  );

-- Couriers can only accept orders from their assigned restaurant
DROP POLICY IF EXISTS "orders: courier accept" ON public.orders;
CREATE POLICY "orders: courier accept"
  ON public.orders FOR UPDATE
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM couriers c
      WHERE c.user_id = auth.uid()
        AND c.restaurant_id = orders.restaurant_id
    )
  )
  WITH CHECK (
    status = 'assigned'
    AND EXISTS (
      SELECT 1 FROM couriers c
      WHERE c.user_id = auth.uid()
        AND c.id = courier_id
    )
  );
