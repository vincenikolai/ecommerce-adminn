# How to Find the Subtraction Logs

## The logs you shared are from a different API endpoint (RawMaterial sync)

I need logs from the **receiving report creation** endpoint.

## Here's what to do:

### 1. **First, run the SQL function** (if you haven't already):

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

### 2. **Open Console and Filter:**

1. Press F12 to open Developer Tools
2. Go to **Console** tab
3. **Clear the console** (click the 🚫 icon)
4. In the filter box at the top, type: `API Route -`
   - This will filter to only show the logs we need

### 3. **Create a NEW Receiving Report:**

1. Go to Receiving Report Manager
2. Click "Create Receiving Report" button
3. Fill in:
   - Purchase Order: Select the one with PO #100
   - Add the material
   - Quantity: 10 (or any amount less than 100)
   - Date and warehouse location
4. Click Submit

### 4. **Look for these specific logs:**

You should see logs like this in the console:

```
API Route - ======= STARTING QUANTITY SUBTRACTION =======
API Route - Purchase order materials: [{"id":"892929eb-...","quantity":100,...}]
API Route - Items to process: [{"rawmaterialid":"cb1dc654-...","quantity":10}]
API Route - Processing item: cb1dc654-51d8-4d3b-b6a3-b4a2b83906b6 quantity: 10
API Route - Found POM record: ID=892929eb-53ff-4039-ab12-dfcce9624fb6, quantity=100
API Route - [BEFORE UPDATE] Purchase order material 892929eb-...: current=100, received=10, new=90
API Route - RPC function not available, using direct update: [error details]
API Route - ✅ Successfully updated ... 100 -> 90
API Route - ✅ Verified: purchase order material ... now has quantity 90
API Route - ======= FINISHED QUANTITY SUBTRACTION =======
```

### 5. **Copy those logs:**

- Select all the "API Route -" messages
- Copy them
- Paste them here

## If you don't see ANY "API Route -" messages:

That means the code isn't reaching the subtraction section. In that case:
1. Check if the receiving report was created successfully
2. Check if there are any errors in the console (red messages)
3. Share ALL console output after clicking Submit


