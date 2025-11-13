import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UpdateDeliveryRequest } from '@/types/delivery';

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const DELIVERY_MANAGER_ROLE = "delivery_manager";

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

    // Only admin or delivery manager can update deliveries
    if (session.user?.email !== ADMIN_EMAIL && profile.role !== DELIVERY_MANAGER_ROLE) {
      return NextResponse.json(
        { error: "Access Denied: Delivery Manager privileges required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Delivery ID is required." }, { status: 400 });
    }

    const body: UpdateDeliveryRequest = await req.json();
    const { deliveryDate, quantity, status, notes } = body;

    if (!deliveryDate && quantity === undefined && !status && !notes) {
      return NextResponse.json(
        { error: "At least one field must be provided for update." },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: any = {};
    if (deliveryDate !== undefined) {
      updateData.delivery_date = deliveryDate;
    }
    if (quantity !== undefined) {
      updateData.quantity = quantity;
    }
    if (status !== undefined) {
      updateData.status = status;
    }
    if (notes !== undefined) {
      updateData.notes = notes;
    }
    updateData.updated_at = new Date().toISOString();

    // Update delivery
    const { data: updatedDelivery, error: updateError } = await localAdminSupabase
      .from('deliveries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error("API Route - Error updating delivery:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!updatedDelivery) {
      return NextResponse.json({ error: "Delivery not found or no changes made." }, { status: 404 });
    }

    // If status is updated to "Delivered", update order status to "Completed" and set rider back to "Available"
    if (status === 'Delivered') {
      const { error: updateOrderError } = await localAdminSupabase
        .from('orders')
        .update({ status: 'Completed' })
        .eq('id', updatedDelivery.order_id);

      if (updateOrderError) {
        console.error("API Route - Error updating order status to Completed:", updateOrderError);
        // Don't fail the whole operation, just log
      } else {
        // Create invoice automatically when order is marked as Completed
        const { createInvoiceFromOrder } = await import('@/lib/create-invoice-from-order');
        await createInvoiceFromOrder(localAdminSupabase, updatedDelivery.order_id);
      }

      // Set rider back to "Available" when delivery is completed
      const { error: updateRiderError } = await localAdminSupabase
        .from('riders')
        .update({ status: 'Available' })
        .eq('id', updatedDelivery.rider_id);

      if (updateRiderError) {
        console.error("API Route - Error updating rider status to Available:", updateRiderError);
        // Don't fail the whole operation, just log
      }
    }

    // If status is updated to "Failed", set rider back to "Available"
    if (status === 'Failed') {
      const { error: updateRiderError } = await localAdminSupabase
        .from('riders')
        .update({ status: 'Available' })
        .eq('id', updatedDelivery.rider_id);

      if (updateRiderError) {
        console.error("API Route - Error updating rider status to Available:", updateRiderError);
        // Don't fail the whole operation, just log
      }
    }

    return NextResponse.json({
      message: "Delivery updated successfully",
      delivery: updatedDelivery
    });

  } catch (error: unknown) {
    console.error("API Route - Unexpected error in delivery update API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

