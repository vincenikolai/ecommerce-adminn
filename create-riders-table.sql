-- Create Riders Management Table
-- Run this in Supabase SQL Editor

-- Step 1: Add "rider" to the role type (if using enum, otherwise it's just text)
-- Note: Since role is text in profiles, we don't need to alter an enum

-- Step 2: Create riders table
CREATE TABLE IF NOT EXISTS public.riders (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  cellphone_number text NOT NULL,
  status text NOT NULL DEFAULT 'Available'::text CHECK (status = ANY (ARRAY['Available'::text, 'Not Available'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT riders_pkey PRIMARY KEY (id),
  CONSTRAINT riders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT riders_user_id_unique UNIQUE (user_id)
) TABLESPACE pg_default;

-- Step 3: Create index for better performance
CREATE INDEX IF NOT EXISTS riders_user_id_idx ON public.riders(user_id);
CREATE INDEX IF NOT EXISTS riders_status_idx ON public.riders(status);

-- Step 4: Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_riders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_riders_updated_at
BEFORE UPDATE ON public.riders
FOR EACH ROW
EXECUTE FUNCTION update_riders_updated_at();

