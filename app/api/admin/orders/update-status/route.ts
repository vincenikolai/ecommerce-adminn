import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UserRole } from '@/types/user';

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const ORDER_MANAGER_ROLE: UserRole = "order_manager";

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

    if (!profile || (profile.role !== ORDER_MANAGER_ROLE && session.user?.email !== ADMIN_EMAIL)) {
      return NextResponse.json(
        { error: "Access Denied: Insufficient privileges for Order Manager." },
        { status: 403 }
      );
    }

    const { orderId, newStatus, notes } = await req.json();

    if (!orderId || !newStatus) {
      return NextResponse.json({ error: "Order ID and new status are required." }, { status: 400 });
    }

    // Validate status value
    const validStatuses = ['Pending', 'Processing', 'Completed', 'Cancelled'];
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

