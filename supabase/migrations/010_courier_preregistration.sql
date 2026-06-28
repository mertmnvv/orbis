-- 010_courier_preregistration.sql
-- Couriers can now be pre-registered by phone before they ever log in.
-- The mobile app will only allow login if the phone exists in this table.

-- 1. Make user_id nullable so a row can exist before the courier signs up
ALTER TABLE public.couriers
  ALTER COLUMN user_id DROP NOT NULL;

-- 2. Default name for pre-registered couriers whose name isn't known yet
ALTER TABLE public.couriers
  ALTER COLUMN name SET DEFAULT 'Bilinmiyor';

-- 3. Trigger: when a new Supabase Auth user is created via phone OTP,
--    automatically link them to the pre-registered courier row.
CREATE OR REPLACE FUNCTION public.link_courier_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.phone IS NOT NULL THEN
    UPDATE public.couriers
    SET user_id = NEW.id
    WHERE phone = NEW.phone
      AND user_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_link_courier_on_signup ON auth.users;
CREATE TRIGGER trg_link_courier_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.link_courier_on_signup();

-- 4. RPC callable from the mobile app to handle the case where the courier
--    already had an auth account before being pre-registered (trigger won't fire).
CREATE OR REPLACE FUNCTION public.link_courier_user_id(p_phone text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.couriers
  SET user_id = auth.uid()
  WHERE phone = p_phone
    AND user_id IS NULL;
  RETURN FOUND;
END;
$$;

-- 5. Restaurant admin can INSERT (pre-register) a courier for their restaurant
DROP POLICY IF EXISTS "couriers: restaurant owner insert" ON public.couriers;
CREATE POLICY "couriers: restaurant owner insert"
  ON public.couriers FOR INSERT
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE user_id = auth.uid()
    )
  );
