import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CreateProductRequest } from "@/types/product";
import { UserProfile, UserRole } from "@/types/user";

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const RAW_MATERIAL_MANAGER_ROLE: UserRole = "raw_material_manager"; // Renamed role constant

export async function POST(req: Request) {
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
      (profile.role !== RAW_MATERIAL_MANAGER_ROLE &&
        session.user?.email !== ADMIN_EMAIL)
    ) {
      return NextResponse.json(
        { error: "Access Denied: Insufficient privileges." },
        { status: 403 }
      );
    }

    const {
      name,
      description,
      price,
      stock,
      category,
      imageUrl,
      isActive,
      bom,
    } = (await req.json()) as CreateProductRequest;

    if (!name || !price || stock === undefined) {
      return NextResponse.json(
        { error: "Name, price, and stock for raw material are required." },
        { status: 400 }
      );
    }

    const { data: createdProducts, error: insertError } =
      await localAdminSupabase
        .from("products")
        .insert([
          { name, description, price, stock, category, imageUrl, isActive },
        ])
        .select("*")
        .single();

    if (insertError) {
      console.error("Error inserting raw material:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // If BOM provided, insert mappings
    if (bom && Array.isArray(bom) && createdProducts) {
      const bomRows = bom
        .filter(
          (b) => b.rawMaterialId && b.quantityPerUnit && b.quantityPerUnit > 0
        )
        .map((b) => ({
          product_id: createdProducts.id,
          raw_material_id: b.rawMaterialId,
          quantity_per_unit: b.quantityPerUnit,
        }));

      if (bomRows.length > 0) {
        const { error: bomError } = await localAdminSupabase
          .from("product_bom")
          .insert(bomRows);
        if (bomError) {
          console.error("Error inserting product BOM:", bomError);
        }
      }
    }

    return NextResponse.json({
      message: "Product created successfully",
      product: createdProducts,
    });
  } catch (error: unknown) {
    console.error("Unexpected error in raw material creation API:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
