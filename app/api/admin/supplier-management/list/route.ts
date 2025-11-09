import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UserProfile, UserRole } from '@/types/user';
import { SupplierManagementItem } from '@/types/supplier-management'; // Import new type

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const SUPPLIER_MANAGEMENT_MANAGER_ROLE: UserRole = "supplier_management_manager"; // Renamed role constant
const SALES_QUOTATION_MANAGER_ROLE: UserRole = "sales_quotation_manager"; // Define the Sales Quotation Manager Role
const PURCHASE_QUOTATION_MANAGER_ROLE: UserRole = "purchase_quotation_manager"; // New role constant
const PURCHASING_MANAGER_ROLE: UserRole = "purchasing_manager"; // Added Purchasing Manager Role
const RAW_MATERIAL_MANAGER_ROLE: UserRole = "raw_material_manager";
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
    console.log("API Route - Session:", session);
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
    console.log("API Route - Profile:", profile);
    if (profileError) {
      console.error("API Route - Error fetching user profile:", profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // Detailed logging for debugging access control
    console.log("Debug - profile.role:", profile?.role);
    console.log("Debug - SUPPLIER_MANAGEMENT_MANAGER_ROLE:", SUPPLIER_MANAGEMENT_MANAGER_ROLE);
    console.log("Debug - SALES_QUOTATION_MANAGER_ROLE:", SALES_QUOTATION_MANAGER_ROLE); // Add debug log for new role
    console.log("Debug - PURCHASE_QUOTATION_MANAGER_ROLE:", PURCHASE_QUOTATION_MANAGER_ROLE);
    console.log("Debug - PURCHASING_MANAGER_ROLE:", PURCHASING_MANAGER_ROLE);
    console.log("Debug - session.user?.email:", session.user?.email);
    console.log("Debug - ADMIN_EMAIL:", ADMIN_EMAIL);
    console.log("Debug - profile.role === SUPPLIER_MANAGEMENT_MANAGER_ROLE:", profile?.role === SUPPLIER_MANAGEMENT_MANAGER_ROLE);
    console.log("Debug - profile.role === SALES_QUOTATION_MANAGER_ROLE:", profile?.role === SALES_QUOTATION_MANAGER_ROLE); // Add debug log for new role check
    console.log("Debug - profile.role === PURCHASE_QUOTATION_MANAGER_ROLE:", profile?.role === PURCHASE_QUOTATION_MANAGER_ROLE);
    console.log("Debug - profile.role === PURCHASING_MANAGER_ROLE:", profile?.role === PURCHASING_MANAGER_ROLE);
    console.log("Debug - session.user?.email === ADMIN_EMAIL:", session.user?.email === ADMIN_EMAIL);
    console.log("Debug - FINANCE_MANAGER_ROLE:", FINANCE_MANAGER_ROLE);

    const allowedRoles = [
      SUPPLIER_MANAGEMENT_MANAGER_ROLE,
      FINANCE_MANAGER_ROLE,
      RAW_MATERIAL_MANAGER_ROLE,
      PURCHASING_MANAGER_ROLE,
      PURCHASE_QUOTATION_MANAGER_ROLE,
      SALES_QUOTATION_MANAGER_ROLE, // Allow Sales Quotation Manager to view supplier management items
    ];

    if (!profile || (!allowedRoles.includes(profile.role) && session.user?.email !== ADMIN_EMAIL)) {
      console.error("API Route - Access Denied: Insufficient privileges.");
      return NextResponse.json({ error: "Access Denied: Insufficient privileges." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    console.log("API Route - Fetching supplier management items from Supabase...");

    let { data: supplierManagementItems, error: fetchError } = await localAdminSupabase
      .from('supplier_management_items') // Corrected table name to remove duplicate 'public.'
      .select('*'); // Select all columns for now
    console.log("API Route - SupplierManagementItems Data:", supplierManagementItems);
    if (fetchError) {
      console.error("API Route - Error fetching supplier management items:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!supplierManagementItems) {
      supplierManagementItems = [];
    }

    // Apply sorting
    supplierManagementItems.sort((a, b) => {
      let valA: string | number | null = null;
      let valB: string | number | null = null;

      if (sortBy === "name") {
        valA = a.name;
        valB = b.name;
      } else if (sortBy === "created_at") {
        valA = a.created_at;
        valB = b.created_at;
      } else if (sortBy === "stock") {
        valA = a.stock;
        valB = b.stock;
      } else if (sortBy === "price") {
        valA = a.price;
        valB = b.price;
      } else if (sortBy === "supplier_shop") { // New sorting option
        valA = a.supplier_shop;
        valB = b.supplier_shop;
      } else if (sortBy === "date") { // New sorting option
        valA = a.date;
        valB = b.date;
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

    return NextResponse.json(supplierManagementItems);
  } catch (error: unknown) {
    console.error("API Route - Unexpected error in supplier management item list API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
