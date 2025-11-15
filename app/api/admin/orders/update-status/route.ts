import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UserRole } from '@/types/user';
import { createInvoiceFromOrder } from '@/lib/create-invoice-from-order';
import { subtractStockOnOrderCompletion } from '@/lib/subtract-stock-on-order-completion';

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

    const { orderId, newStatus, notes } = await req.json();

    if (!orderId || !newStatus) {
      return NextResponse.json({ error: "Order ID and new status are required." }, { status: 400 });
    }

    // Validate status value - "Quoted" cannot be set manually, only through quotation conversion
    // "Completed" and "Cancelled" cannot be set manually - they are controlled by other parts of the system
    const validStatuses = ['Pending', 'Paid', 'On Delivery'];
    const restrictedStatuses = ['Completed', 'Cancelled', 'Quoted'];
    
    if (restrictedStatuses.includes(newStatus)) {
      let errorMessage = '';
      if (newStatus === 'Completed') {
        errorMessage = "Cannot manually set status to 'Completed'. This status is automatically set when a rider marks the delivery as 'Delivered'.";
      } else if (newStatus === 'Cancelled') {
        errorMessage = "Cannot manually set status to 'Cancelled'. This status is automatically set when a customer cancels their order.";
      } else if (newStatus === 'Quoted') {
        errorMessage = "Cannot manually set status to 'Quoted'. This status is only set through quotation conversion.";
      }
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json({ error: "Invalid status value." }, { status: 400 });
    }

    console.log(`Updating order ${orderId} status to ${newStatus}`);

    // Get current order to check old status
    const { data: currentOrder, error: fetchError } = await localAdminSupabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single();

    if (fetchError || !currentOrder) {
      console.error("Error fetching current order:", fetchError);
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const oldStatus = currentOrder.status;

    // Update the order status
    const { data, error: updateError } = await localAdminSupabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating order status:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Create or update invoice when order status changes
    // Invoice status: "Paid" if Completed, "Unpaid" if Pending/On Delivery
    await createInvoiceFromOrder(localAdminSupabase, orderId);

    // Subtract product stock when order is marked as "Completed"
    if (newStatus === 'Completed' && oldStatus !== 'Completed') {
      const stockResult = await subtractStockOnOrderCompletion(
        localAdminSupabase,
        orderId,
        oldStatus
      );
      if (!stockResult.success) {
        console.error(`Failed to subtract stock for order ${orderId}:`, stockResult.error);
        // Don't fail the request, but log the error
      }
    }

    // Manually insert into history table (more reliable than trigger)
    const { error: historyError } = await localAdminSupabase
      .from('order_status_history')
      .insert({
        orderid: orderId,
        oldstatus: oldStatus,
        newstatus: newStatus,
        changedby: session.user.email || session.user.id,
        notes: notes || null,
      });

    if (historyError) {
      console.error("Error inserting status history:", historyError);
      // Don't fail the request if history logging fails
    }

    console.log(`Successfully updated order ${orderId} from ${oldStatus} to ${newStatus}`);

    return NextResponse.json({ 
      message: "Order status updated successfully", 
      order: data 
    });
  } catch (error: unknown) {
    console.error("API Route - Unexpected error in order status update API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

