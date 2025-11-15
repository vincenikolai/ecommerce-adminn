-- Create product_bom table if it doesn't exist
-- This table maps products to raw materials (Bill of Materials)
-- Note: product_id is TEXT to match products.id (not uuid)

-- Step 1: Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.product_bom (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  raw_material_id text NOT NULL,
  quantity_per_unit numeric(18,6) NOT NULL CHECK (quantity_per_unit > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_bom_product_id_fkey FOREIGN KEY (product_id) 
    REFERENCES public.products(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT product_bom_raw_material_id_fkey FOREIGN KEY (raw_material_id) 
    REFERENCES public."RawMaterial"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  UNIQUE (product_id, raw_material_id)
);

-- Step 2: If table exists with uuid product_id, convert it to text
DO $$
BEGIN
  -- Check if product_id column exists and is uuid type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'product_bom'
      AND column_name = 'product_id'
      AND data_type = 'uuid'
  ) THEN
    -- Drop foreign key constraint
    ALTER TABLE IF EXISTS public.product_bom 
    DROP CONSTRAINT IF EXISTS product_bom_product_id_fkey;
    
    -- Change column type from uuid to text
    ALTER TABLE public.product_bom 
    ALTER COLUMN product_id TYPE text USING product_id::text;
    
    -- Re-add foreign key constraint
    ALTER TABLE public.product_bom 
    ADD CONSTRAINT product_bom_product_id_fkey 
    FOREIGN KEY (product_id) 
    REFERENCES public.products(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;
    
    RAISE NOTICE 'Converted product_bom.product_id from uuid to text';
  END IF;
END $$;

-- Step 3: Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'product_bom'
ORDER BY ordinal_position;

-- Step 4: Show any existing BOM data
SELECT 
    id,
    product_id,
    raw_material_id,
    quantity_per_unit,
    created_at
FROM public.product_bom
ORDER BY created_at DESC
LIMIT 10;

