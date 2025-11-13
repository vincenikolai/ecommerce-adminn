-- Add foreign key from receivingreportitem to purchaseordermaterial
-- This allows tracking which purchase order material each received item corresponds to
-- Run this in Supabase SQL Editor

-- Step 1: Add the purchaseordermaterialid column to receivingreportitem
ALTER TABLE public.receivingreportitem
ADD COLUMN IF NOT EXISTS purchaseordermaterialid uuid;

-- Step 2: Create the foreign key constraint
ALTER TABLE public.receivingreportitem
ADD CONSTRAINT receivingreportitem_purchaseordermaterialid_fkey 
FOREIGN KEY (purchaseordermaterialid) 
REFERENCES public.purchaseordermaterial(id) 
ON DELETE RESTRICT;

-- Step 3: Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_receivingreportitem_purchaseordermaterial 
ON public.receivingreportitem(purchaseordermaterialid);

-- Step 4: Optional - Update existing records to link them based on receivingreport -> purchaseorder -> purchaseordermaterial
-- This matches existing receivingreportitem records to their corresponding purchaseordermaterial
-- based on rawmaterialid and the purchase order relationship
-- NOTE: This step is optional. If you encounter trigger errors, you can skip this step.
-- New receiving report items will automatically have the purchaseordermaterialid set via the API.

-- Disable only user-defined triggers (not system triggers)
DO $$
DECLARE
    trig_name text;
BEGIN
    FOR trig_name IN 
        SELECT t.trigger_name 
        FROM information_schema.triggers t
        WHERE t.event_object_table = 'receivingreportitem' 
        AND t.trigger_schema = 'public'
        AND t.trigger_name NOT LIKE 'RI_%'  -- Exclude system referential integrity triggers
    LOOP
        EXECUTE format('ALTER TABLE public.receivingreportitem DISABLE TRIGGER %I', trig_name);
    END LOOP;
END $$;

-- Update existing records
UPDATE public.receivingreportitem rri
SET purchaseordermaterialid = subquery.pom_id
FROM (
  SELECT 
    rri_inner.id as rri_id,
    pom.id as pom_id
  FROM public.receivingreportitem rri_inner
  JOIN public.receivingreport rr ON rr.id = rri_inner.receivingreportid
  JOIN public.purchaseorder po ON po.id = rr.purchaseorderid
  JOIN public.purchaseordermaterial pom ON pom.purchaseorderid = po.id 
    AND pom.rawmaterialid = rri_inner.rawmaterialid
  WHERE rri_inner.purchaseordermaterialid IS NULL
) AS subquery
WHERE rri.id = subquery.rri_id
  AND rri.purchaseordermaterialid IS NULL;

-- Re-enable user-defined triggers
DO $$
DECLARE
    trig_name text;
BEGIN
    FOR trig_name IN 
        SELECT t.trigger_name 
        FROM information_schema.triggers t
        WHERE t.event_object_table = 'receivingreportitem' 
        AND t.trigger_schema = 'public'
        AND t.trigger_name NOT LIKE 'RI_%'  -- Exclude system referential integrity triggers
    LOOP
        EXECUTE format('ALTER TABLE public.receivingreportitem ENABLE TRIGGER %I', trig_name);
    END LOOP;
END $$;

-- Note: If there are multiple purchaseordermaterial records with the same rawmaterialid for the same PO,
-- the above UPDATE will only set one of them. You may need to handle this case manually.
-- Also note: If you still encounter errors, you can skip Step 4 entirely as it's optional.

