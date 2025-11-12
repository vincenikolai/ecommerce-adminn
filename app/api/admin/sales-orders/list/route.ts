import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { UserProfile, UserRole } from "@/types/user";

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const SALES_QUOTATION_MANAGER_ROLE: UserRole = "sales_quotation_manager";

export async function GET(req: Request) {
  let supabaseUrl = '';
  let supabaseServiceRoleKey = '';

  try {
    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing environment variables for Supabase admin client in API route');
    }

    const localAdminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
      },
    });

    const authClient = createRouteHandlerClient({ cookies });
    const { data: { session }, error: sessionError } = await authClient.auth.getSession();

    if (sessionError) {
      console.error("API Route - Session error:", sessionError);
      return NextResponse.json({ error: sessionError.message }, { status: 401 });
    }

    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check
    const { data: profile, error: profileError } = await localAdminSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !profile ||
      (profile.role !== SALES_QUOTATION_MANAGER_ROLE && user.email !== ADMIN_EMAIL)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get query parameters for sorting and filtering
    const { searchParams } = new URL(req.url);
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const statusFilter = searchParams.get('status') || 'all';

    console.log("API Route - Fetching sales orders from Supabase...");

    try {
      // Fetch Sales Orders from the new SalesOrder table
      let query = localAdminSupabase
        .from("SalesOrder")
        .select(`
          *,
          supplier:supplier_management_items(id, company_name, contact_person, email, phone),
          materials:SalesOrderMaterial(
            id,
            "salesOrderId",
            "rawMaterialId",
            quantity,
            "createdAt",
            "updatedAt",
            rawMaterial:RawMaterial(id, name, "unitOfMeasure")
          )
        `);

      // Apply sorting
      if (sortBy === 'createdAt') {
        query = query.order('createdAt', { ascending: sortOrder === 'asc' });
      } else if (sortBy === 'quotedPrice') {
        query = query.order('quotedPrice', { ascending: sortOrder === 'asc' });
      } else if (sortBy === 'validityDate') {
        query = query.order('validityDate', { ascending: sortOrder === 'asc' });
      } else {
        query = query.order('createdAt', { ascending: sortOrder === 'asc' });
      }

      const { data: salesOrders, error: ordersError } = await query;

      if (ordersError) {
        console.error("API Route - Error fetching sales orders:", ordersError);
        return NextResponse.json(
          { error: ordersError.message },
          { status: 500 }
        );
      }

      if (!salesOrders || salesOrders.length === 0) {
        console.log("API Route - No sales orders found.");
        return NextResponse.json([]);
      }

      // Transform the data to match the expected format
      const transformedData = salesOrders.map(order => ({
        id: order.id,
        supplierId: order.supplierId,
        supplier: order.supplier,
        quotedPrice: order.quotedPrice,
        validityDate: order.validityDate,
        isOrder: order.isOrder,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        materials: order.materials || [],
        // Add computed fields for compatibility
        poReferenceNumber: `SO-${order.id.substring(0, 8)}`,
        orderDate: order.createdAt,
        deliveryDate: order.validityDate,
        totalAmount: order.quotedPrice,
        status: 'Approved', // Sales orders are always approved when converted
      }));

      console.log("API Route - Successfully fetched sales orders. Count:", transformedData.length);

      return NextResponse.json(transformedData);
    } catch (error) {
      console.error("Unexpected error fetching sales orders:", error);
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error("API Route - Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

