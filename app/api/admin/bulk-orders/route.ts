import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { UserRole } from "@/types/user";
import { CreateBulkOrderRequest } from "@/types/bulk-order";

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const ALLOWED_ROLES: UserRole[] = ["admin", "order_manager", "sales_staff"];

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
    const isBackorder = searchParams.get("isBackorder");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    let query = adminSupabase.from("bulk_orders").select(
      `
        *,
        items (
          *,
          product (*)
        )
      `
    );

    if (status) {
      query = query.eq("status", status);
    }

    if (isBackorder !== null) {
      query = query.eq("isBackorder", isBackorder === "true");
    }

    const { data: bulkOrders, error } = await query;

    if (error) {
      console.error("Error fetching bulk orders:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!bulkOrders) {
      return NextResponse.json([]);
    }

    // Apply sorting
    bulkOrders.sort((a, b) => {
      let valA: string | number | null = null;
      let valB: string | number | null = null;

      if (sortBy === "createdAt") {
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
      } else if (sortBy === "totalQuantity") {
        valA = a.totalQuantity;
        valB = b.totalQuantity;
      } else if (sortBy === "status") {
        valA = a.status;
        valB = b.status;
      } else if (sortBy === "customerName") {
        valA = a.customerName;
        valB = b.customerName;
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

    return NextResponse.json(bulkOrders);
  } catch (error: unknown) {
    console.error("Unexpected error in bulk orders API:", error);
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

    const orderData: CreateBulkOrderRequest = await req.json();

    if (!orderData.items || orderData.items.length === 0) {
      return NextResponse.json(
        { error: "Bulk order must contain at least one item" },
        { status: 400 }
      );
    }

    // Validate products and check stock
    const productIds = orderData.items.map((item) => item.productId);
    const { data: products, error: productsError } = await adminSupabase
      .from("products")
      .select("*")
      .in("id", productIds)
      .eq("isActive", true);

    if (productsError) {
      console.error("Error fetching products:", productsError);
      return NextResponse.json(
        { error: productsError.message },
        { status: 500 }
      );
    }

    if (!products || products.length !== productIds.length) {
      return NextResponse.json(
        { error: "One or more products not found or unavailable" },
        { status: 400 }
      );
    }

    // Check stock availability and determine if it's a backorder
    let isBackorder = false;
    const totalQuantity = orderData.items.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    for (const item of orderData.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product || product.stock < item.quantity) {
        isBackorder = true;
        break;
      }
    }

    // Generate order number
    const orderNumber = `BULK-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)
      .toUpperCase()}`;

    // Create bulk order
    const { data: bulkOrder, error: createError } = await adminSupabase
      .from("bulk_orders")
      .insert([
        {
          orderNumber,
          customerName: orderData.customerName,
          customerEmail: orderData.customerEmail,
          customerPhone: orderData.customerPhone,
          totalQuantity,
          isBackorder,
          notes: orderData.notes,
          createdBy: session.user.id,
        },
      ])
      .select("*")
      .single();

    if (createError) {
      console.error("Error creating bulk order:", createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    // Create bulk order items
    const bulkOrderItems = orderData.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      return {
        bulkOrderId: bulkOrder.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.price,
        totalPrice: product.price * item.quantity,
        isAvailable: product.stock >= item.quantity,
        reservedAt:
          product.stock >= item.quantity ? new Date().toISOString() : null,
      };
    });

    const { error: itemsError } = await adminSupabase
      .from("bulk_order_items")
      .insert(bulkOrderItems);

    if (itemsError) {
      console.error("Error creating bulk order items:", itemsError);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // Update product stock for available items
    for (const item of orderData.items) {
      const product = products.find((p) => p.id === item.productId)!;
      if (product.stock >= item.quantity) {
        const { error: stockError } = await adminSupabase
          .from("products")
          .update({ stock: product.stock - item.quantity })
          .eq("id", item.productId);

        if (stockError) {
          console.error("Error updating product stock:", stockError);
        }
      }
    }

    return NextResponse.json({
      message: "Bulk order created successfully",
      bulkOrder: { ...bulkOrder, items: bulkOrderItems },
    });
  } catch (error: unknown) {
    console.error("Unexpected error in create bulk order API:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

