-- 022_add_courier_email.sql
-- Add email column to public.couriers
ALTER TABLE public.couriers ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- Update the trigger function to support linking by email (primary) or phone (fallback)
CREATE OR REPLACE FUNCTION public.link_courier_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    UPDATE public.couriers
    SET user_id = NEW.id
    WHERE email = NEW.email
      AND user_id IS NULL;
  ELSIF NEW.phone IS NOT NULL THEN
    UPDATE public.couriers
    SET user_id = NEW.id
    WHERE phone = NEW.phone
      AND user_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$;
