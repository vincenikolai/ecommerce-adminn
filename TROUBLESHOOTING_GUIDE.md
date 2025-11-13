# Troubleshooting: Purchase Order Material Quantity Not Subtracting

## Step 1: Run the SQL Function (REQUIRED)

First, run this SQL script in your Supabase SQL Editor:

```sql
-- File: create-subtract-pom-quantity-function.sql
```

This creates a database function for atomic subtraction.

## Step 2: Run Diagnostic Script (OPTIONAL)

Run `test-purchaseordermaterial-update.sql` in Supabase SQL Editor to:
- Check existing triggers
- Check RLS policies
- Test direct updates

## Step 3: Test Receiving Report Creation

1. Open your browser's Developer Console (F12)
2. Go to the Console tab
3. Create a new receiving report
4. Look for these log messages:

### What to Look For:

**A. Check if subtraction logic is running:**
```
API Route - ======= STARTING QUANTITY SUBTRACTION =======
```
If you DON'T see this, the code isn't reaching the subtraction section.

**B. Check purchase order materials:**
```
API Route - Purchase order materials: [...]
```
Verify the IDs and quantities are correct.

**C. Check items being processed:**
```
API Route - Items to process: [...]
```
Verify the rawmaterialid and quantities.

**D. Check if POM record is found:**
```
API Route - Found POM record: ID=xxx, quantity=yyy
```
If you see "NOT FOUND", the rawmaterialid doesn't match.

**E. Check update execution:**
```
API Route - [BEFORE UPDATE] Purchase order material ...
```
Shows current, received, and expected new quantity.

**F. Check update result:**
- Success: `✅ Successfully updated` 
- Error: `❌ Error updating` (will show error details)

**G. Check verification:**
```
API Route - ✅ Verified: purchase order material xxx now has quantity yyy
```

### Common Issues:

1. **RPC function not available:**
   - Look for: `RPC function not available, using direct update`
   - Solution: Run `create-subtract-pom-quantity-function.sql`

2. **POM record not found:**
   - Look for: `Found POM record: NOT FOUND`
   - Cause: rawmaterialid mismatch
   - Check if the materials in the PO match the receiving report

3. **Update succeeds but value doesn't change:**
   - Look for: `⚠️ CRITICAL: Verification shows different value!`
   - Cause: Database trigger or constraint resetting the value
   - Solution: Check database triggers with `test-purchaseordermaterial-update.sql`

4. **Update fails with error:**
   - Look for: `❌ Error updating` and error details
   - Check the error message for RLS policy violations or permission issues

## Step 4: Check Database Directly

Run this query in Supabase SQL Editor to see current state:

```sql
-- Check a specific purchase order's materials
SELECT 
  pom.id,
  pom.rawmaterialid,
  rm.name as material_name,
  pom.quantity as expected_quantity,
  COALESCE(SUM(rri.quantity), 0) as total_received
FROM public.purchaseordermaterial pom
LEFT JOIN public."RawMaterial" rm ON rm.id = pom.rawmaterialid
LEFT JOIN public.receivingreportitem rri ON rri.purchaseordermaterialid = pom.id
WHERE pom.purchaseorderid = 'YOUR_PO_ID'
GROUP BY pom.id, pom.rawmaterialid, rm.name, pom.quantity;
```

The `expected_quantity` should equal original quantity minus `total_received`.

## Step 5: Manual Test

If all else fails, test the update manually:

```sql
-- Test direct update
BEGIN;

-- Record current value
SELECT id, quantity FROM public.purchaseordermaterial WHERE id = 'YOUR_POM_ID';

-- Update
UPDATE public.purchaseordermaterial 
SET quantity = GREATEST(0, quantity - 5) 
WHERE id = 'YOUR_POM_ID';

-- Check new value
SELECT id, quantity FROM public.purchaseordermaterial WHERE id = 'YOUR_POM_ID';

ROLLBACK; -- or COMMIT to keep
```

If this doesn't change the quantity, there's a database-level issue (trigger, constraint, or RLS policy).


