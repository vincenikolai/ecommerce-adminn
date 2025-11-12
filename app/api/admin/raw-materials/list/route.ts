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

    // Define allowed roles for raw materials access
    const allowedRoles = [
      RAW_MATERIAL_MANAGER_ROLE,
      SALES_QUOTATION_MANAGER_ROLE,
      PURCHASE_QUOTATION_MANAGER_ROLE,
      PURCHASING_MANAGER_ROLE,
      WAREHOUSE_STAFF_ROLE,
      FINANCE_MANAGER_ROLE,
    ];

    if (
      !profile ||
      (!allowedRoles.includes(profile.role) && session.user?.email !== ADMIN_EMAIL)
    ) {
      return NextResponse.json(
        { error: "Access Denied: Insufficient privileges." },
        { status: 403 }
      );
    }

    console.log("Fetching raw materials from Supabase...");
    try {
      // First, fetch products from products table
      const { data: products, error: productsError } = await localAdminSupabase
        .from("products")
        .select(`id, name, category, stock, createdAt, updatedAt, supplierid`);

      if (productsError) {
        console.error("Error fetching products:", productsError);
      }

      // Sync products into RawMaterial table
      if (products && products.length > 0) {
        console.log(`Syncing ${products.length} products to RawMaterial table...`);
        
        for (const product of products) {
          // Check if product already exists in RawMaterial
          const { data: existingMaterial } = await localAdminSupabase
            .from("RawMaterial")
            .select("id")
            .eq("id", product.id)
            .single();

          if (!existingMaterial) {
            // Insert new product as finished product in RawMaterial
            const { error: insertError } = await localAdminSupabase
              .from("RawMaterial")
              .insert({
                id: product.id,
                name: product.name,
                category: product.category,
                materialType: 'Finished Product',
                unitOfMeasure: 'unit',
                stock: product.stock,
                defaultSupplierId: product.supplierid,
              });

            if (insertError) {
              console.error(`Error inserting product ${product.id} into RawMaterial:`, insertError);
            } else {
              console.log(`Inserted product ${product.id} (${product.name}) into RawMaterial`);
            }
          } else {
            // Update existing record to ensure it's marked as Finished Product
            const { error: updateError } = await localAdminSupabase
              .from("RawMaterial")
              .update({
                name: product.name,
                category: product.category,
                materialType: 'Finished Product',
                unitOfMeasure: 'unit',
                stock: product.stock,
                defaultSupplierId: product.supplierid,
              })
              .eq("id", product.id);

            if (updateError) {
              console.error(`Error updating product ${product.id} in RawMaterial:`, updateError);
            } else {
              console.log(`Updated product ${product.id} (${product.name}) in RawMaterial`);
            }
          }
        }
      }

      // Now fetch all raw materials (including synced products)
      // Check for materialType filter in query params
      const { searchParams } = new URL(req.url);
      const materialTypeFilter = searchParams.get('materialType');

      let query = localAdminSupabase
        .from("RawMaterial")
        .select(
          `id, name, category, materialType, unitOfMeasure, stock, createdAt, updatedAt, defaultSupplierId, defaultSupplier:supplier_management_items(id, company_name, contact_person, email, phone)`
        );

      // Apply filter if materialType is specified
      if (materialTypeFilter && (materialTypeFilter === 'Raw Material' || materialTypeFilter === 'Finished Product')) {
        query = query.eq('materialType', materialTypeFilter);
      }

      const { data: rawMaterials, error } = await query;

      if (error) {
        console.error("Error fetching raw materials:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      console.log("API Route - RawMaterial Data (including synced products):", rawMaterials);

      return NextResponse.json(rawMaterials || []);
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

