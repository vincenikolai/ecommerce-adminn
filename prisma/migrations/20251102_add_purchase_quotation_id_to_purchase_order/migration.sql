-- AlterTable
ALTER TABLE "public"."purchaseorder" ADD COLUMN IF NOT EXISTS "purchaseQuotationId" UUID;

-- AddForeignKey
ALTER TABLE "public"."purchaseorder" ADD CONSTRAINT "purchaseorder_purchaseQuotationId_fkey" FOREIGN KEY ("purchaseQuotationId") REFERENCES "public"."PurchaseQuotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

