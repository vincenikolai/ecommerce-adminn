import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UserRole } from '@/types/user';
import { CreateSalesInvoiceRequest } from '@/types/sales-invoice';

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const SALES_MANAGER_ROLE: UserRole = "sales_manager";

export async function POST(req: Request) {
  let supabaseUrl = '';
  let supabaseServiceRoleKey = '';

  try {
    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing environment variables for Supabase admin client in API route');
    }

    const localAdminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
      },
    });

    const cookieStore = cookies();
    const authClient = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { session }, error: sessionError } = await authClient.auth.getSession();

    if (sessionError) {
      console.error("API Route - Session error:", sessionError);
      return NextResponse.json({ error: sessionError.message }, { status: 401 });
    }

    if (!session) {
      return NextResponse.json({ error: "Access Denied: No active session." }, { status: 403 });
    }

    // Fetch the user's role from the profiles table
    const { data: profile, error: profileError } = await localAdminSupabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error("API Route - Error fetching user profile:", profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!profile || (profile.role !== SALES_MANAGER_ROLE && session.user?.email !== ADMIN_EMAIL)) {
      return NextResponse.json(
        { error: "Access Denied: Insufficient privileges for Sales Manager." },
        { status: 403 }
      );
    }

    const body: CreateSalesInvoiceRequest = await req.json();
    const { orderId, invoiceDate, dueDate, notes } = body;

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    // Fetch the order with items
    const { data: order, error: orderError } = await localAdminSupabase
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

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if order is completed
    if (order.status !== 'Completed') {
      return NextResponse.json(
        { error: "Only completed orders can be converted to invoices" },
        { status: 400 }
      );
    }

    // Check if invoice already exists for this order
    const { data: existingInvoice } = await localAdminSupabase
      .from('sales_invoices')
      .select('id')
      .eq('orderId', orderId)
      .single();

    if (existingInvoice) {
      return NextResponse.json(
        { error: "Invoice already exists for this order" },
        { status: 400 }
      );
    }

    // Generate invoice number (INV-YYYYMMDD-XXXX)
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const invoiceNumber = `INV-${dateStr}-${randomNum}`;

    // Calculate subtotal from items
    const subtotal = order.items.reduce((sum: number, item: any) => {
      const unitPrice = item.unitPrice || item.price || 0;
      return sum + (unitPrice * item.quantity);
    }, 0);

    // Create invoice
    const invoiceData = {
      invoiceNumber,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      paymentMethod: order.paymentMethod,
      deliveryMethod: order.deliveryMethod,
      subtotal: subtotal,
      taxAmount: order.taxAmount || 0,
      shippingAmount: order.shippingAmount || 0,
      totalAmount: order.totalAmount,
      invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
      dueDate: dueDate || null,
      status: 'Unpaid' as const,
      notes: notes || null,
      createdBy: session.user.id,
    };

    const { data: invoice, error: invoiceError } = await localAdminSupabase
      .from('sales_invoices')
      .insert([invoiceData])
      .select()
      .single();

    if (invoiceError || !invoice) {
      console.error("Error creating invoice:", invoiceError);
      return NextResponse.json({ error: invoiceError?.message || "Failed to create invoice" }, { status: 500 });
    }

    // Create invoice items
    const invoiceItems = order.items.map((item: any) => ({
      salesInvoiceId: invoice.id,
      productId: item.productId || null,
      productName: item.product?.name || 'Unknown Product',
      productDescription: item.product?.description || null,
      quantity: item.quantity,
      unitPrice: item.unitPrice || item.price || 0,
      totalPrice: (item.unitPrice || item.price || 0) * item.quantity,
    }));

    const { error: itemsError } = await localAdminSupabase
      .from('sales_invoice_items')
      .insert(invoiceItems);

    if (itemsError) {
      console.error("Error creating invoice items:", itemsError);
      // Rollback invoice creation
      await localAdminSupabase.from('sales_invoices').delete().eq('id', invoice.id);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // Fetch the complete invoice with items
    const { data: completeInvoice, error: fetchError } = await localAdminSupabase
      .from('sales_invoices')
      .select(`
        *,
        items:sales_invoice_items(*),
        order:orders(
          id,
          orderNumber,
          status
        )
      `)
      .eq('id', invoice.id)
      .single();

    if (fetchError || !completeInvoice) {
      return NextResponse.json({ error: "Failed to fetch created invoice" }, { status: 500 });
    }

    return NextResponse.json(completeInvoice, { status: 201 });
  } catch (error: unknown) {
    console.error("API Route - Unexpected error in create sales invoice API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

