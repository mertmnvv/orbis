-- 023_delete_courier_auth.sql
-- Update release_courier RPC to delete the auth user as well.
-- This ensures that when a restaurant removes a courier, their auth account is deleted,
-- freeing up their phone and email address for registration by another restaurant.

CREATE OR REPLACE FUNCTION public.release_courier(p_courier_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get the auth user_id of this courier if they belong to a restaurant owned by the caller
  SELECT user_id INTO v_user_id
  FROM public.couriers
  WHERE id = p_courier_id
    AND restaurant_id IN (
      SELECT id FROM public.restaurants WHERE user_id = auth.uid()
    );

  -- If courier was found and belonged to the restaurant
  IF v_user_id IS NOT NULL THEN
    -- Delete the auth user (this will cascade delete the public.couriers row because of ON DELETE CASCADE)
    DELETE FROM auth.users WHERE id = v_user_id;
    RETURN TRUE;
  ELSE
    -- If it's a pre-registered courier (who doesn't have user_id linked yet)
    DELETE FROM public.couriers
    WHERE id = p_courier_id
      AND user_id IS NULL
      AND restaurant_id IN (
        SELECT id FROM public.restaurants WHERE user_id = auth.uid()
      );
    RETURN FOUND;
  END IF;
END;
$$;
