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

  // Role check - allow multiple roles
  const { data: profile, error: profileError } = await localAdminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const ADMIN_EMAIL = "eastlachemicals@gmail.com";
  const allowedRoles = [
    "sales_quotation_manager",
    "purchase_quotation_manager",
    "purchasing_manager",
    "warehouse_staff",
    "finance_manager",
    "raw_material_manager",
  ];

  if (
    profileError ||
    !profile ||
    (!allowedRoles.includes(profile.role) && user.email !== ADMIN_EMAIL)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get query parameters for sorting and filtering
  const { searchParams } = new URL(req.url);
  const sortBy = searchParams.get('sortBy') || 'createdat';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  const statusFilter = searchParams.get('status') || 'all';

  console.log("API Route - Fetching purchase orders from Supabase...");

  try {
    console.log("DEBUG: localAdminSupabase client initialized.");
    
    let query = localAdminSupabase
      .from("purchaseorder")
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
        supplier:supplier_management_items(id, company_name, contact_person, email, phone),
        materials:purchaseordermaterial(id, purchaseorderid, rawmaterialid, quantity, unitprice, createdat, updatedat, rawMaterial:RawMaterial(id, name))
        `
      );

    // Apply status filter
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    // Apply sorting
    if (sortBy === 'createdat') {
      query = query.order('createdat', { ascending: sortOrder === 'asc' });
    } else if (sortBy === 'poReferenceNumber') {
      query = query.order('poReferenceNumber', { ascending: sortOrder === 'asc' });
    } else if (sortBy === 'deliveryDate') {
      query = query.order('deliveryDate', { ascending: sortOrder === 'asc' });
    } else if (sortBy === 'totalAmount') {
      query = query.order('totalAmount', { ascending: sortOrder === 'asc' });
    } else {
      query = query.order('createdat', { ascending: sortOrder === 'asc' });
    }

    console.log("DEBUG: Supabase query object before execution:", query);

    const { data: purchaseOrders, error: ordersError } = await query;
    console.log("DEBUG: Supabase query result - data:", purchaseOrders);
    console.log("DEBUG: Supabase query result - error:", ordersError);
    
    // Check each PO's materials
    if (purchaseOrders) {
      purchaseOrders.forEach((po, index) => {
        console.log(`DEBUG: PO ${index} (${po.poReferenceNumber}) - materials count:`, (po as any).materials?.length || 0);
        console.log(`DEBUG: PO ${index} materials:`, (po as any).materials);
      });
    }

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