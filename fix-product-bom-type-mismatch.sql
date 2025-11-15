-- Fix product_bom.product_id type mismatch
-- Change product_bom.product_id from uuid to text to match products.id

-- Step 1: Drop the foreign key constraint
ALTER TABLE IF EXISTS public.product_bom 
DROP CONSTRAINT IF EXISTS product_bom_product_id_fkey;

-- Step 2: Change the column type from uuid to text
ALTER TABLE IF EXISTS public.product_bom 
ALTER COLUMN product_id TYPE text USING product_id::text;

-- Step 3: Re-add the foreign key constraint with correct type
ALTER TABLE IF EXISTS public.product_bom 
ADD CONSTRAINT product_bom_product_id_fkey 
FOREIGN KEY (product_id) 
REFERENCES public.products(id) 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- Verify the change
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'product_bom'
  AND column_name = 'product_id';


