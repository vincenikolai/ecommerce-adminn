-- ============================================
-- Sales Order Database Setup SQL
-- Copy and paste this into Supabase SQL Editor
-- ============================================

-- Step 1: Create SalesOrder table
CREATE TABLE IF NOT EXISTS public."SalesOrder" (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  "supplierId" uuid,
  "quotedPrice" numeric NOT NULL,
  "validityDate" date NOT NULL,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
  "isOrder" boolean NOT NULL DEFAULT true,
  CONSTRAINT "SalesOrder_pkey" PRIMARY KEY (id),
  CONSTRAINT "SalesOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public.supplier_management_items(id)
);

-- Step 2: Create SalesOrderMaterial table
CREATE TABLE IF NOT EXISTS public."SalesOrderMaterial" (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  "salesOrderId" uuid NOT NULL,
  "rawMaterialId" text NOT NULL,
  quantity integer NOT NULL,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "SalesOrderMaterial_pkey" PRIMARY KEY (id),
  CONSTRAINT "SalesOrderMaterial_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES public."SalesOrder"(id) ON DELETE CASCADE,
  CONSTRAINT "SalesOrderMaterial_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES public."RawMaterial"(id)
);

-- Step 3: Copy existing PurchaseQuotation data where isOrder = TRUE to SalesOrder
INSERT INTO public."SalesOrder" (id, "supplierId", "quotedPrice", "validityDate", "createdAt", "updatedAt", "isOrder")
SELECT 
  id, 
  "supplierId", 
  "quotedPrice", 
  "validityDate", 
  "createdAt", 
  "updatedAt", 
  "isOrder"
FROM public."PurchaseQuotation"
WHERE "isOrder" = true
ON CONFLICT (id) DO NOTHING;

-- Step 4: Copy PurchaseQuotationMaterial data to SalesOrderMaterial
INSERT INTO public."SalesOrderMaterial" (id, "salesOrderId", "rawMaterialId", quantity, "createdAt", "updatedAt")
SELECT 
  pqm.id,
  pqm.purchasequotationid as "salesOrderId",
  pqm.rawmaterialid as "rawMaterialId",
  pqm.quantity,
  pqm.createdat as "createdAt",
  pqm.updatedat as "updatedAt"
FROM public."purchasequotationmaterial" pqm
INNER JOIN public."PurchaseQuotation" pq ON pq.id = pqm.purchasequotationid
WHERE pq."isOrder" = true
ON CONFLICT (id) DO NOTHING;

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS "SalesOrder_supplierId_idx" ON public."SalesOrder"("supplierId");
CREATE INDEX IF NOT EXISTS "SalesOrderMaterial_salesOrderId_idx" ON public."SalesOrderMaterial"("salesOrderId");
CREATE INDEX IF NOT EXISTS "SalesOrderMaterial_rawMaterialId_idx" ON public."SalesOrderMaterial"("rawMaterialId");

-- Verification queries (optional - run these to check the data)
-- SELECT COUNT(*) as total_sales_orders FROM public."SalesOrder";
-- SELECT COUNT(*) as total_sales_order_materials FROM public."SalesOrderMaterial";
-- SELECT * FROM public."SalesOrder" LIMIT 5;
-- SELECT * FROM public."SalesOrderMaterial" LIMIT 5;

