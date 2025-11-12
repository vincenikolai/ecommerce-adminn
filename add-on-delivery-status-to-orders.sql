-- Add 'On Delivery' status to the orders table CHECK constraint
-- Run this in Supabase SQL Editor

-- Drop the old CHECK constraint if it exists
ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add the new CHECK constraint with 'On Delivery' included
ALTER TABLE public.orders
ADD CONSTRAINT orders_status_check
CHECK (
  (
    status = ANY (
      ARRAY[
        'Pending'::text,
        'Quoted'::text,
        'Paid'::text,
        'On Delivery'::text, -- Added 'On Delivery'
        'Completed'::text,
        'Cancelled'::text
      ]
    )
  )
);

