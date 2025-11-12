import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { adminSupabase } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin Supabase client

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
    const cookieStore = await cookies();
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin Supabase client

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

    // Calculate totals (use provided values or calculate)
    const subtotal = cartItems.reduce(
      (sum, item) => sum + (item.product?.price || 0) * item.quantity,
      0
    );
    const taxAmount = orderData.taxAmount !== undefined ? orderData.taxAmount : subtotal * 0.1; // 10% tax
    const shippingAmount = orderData.shippingAmount !== undefined 
      ? orderData.shippingAmount 
      : (orderData.deliveryMethod === "Pickup" ? 0 : 5);
    const totalAmount = orderData.totalAmount !== undefined 
      ? orderData.totalAmount 
      : subtotal + taxAmount + shippingAmount;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)
      .toUpperCase()}`;

    // Map delivery method to match schema
    const deliveryMethodMap: Record<string, string> = {
      "Standard": "Standard",
      "Express": "Express",
      "Overnight": "Overnight",
      "Pickup": "Pickup",
    };
    const mappedDeliveryMethod = deliveryMethodMap[orderData.deliveryMethod] || "Standard";

    // Map payment method
    const paymentMethodMap: Record<string, string> = {
      "Cash": "Cash",
      "Cash on Delivery": "Cash",
    };
    const mappedPaymentMethod = paymentMethodMap[orderData.paymentMethod] || "Cash";

    // Create order with new schema
    const { data: newOrder, error: orderError } = await adminSupabase
      .from("orders")
      .insert([
        {
          orderNumber,
          customerName: orderData.customerName || 
            (session.user.user_metadata?.full_name ?? 
              session.user.email ?? 
              "Customer"),
          customerEmail: orderData.customerEmail || session.user.email || "",
          customerPhone: orderData.customerPhone || null,
          shippingAddress: orderData.shippingAddress || {},
          billingAddress: orderData.billingAddress || orderData.shippingAddress || {},
          status: "Pending",
          paymentMethod: mappedPaymentMethod,
          deliveryMethod: mappedDeliveryMethod,
          totalAmount: totalAmount,
          taxAmount: taxAmount,
          shippingAmount: shippingAmount,
          notes: orderData.notes || null,
          userId: session.user.id,
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
    const orderItemsData = cartItems.map((item) => {
      const unit = item.product?.price || 0;
      const total = unit * item.quantity;
      return {
        orderId: newOrder.id,
        productId: item.productId,
        quantity: item.quantity,
        // Support both schemas: save unit price in both fields if present
        price: unit,
        unitPrice: unit,
        totalPrice: total,
      } as any;
    });

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
