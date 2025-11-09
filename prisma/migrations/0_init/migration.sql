-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."PurchaseOrderStatus" AS ENUM ('Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled');

-- CreateEnum
CREATE TYPE "public"."ReceivingStatus" AS ENUM ('Pending', 'Received', 'PartiallyReceived', 'Rejected');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('Unpaid', 'PartiallyPaid', 'Paid');

-- CreateTable
CREATE TABLE "public"."Store" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."supplier_management_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION,
    "stock" INTEGER,
    "supplier_shop" TEXT,
    "date" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_management_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RawMaterial" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unitOfMeasure" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "defaultSupplierId" UUID,

    CONSTRAINT "RawMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PurchaseQuotation" (
    "id" TEXT NOT NULL,
    "supplierId" UUID,
    "quotedPrice" DOUBLE PRECISION NOT NULL,
    "validityDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseQuotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PurchaseQuotationMaterial" (
    "id" TEXT NOT NULL,
    "purchaseQuotationId" UUID NOT NULL,
    "rawMaterialId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseQuotationMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PurchaseOrder" (
    "id" TEXT NOT NULL,
    "poReferenceNumber" TEXT NOT NULL,
    "supplierId" UUID NOT NULL,
    "orderDate" DATE NOT NULL,
    "deliveryDate" DATE NOT NULL,
    "status" "public"."PurchaseOrderStatus" NOT NULL DEFAULT 'Pending',
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PurchaseOrderMaterial" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" UUID NOT NULL,
    "rawMaterialId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrderMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReceivingReport" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" UUID NOT NULL,
    "receivedDate" DATE NOT NULL,
    "status" "public"."ReceivingStatus" NOT NULL DEFAULT 'Pending',
    "receivedMaterials" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceivingReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "supplier_id" UUID NOT NULL,
    "po_reference_number" UUID NOT NULL,
    "receiving_report_reference_number" UUID NOT NULL,
    "invoiceDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "materials" JSONB,
    "paymentTerms" TEXT,
    "paymentStatus" "public"."PaymentStatus" NOT NULL DEFAULT 'Unpaid',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_poReferenceNumber_key" ON "public"."PurchaseOrder"("poReferenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_invoices_invoiceNumber_key" ON "public"."purchase_invoices"("invoiceNumber");

-- AddForeignKey
ALTER TABLE "public"."RawMaterial" ADD CONSTRAINT "RawMaterial_defaultSupplierId_fkey" FOREIGN KEY ("defaultSupplierId") REFERENCES "public"."supplier_management_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PurchaseQuotation" ADD CONSTRAINT "PurchaseQuotation_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."supplier_management_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PurchaseQuotationMaterial" ADD CONSTRAINT "PurchaseQuotationMaterial_purchaseQuotationId_fkey" FOREIGN KEY ("purchaseQuotationId") REFERENCES "public"."PurchaseQuotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PurchaseQuotationMaterial" ADD CONSTRAINT "PurchaseQuotationMaterial_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "public"."RawMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."supplier_management_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PurchaseOrderMaterial" ADD CONSTRAINT "PurchaseOrderMaterial_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "public"."PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PurchaseOrderMaterial" ADD CONSTRAINT "PurchaseOrderMaterial_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "public"."RawMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReceivingReport" ADD CONSTRAINT "ReceivingReport_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "public"."PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_invoices" ADD CONSTRAINT "purchase_invoices_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."supplier_management_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_invoices" ADD CONSTRAINT "purchase_invoices_po_reference_number_fkey" FOREIGN KEY ("po_reference_number") REFERENCES "public"."PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_invoices" ADD CONSTRAINT "purchase_invoices_receiving_report_reference_number_fkey" FOREIGN KEY ("receiving_report_reference_number") REFERENCES "public"."ReceivingReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

