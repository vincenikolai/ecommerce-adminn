-- Create Deliveries Management Table
-- Run this in Supabase SQL Editor

-- Step 1: Create deliveries table
CREATE TABLE IF NOT EXISTS public.deliveries (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id text NOT NULL,
  order_number text NOT NULL,
  customer_name text NOT NULL,
  rider_id uuid NOT NULL,
  delivery_date date NOT NULL DEFAULT CURRENT_DATE,
  quantity integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'Assigned'::text CHECK (status = ANY (ARRAY['Assigned'::text, 'In Transit'::text, 'Delivered'::text, 'Failed'::text])),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT deliveries_pkey PRIMARY KEY (id),
  CONSTRAINT deliveries_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE,
  CONSTRAINT deliveries_rider_id_fkey FOREIGN KEY (rider_id) REFERENCES public.riders(id) ON DELETE RESTRICT,
  CONSTRAINT deliveries_order_id_unique UNIQUE (order_id)
) TABLESPACE pg_default;

-- Step 2: Create indexes for better performance
CREATE INDEX IF NOT EXISTS deliveries_order_id_idx ON public.deliveries(order_id);
CREATE INDEX IF NOT EXISTS deliveries_rider_id_idx ON public.deliveries(rider_id);
CREATE INDEX IF NOT EXISTS deliveries_status_idx ON public.deliveries(status);
CREATE INDEX IF NOT EXISTS deliveries_delivery_date_idx ON public.deliveries(delivery_date);

-- Step 3: Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_deliveries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_deliveries_updated_at
BEFORE UPDATE ON public.deliveries
FOR EACH ROW
EXECUTE FUNCTION update_deliveries_updated_at();

