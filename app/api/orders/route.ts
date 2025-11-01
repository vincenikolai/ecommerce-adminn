import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

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

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Fetch orders for the user
    let query = adminSupabase
      .from("orders")
      .select(
        `
        *,
        items:order_items(
          *,
          product:products(*)
        )
      `
      )
      .eq("userId", session.user.id);

    if (statusFilter && statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data: orders, error: ordersError } = await query;

    if (ordersError) {
      console.error("Error fetching orders:", ordersError);
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    if (!orders) {
      return NextResponse.json([]);
    }

    // Sort orders
    const sortedOrders = [...orders].sort((a, b) => {
      let valA: any = a[sortBy];
      let valB: any = b[sortBy];

      if (sortBy === "createdAt") {
        valA = new Date(a.createdAt || 0).getTime();
        valB = new Date(b.createdAt || 0).getTime();
      }

      if (valA < valB) {
        return sortOrder === "asc" ? -1 : 1;
      } else if (valA > valB) {
        return sortOrder === "asc" ? 1 : -1;
      }
      return 0;
    });

    return NextResponse.json(sortedOrders);
  } catch (error: unknown) {
    console.error("Unexpected error in orders API:", error);
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

    const orderData = await req.json();

    // Get cart for user
    const { data: cart, error: cartError } = await adminSupabase
      .from("carts")
      .select("*")
      .eq("userId", session.user.id)
      .single();

    if (cartError || !cart) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    // Get cart items with product details
    const { data: cartItems, error: cartItemsError } = await adminSupabase
      .from("cart_items")
      .select(
        `
        *,
        product:products(*)
      `
      )
      .eq("cartId", cart.id);

    if (cartItemsError || !cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // Calculate totals
    const subtotal = cartItems.reduce(
      (sum, item) => sum + (item.product?.price || 0) * item.quantity,
      0
    );
    const tax = subtotal * 0.1; // 10% tax
    const shipping = orderData.deliveryMethod === "Pickup" ? 0 : 5;
    const totalAmount = subtotal + tax + shipping;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)
      .toUpperCase()}`;

    // Create order
    const { data: newOrder, error: orderError } = await adminSupabase
      .from("orders")
      .insert([
        {
          userId: session.user.id,
          orderNumber,
          status: "Pending",
          totalAmount,
          paymentMethod: orderData.paymentMethod || "Cash on Delivery",
          deliveryMethod: orderData.deliveryMethod || "Standard Delivery",
          deliveryStatus: "Pending",
          notes: orderData.notes || null,
        },
      ])
      .select()
      .single();

    if (orderError || !newOrder) {
      console.error("Error creating order:", orderError);
      return NextResponse.json(
        { error: orderError?.message || "Failed to create order" },
        { status: 500 }
      );
    }

    // Create order items
    const orderItemsData = cartItems.map((item) => ({
      orderId: newOrder.id,
      productId: item.productId,
      quantity: item.quantity,
      price: item.product?.price || 0,
    }));

    const { error: orderItemsError } = await adminSupabase
      .from("order_items")
      .insert(orderItemsData);

    if (orderItemsError) {
      console.error("Error creating order items:", orderItemsError);
      // Delete order if items creation fails
      await adminSupabase.from("orders").delete().eq("id", newOrder.id);
      return NextResponse.json(
        { error: orderItemsError.message },
        { status: 500 }
      );
    }

    // Create order history entry
    await adminSupabase.from("order_history").insert([
      {
        orderId: newOrder.id,
        status: "Pending",
        notes: "Order created",
      },
    ]);

    // Clear cart by deleting all cart items
    await adminSupabase.from("cart_items").delete().eq("cartId", cart.id);

    // Fetch the complete order with items
    const { data: completeOrder, error: fetchError } = await adminSupabase
      .from("orders")
      .select(
        `
        *,
        items:order_items(
          *,
          product:products(*)
        )
      `
      )
      .eq("id", newOrder.id)
      .single();

    if (fetchError) {
      console.error("Error fetching order:", fetchError);
    }

    return NextResponse.json({
      message: "Order created successfully",
      order: completeOrder || newOrder,
    });
  } catch (error: unknown) {
    console.error("Unexpected error in create order API:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
