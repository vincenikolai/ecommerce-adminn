-- Function to automatically create sales invoice when order status becomes "Completed"
CREATE OR REPLACE FUNCTION public.create_sales_invoice_on_order_completed()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id uuid;
  v_invoice_number text;
  v_date_str text;
  v_random_num text;
  v_subtotal numeric(10, 2);
  v_order_item record;
BEGIN
  -- Only proceed if status changed to "Completed"
  IF NEW.status = 'Completed' AND (OLD.status IS NULL OR OLD.status != 'Completed') THEN
    
    -- Check if invoice already exists for this order
    SELECT id INTO v_invoice_id
    FROM public.sales_invoices
    WHERE "orderId" = NEW.id;
    
    -- Skip if invoice already exists
    IF v_invoice_id IS NOT NULL THEN
      RETURN NEW;
    END IF;
    
    -- Generate invoice number (INV-YYYYMMDD-XXXX)
    v_date_str := to_char(CURRENT_DATE, 'YYYYMMDD');
    v_random_num := lpad(floor(random() * 10000)::text, 4, '0');
    v_invoice_number := 'INV-' || v_date_str || '-' || v_random_num;
    
    -- Calculate subtotal from order items
    -- Try price column first (most common)
    SELECT COALESCE(SUM((oi.price::numeric * oi.quantity)), 0)
    INTO v_subtotal
    FROM public.order_items oi
    WHERE oi."orderId" = NEW.id;
    
    -- If no items found or price is null, try unitprice column
    IF v_subtotal = 0 OR v_subtotal IS NULL THEN
      SELECT COALESCE(SUM((COALESCE(oi.unitprice, oi.price, 0)::numeric * oi.quantity)), 0)
      INTO v_subtotal
      FROM public.order_items oi
      WHERE oi."orderId" = NEW.id;
    END IF;
    
    -- Create the invoice
    INSERT INTO public.sales_invoices (
      "invoiceNumber",
      "orderId",
      "orderNumber",
      "customerName",
      "customerEmail",
      "customerPhone",
      "shippingAddress",
      "billingAddress",
      "paymentMethod",
      "deliveryMethod",
      "subtotal",
      "taxAmount",
      "shippingAmount",
      "totalAmount",
      "invoiceDate",
      "status",
      "notes",
      "createdBy"
    )
    VALUES (
      v_invoice_number,
      NEW.id,
      NEW."orderNumber",
      NEW."customerName",
      NEW."customerEmail",
      NEW."customerPhone",
      NEW."shippingAddress",
      NEW."billingAddress",
      NEW."paymentMethod",
      NEW."deliveryMethod",
      v_subtotal,
      COALESCE(NEW."taxAmount", 0),
      COALESCE(NEW."shippingAmount", 0),
      NEW."totalAmount",
      CURRENT_DATE, -- Use current date as invoice date
      'Unpaid',
      NEW.notes,
      NULL -- System generated, no user
    )
    RETURNING id INTO v_invoice_id;
    
    -- Create invoice items from order items
    FOR v_order_item IN 
      SELECT 
        oi.id,
        oi."productId",
        oi.quantity,
        COALESCE(oi.price, oi.unitprice, 0) as unit_price,
        p.name as product_name,
        p.description as product_description
      FROM public.order_items oi
      LEFT JOIN public.products p ON oi."productId" = p.id
      WHERE oi."orderId" = NEW.id
    LOOP
      INSERT INTO public.sales_invoice_items (
        "salesInvoiceId",
        "productId",
        "productName",
        "productDescription",
        "quantity",
        "unitPrice",
        "totalPrice"
      )
      VALUES (
        v_invoice_id,
        v_order_item."productId",
        COALESCE(v_order_item.product_name, 'Unknown Product'),
        v_order_item.product_description,
        v_order_item.quantity,
        v_order_item.unit_price,
        v_order_item.unit_price * v_order_item.quantity
      );
    END LOOP;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS trg_create_invoice_on_completed ON public.orders;
CREATE TRIGGER trg_create_invoice_on_completed
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
WHEN (NEW.status = 'Completed' AND (OLD.status IS NULL OR OLD.status != 'Completed'))
EXECUTE FUNCTION public.create_sales_invoice_on_order_completed();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_sales_invoice_on_order_completed() TO authenticated;

