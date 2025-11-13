-- Create a function to subtract quantity from purchaseordermaterial
-- This ensures atomic subtraction at the database level
-- Run this in Supabase SQL Editor

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
  -- Subtract the quantity and ensure it doesn't go below 0
  UPDATE public.purchaseordermaterial
  SET quantity = GREATEST(0, quantity - qty_to_subtract)
  WHERE id = pom_id
  RETURNING quantity INTO new_quantity;
  
  RETURN new_quantity;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.subtract_purchase_order_material_quantity(uuid, integer) TO authenticated;


