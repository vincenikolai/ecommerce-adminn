import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UserRole } from '@/types/user';

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const SALES_MANAGER_ROLE: UserRole = "sales_manager";
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

    if (!profile || (profile.role !== SALES_MANAGER_ROLE && profile.role !== FINANCE_MANAGER_ROLE && session.user?.email !== ADMIN_EMAIL)) {
      return NextResponse.json(
        { error: "Access Denied: Insufficient privileges. Only Sales Managers and Finance Managers can access this." },
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
      .from('sales_invoices')
      .select('*');

    // Filter by date range if provided
    if (startDate) {
      query = query.gte('invoiceDate', startDate);
    }
    if (endDate) {
      query = query.lte('invoiceDate', endDate);
    }

    // Filter by status if provided
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Exclude cancelled invoices from calculations
    query = query.neq('status', 'Cancelled');

    const { data: invoices, error } = await query.order('invoiceDate', { ascending: false });

    if (error) {
      console.error("Error fetching sales invoices:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate gross and net sales
    // Gross Sales = total amount (including tax and shipping) of all invoices (excluding cancelled)
    // Net Sales = subtotal (before tax and shipping deductions) of all invoices
    const grossSales = invoices?.reduce((sum, invoice) => sum + parseFloat(invoice.totalAmount.toString()), 0) || 0;
    const netSales = invoices?.reduce((sum, invoice) => sum + parseFloat(invoice.subtotal.toString()), 0) || 0;

    // Calculate other metrics
    const totalInvoices = invoices?.length || 0;
    const paidInvoices = invoices?.filter(inv => inv.status === 'Paid').length || 0;
    const unpaidInvoices = invoices?.filter(inv => inv.status === 'Unpaid').length || 0;
    const partiallyPaidInvoices = invoices?.filter(inv => inv.status === 'PartiallyPaid').length || 0;
    const overdueInvoices = invoices?.filter(inv => inv.status === 'Overdue').length || 0;

    // Calculate average invoice value
    const averageInvoiceValue = totalInvoices > 0 ? grossSales / totalInvoices : 0;

    return NextResponse.json({
      invoices: invoices || [],
      summary: {
        grossSales,
        netSales,
        totalInvoices,
        paidInvoices,
        unpaidInvoices,
        partiallyPaidInvoices,
        overdueInvoices,
        averageInvoiceValue,
      },
    });
  } catch (error: unknown) {
    console.error("API Route - Unexpected error in sales report API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

