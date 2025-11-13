import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Determines invoice status based on order status
 */
function getInvoiceStatusFromOrderStatus(orderStatus: string): 'Paid' | 'Unpaid' {
  if (orderStatus === 'Completed') {
    return 'Paid';
  }
  // Pending, On Delivery, Paid, Quoted, Cancelled → Unpaid
  return 'Unpaid';
}

/**
 * Creates or updates a sales invoice from an order
 * @param supabase - Supabase admin client
 * @param orderId - The order ID to create/update invoice for
 * @returns Promise with invoice data or null if error
 */
export async function createInvoiceFromOrder(
  supabase: SupabaseClient<any>,
  orderId: string
): Promise<any | null> {
  try {
    // Check if invoice already exists
    const { data: existingInvoice } = await supabase
      .from('sales_invoices')
      .select('id')
      .eq('orderId', orderId)
      .single();

    // Fetch the complete order with items
    const { data: orderWithItems, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(
          *,
          product:products(*)
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !orderWithItems) {
      console.error("Error fetching order for invoice creation:", orderError);
      return null;
    }

    // Determine invoice status based on order status
    const invoiceStatus = getInvoiceStatusFromOrderStatus(orderWithItems.status);

    // If invoice exists, update its status
    if (existingInvoice) {
      const { data: updatedInvoice, error: updateError } = await supabase
        .from('sales_invoices')
        .update({ status: invoiceStatus })
        .eq('id', existingInvoice.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating invoice status:", updateError);
        return null;
      }

      console.log(`✅ Updated invoice status to ${invoiceStatus} for order ${orderId}`);
      return updatedInvoice;
    }

    // Generate invoice number
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const invoiceNumber = `INV-${dateStr}-${randomNum}`;

    // Calculate subtotal from items
    const subtotal = (orderWithItems.items || []).reduce((sum: number, item: any) => {
      const unitPrice = item.price || item.unitPrice || 0;
      return sum + (unitPrice * item.quantity);
    }, 0);

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('sales_invoices')
      .insert([{
        invoiceNumber,
        orderId: orderWithItems.id,
        orderNumber: orderWithItems.orderNumber,
        customerName: orderWithItems.customerName,
        customerEmail: orderWithItems.customerEmail,
        customerPhone: orderWithItems.customerPhone,
        shippingAddress: orderWithItems.shippingAddress,
        billingAddress: orderWithItems.billingAddress,
        paymentMethod: orderWithItems.paymentMethod,
        deliveryMethod: orderWithItems.deliveryMethod,
        subtotal: subtotal || (orderWithItems.totalAmount - (orderWithItems.taxAmount || 0) - (orderWithItems.shippingAmount || 0)),
        taxAmount: orderWithItems.taxAmount || 0,
        shippingAmount: orderWithItems.shippingAmount || 0,
        totalAmount: orderWithItems.totalAmount,
        invoiceDate: new Date().toISOString().split('T')[0],
        status: invoiceStatus, // Set based on order status
        notes: orderWithItems.notes,
        createdBy: null,
      }])
      .select()
      .single();

    if (invoiceError || !invoice) {
      console.error("Error creating invoice:", invoiceError);
      return null;
    }

    // Create invoice items
    const invoiceItems = (orderWithItems.items || []).map((item: any) => ({
      salesInvoiceId: invoice.id,
      productId: item.productId || null,
      productName: item.product?.name || 'Unknown Product',
      productDescription: item.product?.description || null,
      quantity: item.quantity,
      unitPrice: item.price || item.unitPrice || 0,
      totalPrice: (item.price || item.unitPrice || 0) * item.quantity,
    }));

    if (invoiceItems.length > 0) {
      const { error: itemsError } = await supabase
        .from('sales_invoice_items')
        .insert(invoiceItems);

      if (itemsError) {
        console.error("Error creating invoice items:", itemsError);
        // Rollback invoice creation
        await supabase.from('sales_invoices').delete().eq('id', invoice.id);
        return null;
      }
    }

    console.log(`✅ Created invoice ${invoiceNumber} for order ${orderId}`);
    return invoice;
  } catch (error) {
    console.error("Error in createInvoiceFromOrder:", error);
    return null;
  }
}

