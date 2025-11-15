import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { UserProfile, UserRole } from "@/types/user";

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const PRODUCTS_MANAGER_ROLE: UserRole = "products_manager";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
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

    const authClient = createRouteHandlerClient({ cookies: () => cookies() });
    const {
      data: { session },
      error: sessionError,
    } = await authClient.auth.getSession();

    if (sessionError) {
      console.error("Session error:", sessionError);
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

    // Fetch the user's role from the profiles table
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
      (profile.role !== PRODUCTS_MANAGER_ROLE &&
        profile.role !== "admin" &&
        session.user?.email !== ADMIN_EMAIL)
    ) {
      return NextResponse.json(
        { error: "Access Denied: Insufficient privileges. Only Products Managers and Admins can access BOM data." },
        { status: 403 }
      );
    }

    const { productId } = await params;

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required." },
        { status: 400 }
      );
    }

    // Fetch BOM for the product
    // Both product_id and products.id are now text type, so direct query works
    console.log("Fetching BOM for productId:", productId);
    
    let bomData: any[] = [];
    let bomError: any = null;

    try {
      // Direct query now works since both are text type
      const { data: bomDataResult, error: bomQueryError } = await localAdminSupabase
        .from("product_bom")
        .select("*")
        .eq("product_id", productId);
      
      if (bomQueryError) {
        console.error("Error fetching BOM data:", bomQueryError);
        bomError = bomQueryError;
      } else {
        bomData = bomDataResult || [];
        console.log(`Found ${bomData.length} BOM items for product ${productId}`);
      }
    } catch (err) {
      console.error("Exception while fetching BOM:", err);
      bomError = err;
    }

    if (bomError) {
      console.error("Error fetching BOM:", bomError);
      // Return empty array instead of error - BOM is optional
      // This prevents errors from blocking the UI when BOM table doesn't exist or has issues
      const errorMessage = bomError.message || String(bomError);
      console.log("BOM fetch had an error, but returning empty array (BOM is optional):", errorMessage);
      return NextResponse.json([]);
    }

    console.log("BOM data from database:", bomData);

    // Transform the data to match the expected format
    const bom = (bomData || []).map((item: any) => ({
      rawMaterialId: item.raw_material_id,
      quantityPerUnit: parseFloat(item.quantity_per_unit?.toString() || "0"),
    }));

    console.log("Transformed BOM:", bom);
    return NextResponse.json(bom);
  } catch (error: unknown) {
    console.error("Unexpected error in BOM fetch API:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

