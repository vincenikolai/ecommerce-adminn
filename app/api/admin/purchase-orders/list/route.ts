import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UserProfile, UserRole } from '@/types/user';

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const PURCHASING_MANAGER_ROLE: UserRole = "purchasing_manager";
const WAREHOUSE_STAFF_ROLE: UserRole = "warehouse_staff";
const RAW_MATERIAL_MANAGER_ROLE: UserRole = "raw_material_manager"; // Add raw_material_manager role
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

    const authClient = createRouteHandlerClient({ cookies });
    const { data: { session }, error: sessionError } = await authClient.auth.getSession();

    if (sessionError) {
      console.error("API Route - Session error:", sessionError);
      return NextResponse.json({ error: sessionError.message }, { status: 401 });
    }

    if (!session) {
      console.error("API Route - Access Denied: No active session.");
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

    console.log("Debug - session.user?.email === ADMIN_EMAIL:", session.user?.email === ADMIN_EMAIL);

    const allowedRoles = [
      PURCHASING_MANAGER_ROLE,
      WAREHOUSE_STAFF_ROLE, // Add warehouse_staff
      FINANCE_MANAGER_ROLE, // Also ensure finance manager can view purchase orders
      RAW_MATERIAL_MANAGER_ROLE, // Add raw_material_manager
      "purchase_quotation_manager", // Allow Purchase Quotation Manager to view purchase orders
    ];

    if (!profile || (!allowedRoles.includes(profile.role) && session.user?.email !== ADMIN_EMAIL)) {
      console.error("API Route - Access Denied: Insufficient privileges for Purchasing Manager.");
      return NextResponse.json({ error: "Access Denied: Insufficient privileges for Purchasing Manager." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);

    const { data: purchaseOrders, error: fetchError } = await localAdminSupabase
      .from('purchaseorder')
      .select(`
        *,
        purchaseordermaterial (*),
        supplierid (supplier_shop)
      `);

    if (fetchError) {
      console.error("API Route - Error fetching purchase orders:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    console.log("API Route - Fetched Purchase Orders Data:", JSON.stringify(purchaseOrders, null, 2));

    return NextResponse.json(purchaseOrders);
  } catch (error: unknown) {
    console.error("API Route - Unexpected error in purchase order list API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}