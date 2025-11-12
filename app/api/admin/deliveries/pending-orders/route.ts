import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const DELIVERY_MANAGER_ROLE = "delivery_manager";

export async function GET(req: Request) {
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

    // Only admin or delivery manager can access
    if (session.user?.email !== ADMIN_EMAIL && profile.role !== DELIVERY_MANAGER_ROLE) {
      return NextResponse.json(
        { error: "Access Denied: Delivery Manager privileges required." },
        { status: 403 }
      );
    }

    // Fetch orders with status "Pending"
    const { data: pendingOrders, error: ordersError } = await localAdminSupabase
      .from('orders')
      .select('id, orderNumber, customerName, status, createdAt')
      .eq('status', 'Pending')
      .order('createdAt', { ascending: true });

    if (ordersError) {
      console.error("API Route - Error fetching pending orders:", ordersError);
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    // Check which orders already have deliveries
    const orderIds = (pendingOrders || []).map((o: any) => o.id);
    
    if (orderIds.length === 0) {
      return NextResponse.json([]);
    }

    const { data: existingDeliveries, error: deliveriesError } = await localAdminSupabase
      .from('deliveries')
      .select('order_id')
      .in('order_id', orderIds);

    if (deliveriesError) {
      console.error("API Route - Error fetching existing deliveries:", deliveriesError);
      return NextResponse.json({ error: deliveriesError.message }, { status: 500 });
    }

    const assignedOrderIds = new Set((existingDeliveries || []).map((d: any) => d.order_id));

    // Filter out orders that already have deliveries
    const availableOrders = (pendingOrders || []).filter((order: any) => !assignedOrderIds.has(order.id));

    return NextResponse.json(availableOrders);
  } catch (error: unknown) {
    console.error("API Route - Unexpected error in pending orders API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

