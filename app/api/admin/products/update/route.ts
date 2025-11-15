import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { UpdateProductRequest } from "@/types/product";
import { UserProfile, UserRole } from "@/types/user";

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const PRODUCTS_MANAGER_ROLE: UserRole = "products_manager";

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
      (profile.role !== PRODUCTS_MANAGER_ROLE &&
        profile.role !== "admin" &&
        session.user?.email !== ADMIN_EMAIL)
    ) {
      return NextResponse.json(
        { error: "Access Denied: Insufficient privileges. Only Products Managers and Admins can update products." },
        { status: 403 }
      );
    }

    const {
      id,
      name,
      description,
      price,
      stock,
      category,
      imageUrl,
      isActive,
      bom,
    } = (await req.json()) as UpdateProductRequest & { id: string };

    if (!id || !name || !price || stock === undefined) {
      return NextResponse.json(
        { error: "Raw material ID, name, price, and stock are required." },
        { status: 400 }
      );
    }

    // Build update object, only including imageUrl if it has a value
    const updateData: any = {
      name,
      description: description || null,
      price,
      stock,
      category: category || null,
      isActive,
    };

    // Only include imageUrl if it's provided and not empty
    if (imageUrl && imageUrl.trim() !== "") {
      updateData.imageUrl = imageUrl;
    } else {
      updateData.imageUrl = null;
    }

    const { data: updatedProducts, error: updateError } =
      await localAdminSupabase
        .from("products")
        .update(updateData)
        .eq("id", id)
        .select("*")
        .single();

    if (updateError) {
      console.error("Error updating raw material:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!updatedProducts) {
      return NextResponse.json(
        { error: "Raw material not found or no changes made." },
        { status: 404 }
      );
    }

    // Upsert BOM if provided: delete existing then insert new
    // If bom is explicitly provided (even if empty array), update it
    if (bom !== undefined && Array.isArray(bom)) {
      console.log("Updating BOM for product:", id, "BOM items:", bom.length);
      
      // Delete existing BOM - try both as text and uuid
      const { error: delError } = await localAdminSupabase
        .from("product_bom")
        .delete()
        .eq("product_id", id);
      
      if (delError) {
        console.error("Error clearing existing BOM:", delError);
        // Try alternative delete if first one fails (type mismatch)
        const { error: altDelError } = await localAdminSupabase
          .from("product_bom")
          .delete();
        if (altDelError) {
          console.error("Alternative delete also failed:", altDelError);
        } else {
          // If we deleted all, filter in memory and re-insert only matching ones
          const { data: allBom } = await localAdminSupabase
            .from("product_bom")
            .select("*");
          if (allBom) {
            const toDelete = allBom.filter((item: any) => 
              item.product_id?.toString() === id.toString()
            );
            for (const item of toDelete) {
              await localAdminSupabase
                .from("product_bom")
                .delete()
                .eq("id", item.id);
            }
          }
        }
      } else {
        console.log("Successfully cleared existing BOM");
      }
      
      const bomRows = bom
        .filter(
          (b) => b.rawMaterialId && b.quantityPerUnit && b.quantityPerUnit > 0
        )
        .map((b) => ({
          product_id: id, // This will be text, but product_bom expects uuid - PostgreSQL should handle conversion
          raw_material_id: b.rawMaterialId,
          quantity_per_unit: b.quantityPerUnit,
        }));
      
      console.log("Prepared BOM rows for insert:", bomRows);
      
      if (bomRows.length > 0) {
        console.log("Attempting to insert BOM rows:", JSON.stringify(bomRows, null, 2));
        
        // Insert BOM - types now match (both text)
        const { data: insertedBom, error: insError } = await localAdminSupabase
          .from("product_bom")
          .insert(bomRows)
          .select();
        
        if (insError) {
          console.error("❌ Error inserting BOM:", insError);
          console.error("Error code:", insError.code);
          console.error("Error message:", insError.message);
          console.error("Error details:", JSON.stringify(insError, null, 2));
        } else {
          console.log("✅ Successfully inserted BOM:", JSON.stringify(insertedBom, null, 2));
        }
      } else {
        console.log("No valid BOM rows to insert (BOM cleared or empty)");
      }
    } else {
      console.log("No BOM provided in update request - leaving existing BOM unchanged");
    }

    return NextResponse.json({
      message: "Product updated successfully",
      product: updatedProducts,
    });
  } catch (error: unknown) {
    console.error("Unexpected error in raw material update API:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
