import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Delivery } from '@/types/delivery';

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

    // Only admin or delivery manager can access deliveries list
    if (session.user?.email !== ADMIN_EMAIL && profile.role !== DELIVERY_MANAGER_ROLE) {
      return NextResponse.json(
        { error: "Access Denied: Delivery Manager privileges required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const statusFilter = searchParams.get('status') || 'all';

    console.log("API Route - Fetching deliveries from Supabase...");

    // Fetch deliveries
    let query = localAdminSupabase
      .from('deliveries')
      .select('*');

    // Filter by status
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    // Apply sorting
    if (sortBy === 'created_at') {
      query = query.order('created_at', { ascending: sortOrder === 'asc' });
    } else if (sortBy === 'delivery_date') {
      query = query.order('delivery_date', { ascending: sortOrder === 'asc' });
    } else if (sortBy === 'order_number') {
      query = query.order('order_number', { ascending: sortOrder === 'asc' });
    } else {
      query = query.order('created_at', { ascending: sortOrder === 'asc' });
    }

    const { data: deliveries, error: deliveriesError } = await query;

    if (deliveriesError) {
      console.error("API Route - Error fetching deliveries:", deliveriesError);
      return NextResponse.json({ error: deliveriesError.message }, { status: 500 });
    }

    if (!deliveries || deliveries.length === 0) {
      return NextResponse.json([]);
    }

    // Get order IDs and rider IDs
    const orderIds = deliveries.map((d: any) => d.order_id);
    const riderIds = deliveries.map((d: any) => d.rider_id);

    // Fetch orders
    const { data: orders, error: ordersError } = await localAdminSupabase
      .from('orders')
      .select('id, orderNumber, customerName, status')
      .in('id', orderIds);

    if (ordersError) {
      console.error("API Route - Error fetching orders:", ordersError);
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    // Fetch riders with user profiles
    const { data: riders, error: ridersError } = await localAdminSupabase
      .from('riders')
      .select(`
        id,
        cellphone_number,
        status,
        user_id
      `)
      .in('id', riderIds);

    if (ridersError) {
      console.error("API Route - Error fetching riders:", ridersError);
      return NextResponse.json({ error: ridersError.message }, { status: 500 });
    }

    // Get user IDs from riders
    const userIds = riders?.map((r: any) => r.user_id).filter(Boolean) || [];

    // Fetch user profiles
    const { data: profiles, error: profilesError } = await localAdminSupabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', userIds);

    // Fetch auth users for emails
    const { data: authUsers } = await localAdminSupabase.auth.admin.listUsers();

    // Transform the data
    const transformedDeliveries: Delivery[] = (deliveries || []).map((delivery: any) => {
      const order = orders?.find((o: any) => o.id === delivery.order_id);
      const rider = riders?.find((r: any) => r.id === delivery.rider_id);
      const profile = profiles?.find((p: any) => p.id === rider?.user_id);
      const authUser = authUsers?.users.find((u: any) => u.id === rider?.user_id);

      return {
        id: delivery.id,
        orderId: delivery.order_id,
        orderNumber: delivery.order_number,
        customerName: delivery.customer_name,
        riderId: delivery.rider_id,
        deliveryDate: delivery.delivery_date,
        quantity: delivery.quantity,
        status: delivery.status as "Assigned" | "In Transit" | "Delivered" | "Failed",
        notes: delivery.notes,
        createdAt: delivery.created_at,
        updatedAt: delivery.updated_at,
        order: order ? {
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          status: order.status,
        } : undefined,
        rider: rider ? {
          id: rider.id,
          cellphoneNumber: rider.cellphone_number,
          status: rider.status,
          user: {
            id: rider.user_id,
            email: authUser?.email || '',
            first_name: profile?.first_name || null,
            last_name: profile?.last_name || null,
          },
        } : undefined,
      };
    });

    console.log("API Route - Successfully fetched deliveries. Count:", transformedDeliveries.length);
    return NextResponse.json(transformedDeliveries);
  } catch (error: unknown) {
    console.error("API Route - Unexpected error in deliveries list API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

