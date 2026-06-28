-- 011_fix_dev_test_courier_restaurant.sql
-- Links any courier named 'Test Kurye' who has no restaurant to the first
-- available restaurant. No-op in production where this seed record does not exist.

UPDATE public.couriers
SET restaurant_id = (SELECT id FROM public.restaurants ORDER BY created_at LIMIT 1)
WHERE name = 'Test Kurye'
  AND restaurant_id IS NULL;
