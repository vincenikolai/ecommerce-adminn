import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CreateDeliveryRequest } from '@/types/delivery';

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const DELIVERY_MANAGER_ROLE = "delivery_manager";

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

    // Check user role
    const { data: profile, error: profileError } = await localAdminSupabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Access Denied: Could not verify user role." },
        { status: 403 }
      );
    }

    // Only admin or delivery manager can create deliveries
    if (session.user?.email !== ADMIN_EMAIL && profile.role !== DELIVERY_MANAGER_ROLE) {
      return NextResponse.json(
        { error: "Access Denied: Delivery Manager privileges required." },
        { status: 403 }
      );
    }

    const body: CreateDeliveryRequest = await req.json();
    const { orderId, riderId, deliveryDate, quantity, notes } = body;

    if (!orderId || !riderId || !deliveryDate) {
      return NextResponse.json(
        { error: "Order ID, Rider ID, and Delivery Date are required." },
        { status: 400 }
      );
    }

    // Verify order exists and is in "Pending" status
    const { data: order, error: orderError } = await localAdminSupabase
      .from('orders')
      .select('id, orderNumber, customerName, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order not found." },
        { status: 404 }
      );
    }

    if (order.status !== 'Pending') {
      return NextResponse.json(
        { error: `Order is not in "Pending" status. Current status: ${order.status}` },
        { status: 400 }
      );
    }

    // Check if order already has a delivery
    const { data: existingDelivery, error: checkError } = await localAdminSupabase
      .from('deliveries')
      .select('id')
      .eq('order_id', orderId)
      .single();

    if (existingDelivery) {
      return NextResponse.json(
        { error: "This order already has a delivery assignment." },
        { status: 400 }
      );
    }

    // Verify rider exists and is available
    const { data: rider, error: riderError } = await localAdminSupabase
      .from('riders')
      .select('id, status')
      .eq('id', riderId)
      .single();

    if (riderError || !rider) {
      return NextResponse.json(
        { error: "Rider not found." },
        { status: 404 }
      );
    }

    if (rider.status !== 'Available') {
      return NextResponse.json(
        { error: `Rider is not available. Current status: ${rider.status}` },
        { status: 400 }
      );
    }

    // Create delivery record
    const { data: newDelivery, error: createError } = await localAdminSupabase
      .from('deliveries')
      .insert([{
        order_id: orderId,
        order_number: order.orderNumber,
        customer_name: order.customerName,
        rider_id: riderId,
        delivery_date: deliveryDate,
        quantity: quantity || 1,
        status: 'Assigned',
        notes: notes || null,
      }])
      .select()
      .single();

    if (createError) {
      console.error("API Route - Error creating delivery:", createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    // Update order status to "On Delivery"
    const { error: updateOrderError } = await localAdminSupabase
      .from('orders')
      .update({ status: 'On Delivery' })
      .eq('id', orderId);

    if (updateOrderError) {
      console.error("API Route - Error updating order status:", updateOrderError);
      // Rollback delivery creation
      await localAdminSupabase.from('deliveries').delete().eq('id', newDelivery.id);
      return NextResponse.json(
        { error: "Failed to update order status. Delivery not created." },
        { status: 500 }
      );
    }

    // Update rider status to "Not Available" after assignment
    const { error: updateRiderError } = await localAdminSupabase
      .from('riders')
      .update({ status: 'Not Available' })
      .eq('id', riderId);

    if (updateRiderError) {
      console.error("API Route - Error updating rider status:", updateRiderError);
      // Don't fail the whole operation, but log the error
      console.warn("Warning: Delivery created and order status updated, but rider status update failed");
    }

    return NextResponse.json({
      message: "Delivery created successfully and order status updated to 'On Delivery'",
      delivery: newDelivery
    });

  } catch (error: unknown) {
    console.error("API Route - Unexpected error in delivery creation API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

