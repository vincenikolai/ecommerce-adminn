import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UserRole } from '@/types/user';

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const SALES_MANAGER_ROLE: UserRole = "sales_manager";

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

    // Fetch completed orders that don't have invoices yet
    const { data: completedOrders, error: ordersError } = await localAdminSupabase
      .from('orders')
      .select(`
        *,
        items:order_items(
          *,
          product:products(*)
        )
      `)
      .eq('status', 'Completed')
      .order('createdAt', { ascending: false });

    if (ordersError) {
      console.error("Error fetching completed orders:", ordersError);
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    // Fetch existing invoices to filter out orders that already have invoices
    const { data: existingInvoices, error: invoicesError } = await localAdminSupabase
      .from('sales_invoices')
      .select('orderId');

    if (invoicesError) {
      console.error("Error fetching existing invoices:", invoicesError);
      return NextResponse.json({ error: invoicesError.message }, { status: 500 });
    }

    const invoicedOrderIds = new Set((existingInvoices || []).map((inv: any) => inv.orderId));
    const availableOrders = (completedOrders || []).filter((order: any) => !invoicedOrderIds.has(order.id));

    return NextResponse.json(availableOrders);
  } catch (error: unknown) {
    console.error("API Route - Unexpected error in completed orders API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

