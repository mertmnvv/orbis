-- 012_release_courier_rpc.sql
-- SECURITY DEFINER RPC that unlinks a courier from a restaurant.
-- Direct UPDATE fails because after setting restaurant_id = null the row
-- is no longer visible to the admin via the SELECT policy, causing PostgREST
-- to treat the WITH CHECK as a violation. This function bypasses RLS and
-- enforces authorization manually.

CREATE OR REPLACE FUNCTION public.release_courier(p_courier_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.couriers
  SET restaurant_id = NULL
  WHERE id = p_courier_id
    AND restaurant_id IN (
      SELECT id FROM public.restaurants WHERE user_id = auth.uid()
    );
  RETURN FOUND;
END;
$$;
