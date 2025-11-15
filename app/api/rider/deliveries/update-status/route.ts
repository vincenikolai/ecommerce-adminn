import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
      return NextResponse.json({ error: "Access Denied: No active session." }, { status: 403 });
    }

    // Get the rider record for this user
    const { data: rider, error: riderError } = await localAdminSupabase
      .from('riders')
      .select('id')
      .eq('user_id', session.user.id)
      .single();

    if (riderError || !rider) {
      return NextResponse.json(
        { error: "Rider record not found. Please contact administrator." },
        { status: 404 }
      );
    }

    const { deliveryId, newStatus } = await req.json();

    if (!deliveryId || !newStatus) {
      return NextResponse.json(
        { error: "Delivery ID and new status are required." },
        { status: 400 }
      );
    }

    // Validate status - riders can only set to "In Transit" or "Delivered"
    if (newStatus !== 'In Transit' && newStatus !== 'Delivered') {
      return NextResponse.json(
        { error: "Invalid status. Riders can only update status to 'In Transit' or 'Delivered'." },
        { status: 400 }
      );
    }

    // Verify the delivery belongs to this rider
    const { data: delivery, error: fetchError } = await localAdminSupabase
      .from('deliveries')
      .select('id, rider_id, order_id, status')
      .eq('id', deliveryId)
      .eq('rider_id', rider.id)
      .single();

    if (fetchError || !delivery) {
      return NextResponse.json(
        { error: "Delivery not found or you don't have permission to update this delivery." },
        { status: 404 }
      );
    }

    // Update delivery status
    const { data: updatedDelivery, error: updateError } = await localAdminSupabase
      .from('deliveries')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', deliveryId)
      .select()
      .single();

    if (updateError) {
      console.error("API Route - Error updating delivery status:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // If status is updated to "Delivered", update order status to "Completed" and set rider back to "Available"
    if (newStatus === 'Delivered') {
      // Get current order status before updating
      const { data: currentOrder } = await localAdminSupabase
        .from('orders')
        .select('status')
        .eq('id', delivery.order_id)
        .single();

      const oldOrderStatus = currentOrder?.status;

      const { error: updateOrderError } = await localAdminSupabase
        .from('orders')
        .update({ status: 'Completed' })
        .eq('id', delivery.order_id);

      if (updateOrderError) {
        console.error("API Route - Error updating order status to Completed:", updateOrderError);
        // Don't fail the whole operation, just log
      } else {
        // Create invoice automatically when order is marked as Completed
        const { createInvoiceFromOrder } = await import('@/lib/create-invoice-from-order');
        await createInvoiceFromOrder(localAdminSupabase, delivery.order_id);

        // Subtract product stock when order is marked as "Completed"
        if (oldOrderStatus !== 'Completed') {
          const { subtractStockOnOrderCompletion } = await import('@/lib/subtract-stock-on-order-completion');
          const stockResult = await subtractStockOnOrderCompletion(
            localAdminSupabase,
            delivery.order_id,
            oldOrderStatus
          );
          if (!stockResult.success) {
            console.error(`Failed to subtract stock for order ${delivery.order_id}:`, stockResult.error);
            // Don't fail the whole operation, just log
          }
        }
      }

      // Set rider back to "Available" when delivery is completed
      const { error: updateRiderError } = await localAdminSupabase
        .from('riders')
        .update({ status: 'Available' })
        .eq('id', rider.id);

      if (updateRiderError) {
        console.error("API Route - Error updating rider status to Available:", updateRiderError);
        // Don't fail the whole operation, just log
      }
    }

    return NextResponse.json({
      message: `Delivery status updated to '${newStatus}' successfully`,
      delivery: updatedDelivery
    });

  } catch (error: unknown) {
    console.error("API Route - Unexpected error in rider delivery status update API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

