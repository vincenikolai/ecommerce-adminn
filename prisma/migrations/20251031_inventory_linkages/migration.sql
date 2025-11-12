-- Inventory linkages: BOM, allocations, and receiving triggers
-- Create product BOM mapping products to raw materials with quantity per unit

CREATE TABLE IF NOT EXISTS public.product_bom (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE ON UPDATE CASCADE,
  raw_material_id text NOT NULL REFERENCES public."RawMaterial"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  quantity_per_unit numeric(18,6) NOT NULL CHECK (quantity_per_unit > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, raw_material_id)
);

-- Track per-order raw material allocations to enable reversal on cancellation
CREATE TABLE IF NOT EXISTS public.order_material_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
  raw_material_id text NOT NULL REFERENCES public."RawMaterial"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  allocated_quantity integer NOT NULL CHECK (allocated_quantity >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, raw_material_id)
);

-- Receiving: increment raw material stock when receivingreportitem rows are inserted
-- Create table receivingreportitem if not present (defensive)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'receivingreportitem'
  ) THEN
    CREATE TABLE public.receivingreportitem (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      receivingreportid uuid NOT NULL,
      rawmaterialid text NOT NULL REFERENCES public."RawMaterial"(id) ON UPDATE CASCADE,
      quantity integer NOT NULL CHECK (quantity >= 0),
      createdat timestamptz NOT NULL DEFAULT now(),
      updatedat timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$;

-- Function to increase raw material stock on receiving
CREATE OR REPLACE FUNCTION public.fn_increment_raw_material_stock()
RETURNS trigger AS $$
BEGIN
  UPDATE public."RawMaterial"
  SET stock = COALESCE(stock, 0) + NEW.quantity,
      "updatedAt" = now()
  WHERE id = NEW.rawmaterialid;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on insert into receivingreportitem
DROP TRIGGER IF EXISTS trg_increment_raw_material_stock ON public.receivingreportitem;
CREATE TRIGGER trg_increment_raw_material_stock
AFTER INSERT ON public.receivingreportitem
FOR EACH ROW
EXECUTE FUNCTION public.fn_increment_raw_material_stock();

-- Helper function to decrement raw materials by computed allocations
CREATE OR REPLACE FUNCTION public.fn_decrement_raw_material_stock(p_raw_material_id text, p_qty integer)
RETURNS void AS $$
BEGIN
  UPDATE public."RawMaterial"
  SET stock = GREATEST(0, COALESCE(stock, 0) - p_qty),
      "updatedAt" = now()
  WHERE id = p_raw_material_id;
END;
$$ LANGUAGE plpgsql;

-- Allocate materials for an order in a transaction
CREATE OR REPLACE FUNCTION public.fn_allocate_materials_for_order(p_order_id uuid)
RETURNS void AS $$
DECLARE
BEGIN
  PERFORM pg_advisory_xact_lock( hashtext('alloc_' || p_order_id::text) );

  -- Sum required quantities by raw material across all order items using BOM
  WITH required AS (
    SELECT
      pb.raw_material_id,
      CEIL(SUM(oi.quantity * pb.quantity_per_unit))::int AS needed
    FROM public.order_items oi
    JOIN public.product_bom pb ON pb.product_id = oi.productId
    WHERE oi.orderId = p_order_id
    GROUP BY pb.raw_material_id
  )
  INSERT INTO public.order_material_allocations (order_id, raw_material_id, allocated_quantity)
  SELECT p_order_id, r.raw_material_id, r.needed
  FROM required r
  ON CONFLICT (order_id, raw_material_id)
  DO UPDATE SET allocated_quantity = EXCLUDED.allocated_quantity, updated_at = now();

  -- Decrement raw materials
  UPDATE public."RawMaterial" rm
  SET stock = GREATEST(0, COALESCE(rm.stock, 0) - r.needed),
      "updatedAt" = now()
  FROM required r
  WHERE rm.id = r.raw_material_id;

END;
$$ LANGUAGE plpgsql;

-- Reverse allocations for an order (add back stock and clear allocations)
CREATE OR REPLACE FUNCTION public.fn_reverse_allocations_for_order(p_order_id uuid)
RETURNS void AS $$
BEGIN
  PERFORM pg_advisory_xact_lock( hashtext('alloc_' || p_order_id::text) );

  -- Add back stock based on existing allocations
  UPDATE public."RawMaterial" rm
  SET stock = COALESCE(rm.stock, 0) + a.allocated_quantity,
      "updatedAt" = now()
  FROM public.order_material_allocations a
  WHERE a.order_id = p_order_id AND rm.id = a.raw_material_id;

  -- Remove allocations
  DELETE FROM public.order_material_allocations WHERE order_id = p_order_id;
END;
$$ LANGUAGE plpgsql;


