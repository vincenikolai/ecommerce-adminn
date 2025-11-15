import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UserRole } from '@/types/user';

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const WAREHOUSE_STAFF_ROLE: UserRole = "warehouse_staff";
const PURCHASING_MANAGER_ROLE: UserRole = "purchasing_manager";
const FINANCE_MANAGER_ROLE: UserRole = "finance_manager";

export async function GET(
  req: Request,
  { params }: { params: { reportId: string } }
) {
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

    if (!profile || (profile.role !== WAREHOUSE_STAFF_ROLE && profile.role !== PURCHASING_MANAGER_ROLE && profile.role !== FINANCE_MANAGER_ROLE && session.user?.email !== ADMIN_EMAIL)) {
      return NextResponse.json(
        { error: "Access Denied: Insufficient privileges." },
        { status: 403 }
      );
    }

    const { reportId } = params;

    // Fetch the receiving report with items
    const { data: receivingReport, error: rrError } = await localAdminSupabase
      .from('receivingreport')
      .select(`
        id,
        receiveddate,
        receivingreportitem (
          id,
          rawmaterialid,
          quantity,
          createdat,
          rawMaterial:RawMaterial(
            id,
            name,
            stock
          )
        )
      `)
      .eq('id', reportId)
      .single();

    if (rrError || !receivingReport) {
      return NextResponse.json({ error: "Receiving report not found." }, { status: 404 });
    }

    // Calculate stock before and after for each item
    // Stock before = current stock - quantity received (since trigger added it)
    const history = (receivingReport.receivingreportitem || []).map((item: any) => {
      const currentStock = item.rawMaterial?.stock || 0;
      const quantityReceived = item.quantity || 0;
      const stockBefore = currentStock - quantityReceived; // Subtract what was added by trigger
      const stockAfter = currentStock;

      return {
        id: item.id,
        rawMaterialId: item.rawmaterialid,
        rawMaterialName: item.rawMaterial?.name || 'Unknown',
        quantityReceived: quantityReceived,
        stockBefore: Math.max(0, stockBefore), // Ensure non-negative
        stockAfter: stockAfter,
        receivedDate: receivingReport.receiveddate,
        createdAt: item.createdat,
      };
    });

    return NextResponse.json({
      receivingReportId: reportId,
      receivedDate: receivingReport.receiveddate,
      history: history,
    });
  } catch (error: unknown) {
    console.error("API Route - Unexpected error in receiving report history API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

