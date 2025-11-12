import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Delivery } from '@/types/delivery';

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

    // Fetch deliveries assigned to this rider
    const { data: deliveries, error: deliveriesError } = await localAdminSupabase
      .from('deliveries')
      .select('*')
      .eq('rider_id', rider.id)
      .order('created_at', { ascending: false });

    if (deliveriesError) {
      console.error("API Route - Error fetching deliveries:", deliveriesError);
      return NextResponse.json({ error: deliveriesError.message }, { status: 500 });
    }

    if (!deliveries || deliveries.length === 0) {
      return NextResponse.json([]);
    }

    // Get order IDs
    const orderIds = deliveries.map((d: any) => d.order_id);

    // Fetch orders
    const { data: orders, error: ordersError } = await localAdminSupabase
      .from('orders')
      .select('id, orderNumber, customerName, status, shippingAddress')
      .in('id', orderIds);

    if (ordersError) {
      console.error("API Route - Error fetching orders:", ordersError);
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    // Transform the data
    const transformedDeliveries: Delivery[] = (deliveries || []).map((delivery: any) => {
      const order = orders?.find((o: any) => o.id === delivery.order_id);

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
      };
    });

    return NextResponse.json(transformedDeliveries);
  } catch (error: unknown) {
    console.error("API Route - Unexpected error in rider deliveries API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

