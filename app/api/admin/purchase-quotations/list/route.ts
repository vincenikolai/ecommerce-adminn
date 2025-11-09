import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { UserProfile, UserRole } from "@/types/user";
import { PurchaseQuotation } from "@/types/purchase-quotation";
import { SupplierManagementItem } from "@/types/supplier-management";
import { RawMaterial } from "@/types/raw-material";

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const SALES_QUOTATION_MANAGER_ROLE: UserRole = "sales_quotation_manager"; // Updated role constant
const PURCHASING_MANAGER_ROLE: UserRole = "purchasing_manager";
const WAREHOUSE_STAFF_ROLE: UserRole = "warehouse_staff";
const RAW_MATERIAL_MANAGER_ROLE: UserRole = "raw_material_manager"; // Add raw_material_manager role

export async function GET(req: Request) {
  let supabaseUrl = "";
  let supabaseServiceRoleKey = "";

  try {
    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error(
        "Missing environment variables for Supabase admin client in API route"
      );
    }

    const localAdminSupabase = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const cookieStore = cookies();
    const authClient = createRouteHandlerClient({ cookies: () => cookieStore }); // Re-applying cookies fix
    const {
      data: { session },
      error: sessionError,
    } = await authClient.auth.getSession();

    if (sessionError) {
      console.error("API Route - Session error:", sessionError);
      return NextResponse.json(
        { error: sessionError.message },
        { status: 401 }
      );
    }

    if (!session) {
      console.error("API Route - Access Denied: No active session.");
      return NextResponse.json(
        { error: "Access Denied: No active session." },
        { status: 403 }
      );
    }

    // Fetch the user's role from the profiles table
    const { data: profile, error: profileError } = await localAdminSupabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (profileError) {
      console.error("API Route - Error fetching user profile:", profileError);
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
    }

    // Detailed logging for debugging access control
    console.log("Debug - profile.role:", profile?.role);
    console.log(
      "Debug - SALES_QUOTATION_MANAGER_ROLE:",
      SALES_QUOTATION_MANAGER_ROLE
    );
    console.log("Debug - PURCHASING_MANAGER_ROLE:", PURCHASING_MANAGER_ROLE);
    console.log("Debug - WAREHOUSE_STAFF_ROLE:", WAREHOUSE_STAFF_ROLE);
    console.log("Debug - session.user?.email:", session.user?.email);
    console.log("Debug - ADMIN_EMAIL:", ADMIN_EMAIL);
    console.log(
      "Debug - profile.role === SALES_QUOTATION_MANAGER_ROLE:",
      profile?.role === SALES_QUOTATION_MANAGER_ROLE
    );
    console.log(
      "Debug - profile.role === PURCHASING_MANAGER_ROLE:",
      profile?.role === PURCHASING_MANAGER_ROLE
    );
    console.log(
      "Debug - profile.role === WAREHOUSE_STAFF_ROLE:",
      profile?.role === WAREHOUSE_STAFF_ROLE
    );
    console.log(
      "Debug - session.user?.email === ADMIN_EMAIL:",
      session.user?.email === ADMIN_EMAIL
    );

    const allowedRoles = [
      SALES_QUOTATION_MANAGER_ROLE, // Updated role check
      PURCHASING_MANAGER_ROLE,
      WAREHOUSE_STAFF_ROLE,
      RAW_MATERIAL_MANAGER_ROLE, // Add raw_material_manager
      "finance_manager", // Allow Finance Manager to view purchase quotations
    ];

    if (
      !profile ||
      (!allowedRoles.includes(profile.role) &&
        session.user?.email !== ADMIN_EMAIL)
    ) {
      console.error(
        "API Route - Access Denied: Insufficient privileges for Sales Quotation Manager."
      );
      return NextResponse.json(
        {
          error:
            "Access Denied: Insufficient privileges for Sales Quotation Manager.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const showOrders = searchParams.get("showOrders") === "true"; // Flag to show converted orders
    const select = searchParams.get("select") || "*"; // Get the select parameter

    console.log("API Route - Fetching purchase quotations from Supabase...");

    let query = localAdminSupabase.from("PurchaseQuotation").select(`*,supplier:supplier_management_items(id, name, supplier_shop),materials:purchasequotationmaterial(*,rawMaterial:RawMaterial(*))`);

    // Filter based on showOrders flag
    if (showOrders) {
      // Show only converted orders
      query = query.eq("isOrder", true);
    } else {
      // Show only non-converted quotations
      query = query.eq("isOrder", false);
    }

    const { data: purchaseQuotations, error: quotationsError } = await query;
    console.log("DEBUG: purchaseQuotations after initial fetch:", JSON.stringify(purchaseQuotations, null, 2));

    if (quotationsError) {
      console.error(
        "API Route - Error fetching purchase quotations:",
        quotationsError
      );
      return NextResponse.json(
        { error: quotationsError.message },
        { status: 500 }
      );
    }

    // The eager loading in the initial select should handle materials and suppliers
    let fullPurchaseQuotations = purchaseQuotations || [];

    // Removed manual processing of suppliers and materials as they are now eager loaded.
    // No need to map again unless specific transformations are required which are not covered by the select.
    // if (purchaseQuotations && purchaseQuotations.length > 0) {
    //   const supplierIds = purchaseQuotations
    //     .map((pq) => pq.supplierId)
    //     .filter(Boolean);
    //   const quotationIds = purchaseQuotations.map((pq) => pq.id);
    //   let rawMaterialsDetailsMap = new Map<string, RawMaterial>();
    //   if (allMaterialRawMaterialIds.length > 0) {
    //     const { data: rawMaterialsData, error: rawMaterialsError } =
    //       await localAdminSupabase
    //         .from("RawMaterial")
    //         .select("id, name, unitOfMeasure")
    //         .in("id", Array.from(new Set(allMaterialRawMaterialIds)));
    //     if (rawMaterialsError) {
    //       console.error(
    //         "API Route - Error fetching raw material details for quotations:",
    //         rawMaterialsError
    //       );
    //     } else if (rawMaterialsData) {
    //       rawMaterialsData.forEach((rm) =>
    //         rawMaterialsDetailsMap.set(rm.id, rm)
    //       );
    //     }
    //   }

    //   fullPurchaseQuotations = purchaseQuotations.map((pq) => ({
    //     ...pq,
    //     supplier: pq.supplier || undefined,
    //     materials: (pq.materials || []).map((mat: any) => ({
    //       ...mat,
    //       rawMaterial: rawMaterialsDetailsMap.get(mat.rawmaterialid),
    //     })),
    //   }));
    // }

    // Apply sorting
    fullPurchaseQuotations.sort((a, b) => {
      let valA: string | number | null = null;
      let valB: string | number | null = null;

      if (sortBy === "createdAt") {
        valA = a.createdAt;
        valB = b.createdAt;
      } else if (sortBy === "quotedPrice") {
        valA = a.quotedPrice;
        valB = b.quotedPrice;
      } else if (sortBy === "validityDate") {
        valA = a.validityDate;
        valB = b.validityDate;
      } else if (sortBy === "supplierId") {
        valA = a.supplier?.supplier_shop || "";
        valB = b.supplier?.supplier_shop || "";
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

    console.log("DEBUG: Full Purchase Quotations (after processing):", fullPurchaseQuotations);
    return NextResponse.json(fullPurchaseQuotations);
  } catch (error: unknown) {
    console.error(
      "API Route - Unexpected error in purchase quotation list API:",
      error
    );
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
