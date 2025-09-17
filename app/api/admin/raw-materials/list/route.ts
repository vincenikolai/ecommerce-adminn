import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UserProfile, UserRole } from '@/types/user';

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const RAW_MATERIAL_MANAGER_ROLE: UserRole = "raw_material_manager";
const PURCHASE_QUOTATION_MANAGER_ROLE: UserRole = "purchase_quotation_manager"; // Define the Purchase Quotation Manager Role
const PURCHASING_MANAGER_ROLE: UserRole = "purchasing_manager";
const WAREHOUSE_STAFF_ROLE: UserRole = "warehouse_staff";

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
      console.error("Session error:", sessionError);
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
      console.error("Error fetching user profile:", profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // Detailed logging for debugging access control
    console.log("Debug - profile.role:", profile?.role);
    console.log("Debug - RAW_MATERIAL_MANAGER_ROLE:", RAW_MATERIAL_MANAGER_ROLE);
    console.log("Debug - session.user?.email:", session.user?.email);
    console.log("Debug - ADMIN_EMAIL:", ADMIN_EMAIL);
    console.log("Debug - profile.role === RAW_MATERIAL_MANAGER_ROLE:", profile?.role === RAW_MATERIAL_MANAGER_ROLE);
    console.log("Debug - profile.role === PURCHASE_QUOTATION_MANAGER_ROLE:", profile?.role === PURCHASE_QUOTATION_MANAGER_ROLE);
    console.log("Debug - profile.role === PURCHASING_MANAGER_ROLE:", profile?.role === PURCHASING_MANAGER_ROLE);
    console.log("Debug - profile.role === WAREHOUSE_STAFF_ROLE:", profile?.role === WAREHOUSE_STAFF_ROLE);
    console.log("Debug - session.user?.email === ADMIN_EMAIL:", session.user?.email === ADMIN_EMAIL);

    const allowedRoles = [
      RAW_MATERIAL_MANAGER_ROLE,
      PURCHASE_QUOTATION_MANAGER_ROLE,
      PURCHASING_MANAGER_ROLE,
      WAREHOUSE_STAFF_ROLE,
    ];

    if (!profile || (!allowedRoles.includes(profile.role) && session.user?.email !== ADMIN_EMAIL)) {
      return NextResponse.json({ error: "Access Denied: Insufficient privileges for Raw Material Manager." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    console.log("Fetching raw materials from Supabase...");

    let { data: rawMaterials, error: rawMaterialsError } = await localAdminSupabase
      .from('RawMaterial')
      .select(`
        id,
        name,
        category,
        unitOfMeasure,
        stock,
        createdAt,
        updatedAt,
        defaultSupplierId
      `);

    if (rawMaterialsError) {
      console.error("Error fetching raw materials:", rawMaterialsError);
      return NextResponse.json({ error: rawMaterialsError.message }, { status: 500 });
    }

    if (!rawMaterials) {
      rawMaterials = [];
    }

    let rawMaterialsWithSuppliers = rawMaterials;

    if (rawMaterials && rawMaterials.length > 0) {
      const supplierIds = rawMaterials.map((rm) => rm.defaultSupplierId).filter(Boolean);
      if (supplierIds.length > 0) {
        const { data: suppliersData, error: suppliersError } = await localAdminSupabase
          .from('supplier_management_items') // Corrected table name
          .select('id, name, supplier_shop')
          .in('id', supplierIds as string[]);

        if (suppliersError) {
          console.error("Error fetching suppliers:", suppliersError);
          return NextResponse.json({ error: suppliersError.message }, { status: 500 });
        }

        const suppliersMap = new Map(suppliersData?.map(s => [s.id, { name: s.name, supplier_shop: s.supplier_shop }]));

        rawMaterialsWithSuppliers = rawMaterials.map(rm => ({
          ...rm,
          defaultSupplier: rm.defaultSupplierId ? { 
            name: suppliersMap.get(rm.defaultSupplierId)?.name || 'N/A',
            supplier_shop: suppliersMap.get(rm.defaultSupplierId)?.supplier_shop || 'N/A'
          } : undefined,
        }));
      }
    }

    // Apply sorting
    rawMaterialsWithSuppliers.sort((a, b) => {
      let valA: string | number | null = null;
      let valB: string | number | null = null;

      if (sortBy === "name") {
        valA = a.name;
        valB = b.name;
      } else if (sortBy === "createdAt") {
        valA = a.createdAt;
        valB = b.createdAt;
      } else if (sortBy === "stock") {
        valA = a.stock;
        valB = b.stock;
      } else if (sortBy === "category") {
        valA = a.category;
        valB = b.category;
      } else if (sortBy === "unitOfMeasure") {
        valA = a.unitOfMeasure;
        valB = b.unitOfMeasure;
      } else if (sortBy === "price") { // Added from remote
        valA = (a as any).price; // Cast to any to access price from remote, will be refined if RawMaterial has price
        valB = (b as any).price;
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

    return NextResponse.json(rawMaterialsWithSuppliers);
  } catch (error: unknown) {
    console.error("Unexpected error in raw material list API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
