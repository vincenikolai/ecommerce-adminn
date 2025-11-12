-- Update orders table CHECK constraint to replace 'Processing' with 'Paid'
-- Run this in Supabase SQL Editor

-- First, update any existing 'Processing' statuses to 'Paid'
UPDATE public.orders
SET status = 'Paid'
WHERE status = 'Processing';

-- Drop the old CHECK constraint
ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add the new CHECK constraint with 'Paid' instead of 'Processing'
ALTER TABLE public.orders
ADD CONSTRAINT orders_status_check 
CHECK (
  (
    status = ANY (
      ARRAY[
        'Pending'::text,
        'Paid'::text,
        'Completed'::text,
        'Cancelled'::text
      ]
    )
  )
);

