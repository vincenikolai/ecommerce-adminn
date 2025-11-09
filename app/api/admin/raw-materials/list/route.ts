import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Database } from "@/lib/database.types";
import { RawMaterial } from "@/types/raw-material";
import { UserProfile, UserRole } from "@/types/user";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const RAW_MATERIAL_MANAGER_ROLE: UserRole = "raw_material_manager";
const SALES_QUOTATION_MANAGER_ROLE: UserRole = "sales_quotation_manager"; // Define the Sales Quotation Manager Role
const PURCHASE_QUOTATION_MANAGER_ROLE: UserRole = "purchase_quotation_manager"; // Define the Purchase Quotation Manager Role
const PURCHASING_MANAGER_ROLE: UserRole = "purchasing_manager";
const WAREHOUSE_STAFF_ROLE: UserRole = "warehouse_staff";
const FINANCE_MANAGER_ROLE: UserRole = "finance_manager";

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

    const localAdminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
      },
    });

    const cookieStore = cookies();
    const authClient = createRouteHandlerClient<Database>({ cookies: () => cookieStore });
    const { data: { session }, error: sessionError } = await authClient.auth.getSession();

    if (sessionError) {
      console.error("API Route - Session error:", sessionError);
      return NextResponse.json(
        { error: sessionError.message },
        { status: 401 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { error: "Access Denied: No active session." },
        { status: 403 }
      );
    }

    const { data: profile, error: profileError } = await localAdminSupabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
    }

    if (
      !profile ||
      ((profile.role !== RAW_MATERIAL_MANAGER_ROLE &&
        profile.role !== SALES_QUOTATION_MANAGER_ROLE) && // Added SALES_QUOTATION_MANAGER_ROLE
        session.user?.email !== ADMIN_EMAIL)
    ) {
      return NextResponse.json(
        { error: "Access Denied: Insufficient privileges." },
        { status: 403 }
      );
    }

    console.log("Fetching raw materials from Supabase...");
    try {
      const { data: rawMaterials, error } = await localAdminSupabase
        .from("RawMaterial")
        .select(
          `id, name, category, unitOfMeasure, stock, createdAt, updatedAt, defaultSupplier:supplier_management_items(id, name, supplier_shop)`
        );

      if (error) {
        console.error("Error fetching raw materials:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!rawMaterials) {
        return NextResponse.json([]);
      }

      console.log("API Route - RawMaterial Data:", rawMaterials);

      return NextResponse.json(rawMaterials);
    } catch (error: unknown) {
      console.error("API Route - Unexpected error in raw material list API:", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Internal Server Error" },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error("API Route - Outer unexpected error in raw material list API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

