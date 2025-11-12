import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { UserProfile, UserRole } from "@/types/user";

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const SALES_MANAGER_ROLE: UserRole = "sales_manager";

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
      console.error("API Route - Session error:", sessionError);
      return NextResponse.json(
        { error: sessionError.message },
        { status: 401 }
      );
    }

    if (!session) {
      console.error("API Route - Access Denied: No active session.");
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
      console.error("API Route - Error fetching user profile:", profileError);
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
    }

    if (
      !profile ||
      (profile.role !== SALES_MANAGER_ROLE &&
        session.user?.email !== ADMIN_EMAIL)
    ) {
      console.error(
        "API Route - Access Denied: Insufficient privileges for Sales Manager."
      );
      return NextResponse.json(
        {
          error:
            "Access Denied: Insufficient privileges for Sales Manager.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const statusFilter = searchParams.get("status") || "all";

    console.log("API Route - Fetching customer orders from Supabase...");

    // Fetch customer orders (where orderNumber is not null, indicating it's a customer order)
    let query = localAdminSupabase
      .from("PurchaseQuotation")
      .select(`
        *,
        items:PurchaseQuotationItem(
          id,
          productId,
          quantity,
          unitPrice,
          totalPrice,
          product:products(id, name, price)
        )
      `)
      .not('orderNumber', 'is', null); // Only fetch customer orders

    // Filter by status
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data: orders, error: ordersError } = await query;

    if (ordersError) {
      console.error(
        "API Route - Error fetching customer orders:",
        ordersError
      );
      return NextResponse.json(
        { error: ordersError.message },
        { status: 500 }
      );
    }

    let fullOrders = orders || [];

    // Apply sorting
    fullOrders.sort((a, b) => {
      let valA: string | number | null = null;
      let valB: string | number | null = null;

      if (sortBy === "createdAt") {
        valA = a.createdAt;
        valB = b.createdAt;
      } else if (sortBy === "orderNumber") {
        valA = a.orderNumber || "";
        valB = b.orderNumber || "";
      } else if (sortBy === "customerName") {
        valA = a.customerName || "";
        valB = b.customerName || "";
      } else if (sortBy === "totalAmount") {
        valA = a.totalAmount || 0;
        valB = b.totalAmount || 0;
      }

      if (valA === null && valB === null) return 0;
      if (valA === null) return sortOrder === "asc" ? 1 : -1;
      if (valB === null) return sortOrder === "asc" ? -1 : 1;

      if (valA < valB) {
        return sortOrder === "asc" ? -1 : 1;
      } else if (valA > valB) {
        return sortOrder === "asc" ? 1 : -1;
      }
      return 0;
    });

    console.log("API Route - Successfully fetched customer orders. Count:", fullOrders.length);
    return NextResponse.json(fullOrders);
  } catch (error: unknown) {
    console.error(
      "API Route - Unexpected error in customer order list API:",
      error
    );
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
