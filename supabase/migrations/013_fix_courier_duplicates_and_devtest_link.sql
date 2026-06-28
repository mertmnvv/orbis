-- 013_fix_courier_duplicates_and_devtest_link.sql
-- Aynı telefon için oluşan duplicate kurye satırlarını temizler,
-- devtest kullanıcısını restorana bağlı kurye satırına link eder
-- ve telefon unique constraint ekler.

-- 1. Aynı telefon için restaurant_id=NULL olan duplicate satırları sil
DELETE FROM public.couriers c1
WHERE c1.restaurant_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.couriers c2
    WHERE c2.phone = c1.phone
      AND c2.restaurant_id IS NOT NULL
      AND c2.id != c1.id
  );

-- 2. devtest kullanıcısını restorana bağlı (user_id=NULL olan) kurye satırına link et
UPDATE public.couriers
SET user_id = auth_user.id
FROM (SELECT id FROM auth.users WHERE email = 'devtest@orbiscourier.com' LIMIT 1) auth_user
WHERE couriers.user_id IS NULL
  AND couriers.restaurant_id IS NOT NULL
  AND auth_user.id IS NOT NULL;

-- 3. Aynı telefon tekrar eklenemesin (duplicate önleme)
ALTER TABLE public.couriers
  ADD CONSTRAINT couriers_phone_unique UNIQUE (phone);
