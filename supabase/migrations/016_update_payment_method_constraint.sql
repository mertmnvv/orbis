-- Update payment_method CHECK constraint to support food_card and split
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('cash', 'card', 'online_paid', 'food_card', 'split'));
