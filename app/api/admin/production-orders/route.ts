import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { UserRole } from "@/types/user";
import { CreateProductionOrderRequest } from "@/types/production-order";

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const ALLOWED_ROLES: UserRole[] = [
  "admin",
  "production_manager",
  "order_manager",
];

export async function GET(req: Request) {
  try {
    const authClient = createRouteHandlerClient({ cookies });
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error(
        "Missing environment variables for Supabase admin client"
      );
    }

    const adminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
      },
    });

    // Check user role
    const { data: profile, error: profileError } = await adminSupabase
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
      (!ALLOWED_ROLES.includes(profile.role) &&
        session.user?.email !== ADMIN_EMAIL)
    ) {
      return NextResponse.json(
        { error: "Access Denied: Insufficient privileges." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    let query = adminSupabase.from("production_orders").select(
      `
        *,
        product (*)
      `
    );

    if (status) {
      query = query.eq("status", status);
    }

    const { data: productionOrders, error } = await query;

    if (error) {
      console.error("Error fetching production orders:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!productionOrders) {
      return NextResponse.json([]);
    }

    // Apply sorting
    productionOrders.sort((a, b) => {
      let valA: string | number | null = null;
      let valB: string | number | null = null;

      if (sortBy === "createdAt") {
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
      } else if (sortBy === "deadline") {
        valA = new Date(a.deadline).getTime();
        valB = new Date(b.deadline).getTime();
      } else if (sortBy === "priority") {
        const priorityOrder = { Low: 1, Medium: 2, High: 3, Urgent: 4 };
        valA = priorityOrder[a.priority as keyof typeof priorityOrder];
        valB = priorityOrder[b.priority as keyof typeof priorityOrder];
      } else if (sortBy === "status") {
        valA = a.status;
        valB = b.status;
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

    return NextResponse.json(productionOrders);
  } catch (error: unknown) {
    console.error("Unexpected error in production orders API:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const authClient = createRouteHandlerClient({ cookies });
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error(
        "Missing environment variables for Supabase admin client"
      );
    }

    const adminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
      },
    });

    // Check user role
    const { data: profile, error: profileError } = await adminSupabase
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
      (!ALLOWED_ROLES.includes(profile.role) &&
        session.user?.email !== ADMIN_EMAIL)
    ) {
      return NextResponse.json(
        { error: "Access Denied: Insufficient privileges." },
        { status: 403 }
      );
    }

    const orderData: CreateProductionOrderRequest = await req.json();

    if (!orderData.productId || !orderData.quantity || !orderData.deadline) {
      return NextResponse.json(
        { error: "Product ID, quantity, and deadline are required" },
        { status: 400 }
      );
    }

    // Validate product exists
    const { data: product, error: productError } = await adminSupabase
      .from("products")
      .select("*")
      .eq("id", orderData.productId)
      .eq("isActive", true)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: "Product not found or unavailable" },
        { status: 404 }
      );
    }

    // Generate order number
    const orderNumber = `PROD-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)
      .toUpperCase()}`;

    // Create production order
    const { data: productionOrder, error: createError } = await adminSupabase
      .from("production_orders")
      .insert([
        {
          orderNumber,
          productId: orderData.productId,
          quantity: orderData.quantity,
          deadline: orderData.deadline,
          priority: orderData.priority || "Medium",
          notes: orderData.notes,
          createdBy: session.user.id,
          assignedTo: orderData.assignedTo,
        },
      ])
      .select("*")
      .single();

    if (createError) {
      console.error("Error creating production order:", createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Production order created successfully",
      productionOrder,
    });
  } catch (error: unknown) {
    console.error("Unexpected error in create production order API:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

