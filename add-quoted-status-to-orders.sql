-- Add "Quoted" status to orders table CHECK constraint
-- Run this in Supabase SQL Editor

-- Step 1: Drop the old CHECK constraint
ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_status_check;

-- Step 2: Add the new CHECK constraint with "Quoted" status included
ALTER TABLE public.orders
ADD CONSTRAINT orders_status_check
CHECK (
  (
    status = ANY (
      ARRAY[
        'Pending'::text,
        'Quoted'::text,
        'Paid'::text,
        'Completed'::text,
        'Cancelled'::text
      ]
    )
  )
);

