import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UserProfile, UserRole } from '@/types/user';
import { v4 as uuidv4 } from 'uuid';

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
      console.error("API Route - Access Denied: No active session.");
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
      console.error("API Route - Access Denied: Insufficient privileges for Sales Manager.");
      return NextResponse.json({ error: "Access Denied: Insufficient privileges for Sales Manager." }, { status: 403 });
    }

    const body = await req.json();
    const {
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      billingAddress,
      paymentMethod,
      deliveryMethod,
      totalAmount,
      taxAmount,
      shippingAmount,
      notes,
      status,
      items,
    } = body;

    if (!customerName || !customerEmail || !shippingAddress || !billingAddress || !paymentMethod || !deliveryMethod || totalAmount === undefined || !items || items.length === 0) {
      return NextResponse.json({ error: "Customer name, email, addresses, payment method, delivery method, total amount, and at least one item are required." }, { status: 400 });
    }

    const newOrderId = uuidv4();
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const orderStatus = status || 'Quoted';

    // Insert PurchaseQuotation (repurposed as customer order)
    const { data: quotationData, error: insertQuotationError } = await localAdminSupabase
      .from('PurchaseQuotation')
      .insert([{
        id: newOrderId,
        orderNumber,
        customerName,
        customerEmail,
        customerPhone: customerPhone || null,
        shippingAddress,
        billingAddress,
        paymentMethod,
        deliveryMethod,
        totalAmount,
        taxAmount: taxAmount || 0,
        shippingAmount: shippingAmount || 0,
        notes: notes || null,
        status: orderStatus,
        userId: session.user.id,
        // Keep old fields for backward compatibility (can be null)
        supplierId: null,
        quotedPrice: totalAmount,
        validityDate: new Date().toISOString().split('T')[0],
        isOrder: false, // This is a customer order, not a supplier order
      }])
      .select()
      .single();

    if (insertQuotationError) {
      console.error("API Route - Error inserting quotation:", insertQuotationError);
      return NextResponse.json({ error: insertQuotationError.message }, { status: 500 });
    }

    if (!quotationData) {
      throw new Error("Failed to retrieve created quotation data.");
    }

    // Also insert into orders table with status "Quoted"
    const orderIdForOrders = uuidv4(); // Generate UUID string for orders table (text type)
    const { data: orderData, error: insertOrderError } = await localAdminSupabase
      .from('orders')
      .insert([{
        id: orderIdForOrders,
        orderNumber,
        customerName,
        customerEmail,
        customerPhone: customerPhone || null,
        shippingAddress,
        billingAddress,
        status: 'Quoted', // Always "Quoted" when created from quotation manager
        paymentMethod,
        deliveryMethod,
        totalAmount,
        taxAmount: taxAmount || 0,
        shippingAmount: shippingAmount || 0,
        notes: notes || null,
        userId: session.user.id,
      }])
      .select()
      .single();

    if (insertOrderError) {
      console.error("API Route - Error inserting order:", insertOrderError);
      // Rollback: delete the quotation
      await localAdminSupabase
        .from('PurchaseQuotation')
        .delete()
        .eq('id', newOrderId);
      return NextResponse.json({ error: insertOrderError.message }, { status: 500 });
    }

    // Insert PurchaseQuotationItem (products for this quotation)
    const quotationItemInserts = items.map((item: any) => ({
      id: uuidv4(),
      purchaseQuotationId: newOrderId,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    }));

    const { data: quotationItemData, error: insertQuotationItemsError } = await localAdminSupabase
      .from('PurchaseQuotationItem')
      .insert(quotationItemInserts)
      .select();

    if (insertQuotationItemsError) {
      console.error("API Route - Error inserting quotation items:", insertQuotationItemsError);
      // Rollback: delete both quotation and order
      await localAdminSupabase
        .from('PurchaseQuotation')
        .delete()
        .eq('id', newOrderId);
      await localAdminSupabase
        .from('orders')
        .delete()
        .eq('id', orderIdForOrders);
      return NextResponse.json({ error: insertQuotationItemsError.message }, { status: 500 });
    }

    // Also insert order_items for the orders table
    const orderItemInserts = items.map((item: any) => ({
      id: uuidv4(),
      orderId: orderIdForOrders,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      price: item.unitPrice, // Required field in order_items
    }));

    const { data: orderItemData, error: insertOrderItemsError } = await localAdminSupabase
      .from('order_items')
      .insert(orderItemInserts)
      .select();

    if (insertOrderItemsError) {
      console.error("API Route - Error inserting order items:", insertOrderItemsError);
      // Rollback: delete quotation, order, and quotation items
      await localAdminSupabase
        .from('PurchaseQuotation')
        .delete()
        .eq('id', newOrderId);
      await localAdminSupabase
        .from('orders')
        .delete()
        .eq('id', orderIdForOrders);
      await localAdminSupabase
        .from('PurchaseQuotationItem')
        .delete()
        .eq('purchaseQuotationId', newOrderId);
      return NextResponse.json({ error: insertOrderItemsError.message }, { status: 500 });
    }

    // Re-fetch the full quotation with items
    const { data: fullQuotation, error: fetchFullQuotationError } = await localAdminSupabase
      .from('PurchaseQuotation')
      .select(`
        *,
        items:PurchaseQuotationItem(
          id,
          productId,
          quantity,
          unitPrice,
          totalPrice,
          product:products(id, name, price)
        )
      `)
      .eq('id', newOrderId)
      .single();

    if (fetchFullQuotationError) {
      console.error("API Route - Error fetching full created quotation:", fetchFullQuotationError);
      return NextResponse.json({ 
        message: "Quotation and order created successfully (items might be incomplete in response)", 
        quotation: quotationData,
        order: orderData 
      });
    }

    return NextResponse.json({ 
      message: "Quotation and order created successfully", 
      quotation: fullQuotation,
      order: orderData 
    });

  } catch (error: unknown) {
    console.error("API Route - Unexpected error in customer order creation API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
