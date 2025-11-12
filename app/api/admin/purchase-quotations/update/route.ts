import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UserProfile, UserRole } from '@/types/user';
import { v4 as uuidv4 } from 'uuid';

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const SALES_MANAGER_ROLE: UserRole = "sales_manager";

export async function PATCH(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Order ID is required." }, { status: 400 });
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

    // Update PurchaseQuotation (customer order)
    const { data: orderData, error: updateOrderError } = await localAdminSupabase
      .from('PurchaseQuotation')
      .update({
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
        status: status || 'Quoted',
        quotedPrice: totalAmount, // Keep for backward compatibility
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateOrderError) {
      console.error("API Route - Error updating customer order:", updateOrderError);
      return NextResponse.json({ error: updateOrderError.message }, { status: 500 });
    }

    if (!orderData) {
      return NextResponse.json({ error: "Customer order not found or no changes made." }, { status: 404 });
    }

    // Delete existing items and re-insert new ones
    const { error: deleteItemsError } = await localAdminSupabase
      .from('PurchaseQuotationItem')
      .delete()
      .eq('purchaseQuotationId', id);

    if (deleteItemsError) {
      console.error("API Route - Error deleting old order items:", deleteItemsError);
      // Log but don't fail the whole request if order update was successful
    }

    // Insert new items
    const itemInserts = items.map((item: any) => ({
      id: uuidv4(),
      purchaseQuotationId: id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    }));

    const { data: itemData, error: insertItemsError } = await localAdminSupabase
      .from('PurchaseQuotationItem')
      .insert(itemInserts)
      .select();

    if (insertItemsError) {
      console.error("API Route - Error inserting new order items:", insertItemsError);
      return NextResponse.json({ error: insertItemsError.message }, { status: 500 });
    }

    // Re-fetch the full order with items
    const { data: fullOrder, error: fetchFullOrderError } = await localAdminSupabase
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
      .eq('id', id)
      .single();

    if (fetchFullOrderError) {
      console.error("API Route - Error fetching full updated order:", fetchFullOrderError);
      return NextResponse.json({ message: "Customer order updated successfully (items might be incomplete in response)", order: orderData });
    }

    return NextResponse.json({ message: "Customer order updated successfully", order: fullOrder });

  } catch (error: unknown) {
    console.error("API Route - Unexpected error in customer order update API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
