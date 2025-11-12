import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UserProfile, UserRole } from '@/types/user';

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

    const { orderIds } = await req.json();

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: "Order IDs array is required." }, { status: 400 });
    }

    // Fetch the quotations to get their orderNumbers
    const { data: quotations, error: fetchQuotationsError } = await localAdminSupabase
      .from('PurchaseQuotation')
      .select('id, orderNumber, status')
      .in('id', orderIds)
      .eq('status', 'Quoted');

    if (fetchQuotationsError) {
      console.error("API Route - Error fetching quotations:", fetchQuotationsError);
      return NextResponse.json({ error: fetchQuotationsError.message }, { status: 500 });
    }

    if (!quotations || quotations.length === 0) {
      return NextResponse.json({ error: "No quotations with 'Quoted' status found." }, { status: 404 });
    }

    const orderNumbers = quotations
      .map(q => q.orderNumber)
      .filter((num): num is string => num !== null && num !== undefined);

    if (orderNumbers.length === 0) {
      return NextResponse.json({ error: "No valid order numbers found in quotations." }, { status: 400 });
    }

    // Update orders table: change status from "Quoted" to "Pending"
    const { data: updatedOrders, error: updateOrdersError } = await localAdminSupabase
      .from('orders')
      .update({ status: 'Pending', updatedAt: new Date().toISOString() })
      .in('orderNumber', orderNumbers)
      .eq('status', 'Quoted')
      .select();

    if (updateOrdersError) {
      console.error("API Route - Error updating orders:", updateOrdersError);
      return NextResponse.json({ error: updateOrdersError.message }, { status: 500 });
    }

    // Log order history for each updated order
    if (updatedOrders && updatedOrders.length > 0) {
      const historyEntries = updatedOrders.map(order => ({
        orderid: order.id,
        oldstatus: 'Quoted',
        newstatus: 'Pending',
        changedby: session.user.email || session.user.id,
        notes: 'Converted from PurchaseQuotation',
      }));

      await localAdminSupabase
        .from('order_status_history')
        .insert(historyEntries);
    }

    // Delete PurchaseQuotationItem records first (if CASCADE doesn't work)
    const { error: deleteItemsError } = await localAdminSupabase
      .from('PurchaseQuotationItem')
      .delete()
      .in('purchaseQuotationId', orderIds);

    if (deleteItemsError) {
      console.warn("API Route - Warning: Error deleting PurchaseQuotationItem (may not exist):", deleteItemsError);
      // Continue even if items deletion fails
    }

    // Delete quotations from PurchaseQuotation table
    const { error: deleteQuotationsError } = await localAdminSupabase
      .from('PurchaseQuotation')
      .delete()
      .in('id', orderIds);

    if (deleteQuotationsError) {
      console.error("API Route - Error deleting quotations:", deleteQuotationsError);
      // Try to rollback the orders status update
      if (updatedOrders && updatedOrders.length > 0) {
        await localAdminSupabase
          .from('orders')
          .update({ status: 'Quoted' })
          .in('orderNumber', orderNumbers);
      }
      return NextResponse.json({ error: deleteQuotationsError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      message: `Successfully converted ${quotations.length} order(s) to Pending and removed from PurchaseQuotation`,
      convertedCount: quotations.length
    });

  } catch (error: unknown) {
    console.error("API Route - Unexpected error in convert to pending API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

