-- Add 'In Transit' status to the deliveries table CHECK constraint
-- Run this in Supabase SQL Editor

-- Drop the old CHECK constraint if it exists
ALTER TABLE public.deliveries
DROP CONSTRAINT IF EXISTS deliveries_status_check;

-- Add the new CHECK constraint with 'In Transit' included
ALTER TABLE public.deliveries
ADD CONSTRAINT deliveries_status_check
CHECK (
  status = ANY (
    ARRAY[
      'Assigned'::text,
      'In Transit'::text, -- Added 'In Transit'
      'Out for Delivery'::text,
      'Delivered'::text,
      'Failed'::text,
      'Cancelled'::text
    ]
  )
);

