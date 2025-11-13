# EXACT Steps to Get the Subtraction Logs

## The logs you're seeing are from LOADING the page. 
## You need to SUBMIT THE FORM to create a receiving report.

---

## Here's EXACTLY what to do:

### 1. **First, run the SQL function:**

Open Supabase SQL Editor and paste this:

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

Click "Run" to execute it.

---

### 2. **Open Developer Console:**

1. Press **F12**
2. Click **Console** tab
3. Click the **🚫 Clear console** button
4. In the filter box at the top, type: `STARTING QUANTITY`

---

### 3. **CREATE a NEW Receiving Report:**

#### Step A: Go to the Create Form
- Click the **"+ Create Receiving Report"** button (or similar)
- This should open a form to create a new receiving report

#### Step B: Fill in the Form
- **Purchase Order**: Select **PO #100** from the dropdown
- **Date**: Select any date
- **Warehouse Location**: Enter any location (e.g., "Warehouse A")
- **Materials**: 
  - Material: Select "Surfactants" (the material for PO #100)
  - Quantity: Enter **10**
- **Notes**: (optional, leave blank or add text)

#### Step C: Submit the Form
- Click the **"Submit"** or **"Create"** button
- **This is the critical step that triggers the API call**

---

### 4. **Check the Console:**

After clicking Submit, you should see:

```
API Route - ======= STARTING QUANTITY SUBTRACTION =======
API Route - Purchase order materials: [...]
API Route - Items to process: [...]
API Route - Processing item: cb1dc654-51d8-4d3b-b6a3-b4a2b83906b6 quantity: 10
API Route - Found POM record: ID=892929eb-53ff-4039-ab12-dfcce9624fb6, quantity=100
API Route - [BEFORE UPDATE] Purchase order material ...: current=100, received=10, new=90
API Route - RPC function not available, using direct update: [OR] ✅ Successfully updated
API Route - ✅ Verified: purchase order material ... now has quantity 90
API Route - ======= FINISHED QUANTITY SUBTRACTION =======
```

**Copy all those logs and paste them here.**

---

### 5. **If you DON'T see those logs:**

Check for:
- **Red error messages** in the console (copy those)
- Any message that says "Failed to create" or similar
- The form might have validation errors

---

### 6. **After submission:**

- Check if the receiving report was created successfully
- Check if there's a success message or toast notification
- Go back to the receiving reports list to see if it appears

---

## The KEY is: You must SUBMIT THE FORM

The logs you shared are from the page loading. The subtraction code only runs when you **create a new receiving report** by submitting the form!


