import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { UserProfile, UserRole } from "@/types/user";

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
      (profile.role !== SALES_QUOTATION_MANAGER_ROLE &&
        session.user?.email !== ADMIN_EMAIL)
    ) {
      return NextResponse.json(
        { error: "Access Denied: Insufficient privileges." },
        { status: 403 }
      );
    }

    const { quotationId, materialIds } = await req.json();

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
    const { data: quotation, error: quotationError } = await localAdminSupabase
      .from("PurchaseQuotation")
      .select("*")
      .eq("id", quotationId)
      .single();

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
        .from("PurchaseQuotationMaterial")
        .select("*")
        .eq("purchaseQuotationId", quotationId);

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

    // Generate PO reference number
    const poReferenceNumber = `PO-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)
      .toUpperCase()}`;

    // Calculate total quantity of selected materials
    const totalQuantity = quotationMaterials.reduce(
      (sum, m) => sum + m.quantity,
      0
    );

    // Calculate total amount - use the quoted price proportionally
    // Or use the full quoted price if all materials are selected
    const totalAmount = quotation.quotedPrice;

    // Create Purchase Order (linked to the quotation)
    const { data: purchaseOrder, error: orderError } = await localAdminSupabase
      .from("purchaseorder")
      .insert([
        {
          poReferenceNumber,
          supplierId: quotation.supplierId,
          purchaseQuotationId: quotation.id,
          orderDate: new Date().toISOString().split("T")[0],
          deliveryDate: quotation.validityDate,
          status: "Pending",
          totalAmount,
        },
      ])
      .select()
      .single();

    if (orderError || !purchaseOrder) {
      console.error("Error creating purchase order:", orderError);
      return NextResponse.json(
        { error: orderError?.message || "Failed to create purchase order." },
        { status: 500 }
      );
    }

    // Calculate unit price: distribute quoted price based on quantity proportions
    // Each material gets (material.quantity / totalQuantity) * quotedPrice as unit price
    const orderMaterials = quotationMaterials.map((material) => {
      const unitPrice =
        totalQuantity > 0
          ? (material.quantity / totalQuantity) * quotation.quotedPrice
          : quotation.quotedPrice / quotationMaterials.length;

      return {
        purchaseOrderId: purchaseOrder.id,
        rawMaterialId: material.rawMaterialId,
        quantity: material.quantity,
        unitPrice: unitPrice,
      };
    });

    const { error: orderMaterialsError } = await localAdminSupabase
      .from("PurchaseOrderMaterial")
      .insert(orderMaterials);

    if (orderMaterialsError) {
      // Rollback - delete the purchase order
      await localAdminSupabase
        .from("purchaseorder")
        .delete()
        .eq("id", purchaseOrder.id);
      console.error(
        "Error creating purchase order materials:",
        orderMaterialsError
      );
      return NextResponse.json(
        { error: "Failed to create purchase order materials." },
        { status: 500 }
      );
    }

    // Mark the quotation as converted (isOrder = true)
    const { error: updateError } = await localAdminSupabase
      .from("PurchaseQuotation")
      .update({ isOrder: true })
      .eq("id", quotationId);

    if (updateError) {
      console.error("Error updating quotation:", updateError);
      // Don't fail the whole operation, just log the error
    }

    return NextResponse.json({
      message: "Sales quotation converted to sales order successfully",
      purchaseOrder,
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
