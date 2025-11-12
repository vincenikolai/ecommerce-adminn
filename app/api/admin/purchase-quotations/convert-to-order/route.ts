import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { UserProfile, UserRole } from "@/types/user";

interface QuotationData {
  id: string;
  supplierId: string | null;
  quotedPrice: number;
  validityDate: string;
  isOrder: boolean;
  createdAt: string;
  updatedAt: string;
  // Add other fields from PurchaseQuotation table that you fetch
}

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const SALES_QUOTATION_MANAGER_ROLE: UserRole = "sales_quotation_manager";

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

    const cookieStore = cookies();
    const authClient = createRouteHandlerClient({ cookies: () => cookieStore });
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
      (profile.role !== SALES_QUOTATION_MANAGER_ROLE &&
        session.user?.email !== ADMIN_EMAIL)
    ) {
      return NextResponse.json(
        { error: "Access Denied: Insufficient privileges." },
        { status: 403 }
      );
    }

    const { quotationId, materialIds } = await req.json();

    console.log("DEBUG: convert-to-order API - Received quotationId:", quotationId);

    if (
      !quotationId ||
      !materialIds ||
      !Array.isArray(materialIds) ||
      materialIds.length === 0
    ) {
      return NextResponse.json(
        { error: "Quotation ID and material IDs are required." },
        { status: 400 }
      );
    }

    // Fetch the quotation
    const { data: fetchedQuotation, error: quotationError } = await localAdminSupabase
      .from("PurchaseQuotation") 
      .select("id, supplierId, quotedPrice, validityDate, isOrder, createdAt, updatedAt") // Explicitly select columns
      .eq("id", quotationId)
      .single();

    const quotation = fetchedQuotation as QuotationData; // Cast to local interface

    console.log("DEBUG: convert-to-order API - Quotation fetch result (data, error):", quotation, quotationError);

    if (quotationError || !quotation) {
      return NextResponse.json(
        { error: "Sales quotation not found." },
        { status: 404 }
      );
    }

    if (quotation.isOrder) { 
      return NextResponse.json(
        {
          error: "This quotation has already been converted to a sales order.",
        },
        { status: 400 }
      );
    }

    // Fetch all materials for this quotation first
    const { data: allQuotationMaterials, error: allMaterialsError } =
      await localAdminSupabase
        .from("purchasequotationmaterial") // Corrected to lowercase per prisma/schema.prisma
        .select("id, purchasequotationid, rawmaterialid, quantity") // Select specific columns, use lowercase for actual DB column names
        .eq("purchasequotationid", quotationId); // Use lowercase for actual DB column name

    if (allMaterialsError || !allQuotationMaterials) {
      return NextResponse.json(
        { error: "Failed to fetch quotation materials." },
        { status: 500 }
      );
    }

    // Filter to only selected materials (materialIds should be PurchaseQuotationMaterial IDs)
    const quotationMaterials = allQuotationMaterials.filter((m) =>
      materialIds.includes(m.id)
    );

    if (quotationMaterials.length === 0) {
      return NextResponse.json(
        { error: "Selected materials not found." },
        { status: 404 }
      );
    }

    // Create Sales Order (copy from PurchaseQuotation where isOrder = TRUE)
    const { data: salesOrder, error: orderError } = await localAdminSupabase
      .from("SalesOrder")
      .insert([
        {
          id: quotation.id, // Use the same ID as the quotation
          supplierId: quotation.supplierId,
          quotedPrice: quotation.quotedPrice,
          validityDate: quotation.validityDate,
          isOrder: true,
          createdAt: quotation.createdAt,
          updatedAt: quotation.updatedAt,
        },
      ])
      .select()
      .single();

    if (orderError || !salesOrder) {
      console.error("Error creating sales order:", orderError);
      return NextResponse.json(
        { error: orderError?.message || "Failed to create sales order." },
        { status: 500 }
      );
    }

    // Copy materials to SalesOrderMaterial
    const salesOrderMaterials = quotationMaterials.map((material) => {
      return {
        id: material.id, // Use the same ID as the quotation material
        salesOrderId: salesOrder.id,
        rawMaterialId: material.rawmaterialid,
        quantity: material.quantity,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    const { error: orderMaterialsError } = await localAdminSupabase
      .from("SalesOrderMaterial")
      .insert(salesOrderMaterials);

    if (orderMaterialsError) {
      // Rollback - delete the sales order
      await localAdminSupabase
        .from("SalesOrder")
        .delete()
        .eq("id", salesOrder.id);
      console.error(
        "Error creating sales order materials:",
        orderMaterialsError
      );
      return NextResponse.json(
        { error: "Failed to create sales order materials." },
        { status: 500 }
      );
    }

    // Update the quotation's isOrder flag to TRUE instead of deleting
    const { error: updateQuotationError } = await localAdminSupabase
      .from("PurchaseQuotation")
      .update({ isOrder: true })
      .eq("id", quotationId);

    if (updateQuotationError) {
      console.error("Error updating quotation isOrder flag:", updateQuotationError);
      // Don't fail the whole operation, just log the error
    }

    return NextResponse.json({
      message: "Sales quotation converted to sales order successfully",
      salesOrder,
    });
  } catch (error: unknown) {
    console.error("Unexpected error in convert to order API:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
