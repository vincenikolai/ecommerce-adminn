import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UserProfile, UserRole } from '@/types/user';
import { ReceivingReport } from '@/types/receiving-report';

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const WAREHOUSE_STAFF_ROLE: UserRole = "warehouse_staff";
const FINANCE_MANAGER_ROLE: UserRole = "finance_manager";
const PURCHASING_MANAGER_ROLE: UserRole = "purchasing_manager";

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

    const authClient = createRouteHandlerClient({ cookies });
    const { data: { session }, error: sessionError } = await authClient.auth.getSession();

    if (sessionError) {
      console.error("API Route - Session error:", sessionError);
      return NextResponse.json({ error: sessionError.message }, { status: 401 });
    }

    if (!session) {
      return NextResponse.json({ error: "Access Denied: No active session." }, { status: 403 });
    }

    const { data: profile, error: profileError } = await localAdminSupabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error("API Route - Error fetching user profile:", profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!profile || (profile.role !== WAREHOUSE_STAFF_ROLE && session.user?.email !== ADMIN_EMAIL && profile.role !== PURCHASING_MANAGER_ROLE && profile.role !== FINANCE_MANAGER_ROLE)) {
      console.error("API Route - Access Denied: Insufficient privileges for Warehouse Staff.");
      return NextResponse.json({ error: "Access Denied: Insufficient privileges for Warehouse Staff." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const sortBy = searchParams.get('sortBy') || 'receiveddate';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    console.log("API Route - Fetching receiving reports from Supabase...");

    const { data: receivingReports, error: rrListError } = await localAdminSupabase
      .from('receivingreport')
      .select(`
        *,
        purchaseorder (
          id,
          poReferenceNumber,
          supplierId,
          deliveryDate
        ),
        receivingreportitem (
          id,
          rawmaterialid,
          quantity,
          rawMaterial:RawMaterial(
            id,
            name
          )
        )
      `);

    if (rrListError) {
      console.error("API Route - Error fetching receiving reports:", rrListError);
      return NextResponse.json({ error: rrListError.message }, { status: 500 });
    }

    console.log("API Route - Fetched receiving reports data:", JSON.stringify(receivingReports, null, 2));
    if (!receivingReports) {
      return NextResponse.json([]);
    }

    // Apply sorting
    (receivingReports as ReceivingReport[]).sort((a, b) => {
      let valA: string | number | null = null;
      let valB: string | number | null = null;

      if (sortBy === "receiveddate") {
        valA = a.receiveddate;
        valB = b.receiveddate;
      } else if (sortBy === "ponumber" && a.purchaseorder && b.purchaseorder) {
        valA = a.purchaseorder.poReferenceNumber;
        valB = b.purchaseorder.poReferenceNumber;
      } else if (sortBy === "warehouselocation") {
        valA = a.warehouselocation;
        valB = b.warehouselocation;
      } else if (sortBy === "createdat") {
        valA = a.createdat;
        valB = b.createdat;
      }

      if (valA === null && valB === null) return 0;
      if (valA === null) return sortOrder === "asc" ? 1 : -1;
      if (valB === null) return sortOrder === "asc" ? -1 : 1;

      if (valA < valB) {
        return sortOrder === "asc" ? -1 : 1;
      } else if (valA > valB) {
        return sortOrder === "asc" ? 1 : -1;
      }
      return 0;
    });

    return NextResponse.json(receivingReports);

  } catch (error: unknown) {
    console.error("API Route - Unexpected error in receiving report list API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
