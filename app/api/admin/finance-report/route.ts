import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UserRole } from '@/types/user';

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
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

    if (!profile || (profile.role !== FINANCE_MANAGER_ROLE && session.user?.email !== ADMIN_EMAIL)) {
      return NextResponse.json(
        { error: "Access Denied: Insufficient privileges for Finance Manager." },
        { status: 403 }
      );
    }

    // Parse query parameters for filtering
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Fetch Sales Data (Income)
    let salesQuery = localAdminSupabase
      .from('sales_invoices')
      .select('*')
      .neq('status', 'Cancelled');

    if (startDate) {
      salesQuery = salesQuery.gte('invoiceDate', startDate);
    }
    if (endDate) {
      salesQuery = salesQuery.lte('invoiceDate', endDate);
    }

    const { data: salesInvoices, error: salesError } = await salesQuery.order('invoiceDate', { ascending: false });

    if (salesError) {
      console.error("Error fetching sales invoices:", salesError);
      return NextResponse.json({ error: salesError.message }, { status: 500 });
    }

    // Fetch Purchasing Data (Expenses)
    let purchasesQuery = localAdminSupabase
      .from('purchaseorder')
      .select('*')
      .neq('status', 'Cancelled');

    if (startDate) {
      purchasesQuery = purchasesQuery.gte('orderDate', startDate);
    }
    if (endDate) {
      purchasesQuery = purchasesQuery.lte('orderDate', endDate);
    }

    const { data: purchaseOrders, error: purchasesError } = await purchasesQuery.order('orderDate', { ascending: false });

    if (purchasesError) {
      console.error("Error fetching purchase orders:", purchasesError);
      return NextResponse.json({ error: purchasesError.message }, { status: 500 });
    }

    // Calculate Income (from Sales)
    const grossIncome = salesInvoices?.reduce((sum, invoice) => sum + parseFloat(invoice.totalAmount.toString()), 0) || 0;
    const netIncome = salesInvoices?.reduce((sum, invoice) => sum + parseFloat(invoice.subtotal.toString()), 0) || 0;

    // Calculate Expenses (from Purchases)
    const grossExpenses = purchaseOrders?.reduce((sum, po) => sum + parseFloat(po.totalAmount.toString()), 0) || 0;
    const netExpenses = purchaseOrders?.reduce((sum, po) => {
      const subtotal = parseFloat(po.totalAmount.toString()) * 0.88; // 88% of totalAmount (net)
      return sum + subtotal;
    }, 0) || 0;

    // Calculate Profit & Loss
    const grossProfit = grossIncome - grossExpenses;
    const netProfit = netIncome - netExpenses;

    // Calculate monthly breakdown for charts
    const monthlyData: Record<string, { income: number; expenses: number; profit: number }> = {};

    // Process sales invoices by month
    salesInvoices?.forEach((invoice) => {
      const date = new Date(invoice.invoiceDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expenses: 0, profit: 0 };
      }
      monthlyData[monthKey].income += parseFloat(invoice.totalAmount.toString());
    });

    // Process purchase orders by month
    purchaseOrders?.forEach((po) => {
      const date = new Date(po.orderDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expenses: 0, profit: 0 };
      }
      monthlyData[monthKey].expenses += parseFloat(po.totalAmount.toString());
    });

    // Calculate profit for each month
    Object.keys(monthlyData).forEach((month) => {
      monthlyData[month].profit = monthlyData[month].income - monthlyData[month].expenses;
    });

    // Sort months chronologically
    const sortedMonthlyData = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        ...data,
      }));

    return NextResponse.json({
      summary: {
        grossIncome,
        netIncome,
        grossExpenses,
        netExpenses,
        grossProfit,
        netProfit,
        totalSalesInvoices: salesInvoices?.length || 0,
        totalPurchaseOrders: purchaseOrders?.length || 0,
      },
      monthlyData: sortedMonthlyData,
      salesInvoices: salesInvoices || [],
      purchaseOrders: purchaseOrders || [],
    });
  } catch (error: unknown) {
    console.error("API Route - Unexpected error in finance report API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

