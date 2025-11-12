-- Alter PurchaseQuotation table to match orders schema structure
-- This repurposes PurchaseQuotation to store customer orders
-- Run this in Supabase SQL Editor

-- Step 1: Add new columns to match orders schema
ALTER TABLE public."PurchaseQuotation"
ADD COLUMN IF NOT EXISTS "orderNumber" text,
ADD COLUMN IF NOT EXISTS "customerName" text,
ADD COLUMN IF NOT EXISTS "customerEmail" text,
ADD COLUMN IF NOT EXISTS "customerPhone" text,
ADD COLUMN IF NOT EXISTS "shippingAddress" jsonb,
ADD COLUMN IF NOT EXISTS "billingAddress" jsonb,
ADD COLUMN IF NOT EXISTS "paymentMethod" text,
ADD COLUMN IF NOT EXISTS "deliveryMethod" text,
ADD COLUMN IF NOT EXISTS "totalAmount" numeric(10, 2),
ADD COLUMN IF NOT EXISTS "taxAmount" numeric(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "shippingAmount" numeric(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "notes" text,
ADD COLUMN IF NOT EXISTS "userId" text,
ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'Pending'::text;

-- Step 2: Add CHECK constraint for status
ALTER TABLE public."PurchaseQuotation"
DROP CONSTRAINT IF EXISTS PurchaseQuotation_status_check;

ALTER TABLE public."PurchaseQuotation"
ADD CONSTRAINT PurchaseQuotation_status_check 
CHECK (
  (
    "status" = ANY (
      ARRAY[
        'Pending'::text,
        'Paid'::text,
        'Completed'::text,
        'Cancelled'::text
      ]
    )
  )
);

-- Step 3: Create unique index on orderNumber if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseQuotation_orderNumber_key" 
ON public."PurchaseQuotation" USING btree ("orderNumber") 
WHERE "orderNumber" IS NOT NULL;

-- Step 4: Update existing records to have orderNumber (if needed)
-- This generates order numbers for existing records that don't have one
UPDATE public."PurchaseQuotation"
SET "orderNumber" = 'ORD-' || id::text
WHERE "orderNumber" IS NULL;

-- Step 5: Create a junction table for PurchaseQuotation items (products)
-- This replaces purchasequotationmaterial for customer orders
CREATE TABLE IF NOT EXISTS public."PurchaseQuotationItem" (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  "purchaseQuotationId" uuid NOT NULL,
  "productId" text NOT NULL,
  quantity integer NOT NULL,
  "unitPrice" numeric(10, 2) NOT NULL,
  "totalPrice" numeric(10, 2) NOT NULL,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "PurchaseQuotationItem_pkey" PRIMARY KEY (id),
  CONSTRAINT "PurchaseQuotationItem_purchaseQuotationId_fkey" FOREIGN KEY ("purchaseQuotationId") REFERENCES public."PurchaseQuotation"(id) ON DELETE CASCADE,
  CONSTRAINT "PurchaseQuotationItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.products(id)
);

