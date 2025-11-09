import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Database } from "@/lib/database.types";

export async function GET(req: Request) {
  const cookieStore = cookies();
  const localAdminSupabase = createRouteHandlerClient<Database>({
    cookies: () => cookieStore,
  });

  // Check if we have a session
  const { data: sessionData, error: sessionError } =
    await localAdminSupabase.auth.getSession();

  if (sessionError) {
    console.error("Session error:", sessionError);
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }

  const user = sessionData.session?.user;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Basic role check (adjust as per your role management)
  const { data: profile, error: profileError } = await localAdminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "sales_quotation_manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  console.log("API Route - Fetching purchase orders from Supabase...");

  try {
    console.log("DEBUG: localAdminSupabase client initialized.");
    const query = localAdminSupabase
      .from("purchaseorder") // Reverted to lowercase as per database hint
      .select(
        `
        id,
        purchaseQuotationId,
        supplierId,
        orderDate,
        deliveryDate,
        poReferenceNumber,
        totalAmount,
        status,
        createdat,
        updatedat,
        supplier:supplier_management_items(id, name, supplier_shop),
        materials:purchaseordermaterial(id, purchaseorderid, rawmaterialid, quantity, unitprice, createdat, updatedat, rawMaterial:RawMaterial(id, name))
        `
      );

    console.log("DEBUG: Supabase query object before execution:", query);

    const { data: purchaseOrders, error: ordersError } = await query;
    console.log("DEBUG: Supabase query result - data:", purchaseOrders);
    console.log("DEBUG: Supabase query result - error:", ordersError);

    if (ordersError) {
      console.error("API Route - Error fetching purchase orders:", ordersError);
      return NextResponse.json(
        { error: ordersError.message },
        { status: 500 }
      );
    }

    if (!purchaseOrders || purchaseOrders.length === 0) {
      console.log("API Route - No purchase orders found.");
      return NextResponse.json([]);
    }

    console.log("API Route - Successfully fetched purchase orders. Count:", purchaseOrders.length);
    console.log("API Route - First purchase order:", JSON.stringify(purchaseOrders[0], null, 2));

    return NextResponse.json(purchaseOrders);
  } catch (error) {
    console.error("Unexpected error fetching purchase orders:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}