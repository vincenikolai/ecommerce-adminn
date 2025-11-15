import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UserRole } from '@/types/user';

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const PURCHASING_MANAGER_ROLE: UserRole = "purchasing_manager";
const FINANCE_MANAGER_ROLE: UserRole = "finance_manager";

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

    if (!profile || (profile.role !== PURCHASING_MANAGER_ROLE && profile.role !== FINANCE_MANAGER_ROLE && session.user?.email !== ADMIN_EMAIL)) {
      return NextResponse.json(
        { error: "Access Denied: Insufficient privileges. Only Purchasing Managers and Finance Managers can access this." },
        { status: 403 }
      );
    }

    // Parse query parameters for filtering
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');

    // Build query
    let query = localAdminSupabase
      .from('purchaseorder')
      .select(`
        *,
        supplier:supplier_management_items(id, company_name, contact_person, email, phone)
      `);

    // Filter by date range if provided
    if (startDate) {
      query = query.gte('orderDate', startDate);
    }
    if (endDate) {
      query = query.lte('orderDate', endDate);
    }

    // Filter by status if provided
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Exclude cancelled purchase orders from calculations
    query = query.neq('status', 'Cancelled');

    const { data: purchaseOrders, error } = await query.order('orderDate', { ascending: false });

    if (error) {
      console.error("Error fetching purchase orders:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate gross and net sales
    // Gross = sum of all totalAmount (including tax)
    // Net = sum of all subtotals (totalAmount - 12% tax = totalAmount * 0.88)
    const grossPurchases = purchaseOrders?.reduce((sum, po) => sum + parseFloat(po.totalAmount.toString()), 0) || 0;
    const netPurchases = purchaseOrders?.reduce((sum, po) => {
      const subtotal = parseFloat(po.totalAmount.toString()) * 0.88; // 88% of totalAmount
      return sum + subtotal;
    }, 0) || 0;

    // Calculate other metrics
    const totalPurchaseOrders = purchaseOrders?.length || 0;
    const approvedOrders = purchaseOrders?.filter(po => po.status === 'Approved').length || 0;
    const completedOrders = purchaseOrders?.filter(po => po.status === 'Completed').length || 0;
    const pendingOrders = purchaseOrders?.filter(po => po.status === 'Pending').length || 0;

    // Calculate average purchase order value
    const averagePurchaseOrderValue = totalPurchaseOrders > 0 ? grossPurchases / totalPurchaseOrders : 0;

    // Calculate total tax amount (12% of all purchase orders)
    const totalTaxAmount = purchaseOrders?.reduce((sum, po) => {
      const tax = parseFloat(po.totalAmount.toString()) * 0.12; // 12% of totalAmount
      return sum + tax;
    }, 0) || 0;

    return NextResponse.json({
      purchaseOrders: purchaseOrders || [],
      summary: {
        grossPurchases,
        netPurchases,
        totalTaxAmount,
        totalPurchaseOrders,
        approvedOrders,
        completedOrders,
        pendingOrders,
        averagePurchaseOrderValue,
      },
    });
  } catch (error: unknown) {
    console.error("API Route - Unexpected error in purchasing report API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

