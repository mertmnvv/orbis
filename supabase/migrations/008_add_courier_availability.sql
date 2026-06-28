ALTER TABLE public.couriers
  ADD COLUMN IF NOT EXISTS is_available boolean NOT NULL DEFAULT true;

-- Kuryenin kendi availability'sini güncelleyebilmesi için RLS policy
CREATE POLICY "couriers_update_own_availability"
  ON public.couriers
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
