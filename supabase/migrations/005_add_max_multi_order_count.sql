-- Add max_multi_order_count to restaurants table
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS max_multi_order_count INTEGER DEFAULT 3;
