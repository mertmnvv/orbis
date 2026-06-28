-- Add 'preparing' to order_status enum (phone orders start in kitchen before courier pickup)
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'preparing' BEFORE 'pending';
