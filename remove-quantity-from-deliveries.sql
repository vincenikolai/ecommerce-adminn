-- Remove quantity column from deliveries table
-- This migration removes the quantity column since deliveries should use
-- the exact quantities from order_items instead

-- Drop the quantity column
ALTER TABLE public.deliveries
DROP COLUMN IF EXISTS quantity;

-- Note: The default value constraint will be automatically removed when the column is dropped

