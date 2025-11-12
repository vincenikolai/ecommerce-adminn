import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const DELIVERY_MANAGER_ROLE = "delivery_manager";

export async function DELETE(req: Request) {
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

    // Only admin or delivery manager can delete deliveries
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

    // Get delivery info before deleting
    const { data: delivery, error: fetchError } = await localAdminSupabase
      .from('deliveries')
      .select('order_id, rider_id, status')
      .eq('id', id)
      .single();

    if (fetchError || !delivery) {
      return NextResponse.json({ error: "Delivery not found." }, { status: 404 });
    }

    // Delete delivery
    const { error: deleteError } = await localAdminSupabase
      .from('deliveries')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error("API Route - Error deleting delivery:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Update order status back to "Pending" if delivery is deleted
    const { error: updateOrderError } = await localAdminSupabase
      .from('orders')
      .update({ status: 'Pending' })
      .eq('id', delivery.order_id);

    if (updateOrderError) {
      console.error("API Route - Error updating order status back to Pending:", updateOrderError);
      // Don't fail the whole operation, just log
    }

    // Update rider status back to "Available" when delivery is deleted
    const { error: updateRiderError } = await localAdminSupabase
      .from('riders')
      .update({ status: 'Available' })
      .eq('id', delivery.rider_id);

    if (updateRiderError) {
      console.error("API Route - Error updating rider status back to Available:", updateRiderError);
      // Don't fail the whole operation, just log
    }

    return NextResponse.json({ message: "Delivery deleted successfully and order status reset to 'Pending'", id });
  } catch (error: unknown) {
    console.error("API Route - Unexpected error in delivery deletion API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

