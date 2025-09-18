-- Drop the existing foreign key constraint from RawMaterial to Supplier
ALTER TABLE "public"."RawMaterial" DROP CONSTRAINT "RawMaterial_defaultSupplierId_fkey";

-- Drop the existing foreign key constraint from PurchaseQuotation to Supplier
ALTER TABLE "public"."PurchaseQuotation" DROP CONSTRAINT "PurchaseQuotation_supplierId_fkey";

-- Drop the existing foreign key constraint from PurchaseOrder to Supplier
ALTER TABLE "public"."PurchaseOrder" DROP CONSTRAINT "PurchaseOrder_supplierId_fkey";

-- Drop the existing foreign key constraint from purchase_invoices to Supplier
ALTER TABLE "public"."purchase_invoices" DROP CONSTRAINT "purchase_invoices_supplier_id_fkey";

-- Alter the type of "id" in "supplier_management_items" to UUID
-- IMPORTANT: If there's existing data in 'id' that isn't valid UUIDs, this will fail.
-- In a development environment, you might need to manually ensure data is compatible or clear it.
ALTER TABLE "public"."supplier_management_items" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;

-- Alter the type of "supplierId" in "PurchaseQuotation" to UUID
ALTER TABLE "public"."PurchaseQuotation" ALTER COLUMN "supplierId" TYPE UUID USING "supplierId"::uuid;

-- Alter the type of "supplierId" in "PurchaseOrder" to UUID
ALTER TABLE "public"."PurchaseOrder" ALTER COLUMN "supplierId" TYPE UUID USING "supplierId"::uuid;

-- Alter the type of "supplier_id" in "purchase_invoices" to UUID
ALTER TABLE "public"."purchase_invoices" ALTER COLUMN "supplier_id" TYPE UUID USING "supplier_id"::uuid;

-- Re-add the foreign key constraint from RawMaterial to Supplier
ALTER TABLE "public"."RawMaterial" ADD CONSTRAINT "RawMaterial_defaultSupplierId_fkey" FOREIGN KEY ("defaultSupplierId") REFERENCES "public"."supplier_management_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Re-add the foreign key constraint from PurchaseQuotation to Supplier
ALTER TABLE "public"."PurchaseQuotation" ADD CONSTRAINT "PurchaseQuotation_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."supplier_management_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Re-add the foreign key constraint from PurchaseOrder to Supplier
ALTER TABLE "public"."PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."supplier_management_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Re-add the foreign key constraint from purchase_invoices to Supplier
ALTER TABLE "public"."purchase_invoices" ADD CONSTRAINT "purchase_invoices_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."supplier_management_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
