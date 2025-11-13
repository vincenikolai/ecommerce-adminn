# Next Steps to Fix Quantity Subtraction

## Step 1: Check for Triggers (IMPORTANT!)

Run this in Supabase SQL Editor and share the results:

```sql
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'purchaseordermaterial'
  AND trigger_schema = 'public'
ORDER BY trigger_name;
```

**This will show if any triggers are interfering with the update!**

## Step 2: Check RLS Policies

Run this:

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'purchaseordermaterial';
```

## Step 3: Create the SQL Function

Run this in Supabase SQL Editor:

```sql
CREATE OR REPLACE FUNCTION public.subtract_purchase_order_material_quantity(
  pom_id uuid,
  qty_to_subtract integer
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  new_quantity integer;
BEGIN
  UPDATE public.purchaseordermaterial
  SET quantity = GREATEST(0, quantity - qty_to_subtract)
  WHERE id = pom_id
  RETURNING quantity INTO new_quantity;
  
  RETURN new_quantity;
END;
$$;

GRANT EXECUTE ON FUNCTION public.subtract_purchase_order_material_quantity(uuid, integer) TO authenticated;
```

## Step 4: Test with Console Logs

1. Open browser Developer Console (F12)
2. Go to Console tab
3. Create a receiving report for one of these purchase orders:
   - PO: `c1eb1ce7-c32c-4e85-9a7b-00a9a93fea7a` (has 50 units of material `cb1dc654-51d8-4d3b-b6a3-b4a2b83906b6`)
   - PO: `3bee5d67-2c3f-4eeb-8530-b40f3eb9bfdd` (has 100 units of material `cb1dc654-51d8-4d3b-b6a3-b4a2b83906b6`)

4. Look for console messages starting with "API Route -"
5. Copy and paste ALL of them here

## What I'm Looking For:

The console logs will show:
- ✅ Is the subtraction logic running?
- ✅ Are the IDs matching correctly?
- ✅ Is the update executing?
- ✅ What value is returned after update?
- ✅ Does verification show a different value?

Example of what you should see:
```
API Route - ======= STARTING QUANTITY SUBTRACTION =======
API Route - Purchase order materials: [...]
API Route - Items to process: [...]
API Route - Processing item: cb1dc654-51d8-4d3b-b6a3-b4a2b83906b6 quantity: 10
API Route - Found POM record: ID=1ea4637c-dfeb-4eb4-b9c3-5ac4822fdd7e, quantity=50
API Route - [BEFORE UPDATE] Purchase order material 1ea4637c-dfeb-4eb4-b9c3-5ac4822fdd7e: current=50, received=10, new=40
API Route - ✅ Successfully updated ... 50 -> 40
API Route - ✅ Verified: purchase order material ... now has quantity 40
```

Please share:
1. Trigger query results (Step 1)
2. RLS policy query results (Step 2)
3. Console logs after creating a receiving report (Step 4)


