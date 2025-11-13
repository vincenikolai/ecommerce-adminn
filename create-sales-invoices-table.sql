-- Create sales_invoices table
CREATE TABLE IF NOT EXISTS public.sales_invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "invoiceNumber" text NOT NULL,
  "orderId" text NOT NULL,
  "orderNumber" text NOT NULL,
  "customerName" text NOT NULL,
  "customerEmail" text NOT NULL,
  "customerPhone" text NULL,
  "shippingAddress" jsonb NOT NULL,
  "billingAddress" jsonb NOT NULL,
  "paymentMethod" text NOT NULL,
  "deliveryMethod" text NOT NULL,
  "subtotal" numeric(10, 2) NOT NULL,
  "taxAmount" numeric(10, 2) NOT NULL DEFAULT 0,
  "shippingAmount" numeric(10, 2) NOT NULL DEFAULT 0,
  "totalAmount" numeric(10, 2) NOT NULL,
  "invoiceDate" date NOT NULL DEFAULT CURRENT_DATE,
  "dueDate" date NULL,
  "status" text NOT NULL DEFAULT 'Unpaid'::text,
  "notes" text NULL,
  "createdBy" text NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT sales_invoices_pkey PRIMARY KEY (id),
  CONSTRAINT sales_invoices_orderId_fkey FOREIGN KEY ("orderId") REFERENCES public.orders(id) ON DELETE RESTRICT,
  CONSTRAINT sales_invoices_status_check CHECK (
    (
      status = ANY (
        ARRAY[
          'Unpaid'::text,
          'PartiallyPaid'::text,
          'Paid'::text,
          'Overdue'::text,
          'Cancelled'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

-- Create unique index for invoice number
CREATE UNIQUE INDEX IF NOT EXISTS sales_invoices_invoiceNumber_key 
ON public.sales_invoices USING btree ("invoiceNumber") TABLESPACE pg_default;

-- Create index for orderId
CREATE INDEX IF NOT EXISTS idx_sales_invoices_orderId 
ON public.sales_invoices USING btree ("orderId") TABLESPACE pg_default;

-- Create index for invoice date
CREATE INDEX IF NOT EXISTS idx_sales_invoices_invoiceDate 
ON public.sales_invoices USING btree ("invoiceDate") TABLESPACE pg_default;

-- Create sales_invoice_items table
CREATE TABLE IF NOT EXISTS public.sales_invoice_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "salesInvoiceId" uuid NOT NULL,
  "productId" text NULL,
  "productName" text NOT NULL,
  "productDescription" text NULL,
  "quantity" integer NOT NULL,
  "unitPrice" numeric(10, 2) NOT NULL,
  "totalPrice" numeric(10, 2) NOT NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT sales_invoice_items_pkey PRIMARY KEY (id),
  CONSTRAINT sales_invoice_items_salesInvoiceId_fkey FOREIGN KEY ("salesInvoiceId") REFERENCES public.sales_invoices(id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create index for salesInvoiceId
CREATE INDEX IF NOT EXISTS idx_sales_invoice_items_salesInvoiceId 
ON public.sales_invoice_items USING btree ("salesInvoiceId") TABLESPACE pg_default;

-- Create trigger for updatedAt
CREATE OR REPLACE FUNCTION update_sales_invoices_updatedat()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_sales_invoices_updatedat
BEFORE UPDATE ON public.sales_invoices
FOR EACH ROW
EXECUTE FUNCTION update_sales_invoices_updatedat();

CREATE TRIGGER trg_update_sales_invoice_items_updatedat
BEFORE UPDATE ON public.sales_invoice_items
FOR EACH ROW
EXECUTE FUNCTION update_sales_invoices_updatedat();

-- Grant permissions
GRANT ALL ON public.sales_invoices TO authenticated;
GRANT ALL ON public.sales_invoice_items TO authenticated;

