import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { UpdateOrderStatusRequest, CancelOrderRequest } from "@/types/order";

export async function GET(
  req: Request,
  { params }: { params: { orderId: string } }
) {
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

    const { data: order, error } = await adminSupabase
      .from("orders")
      .select(
        `
        *,
        items (
          *,
          product (*)
        ),
        orderHistory (*)
      `
      )
      .eq("id", params.orderId)
      .single();

    if (error) {
      console.error("Error fetching order:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if user owns this order
    if (order.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json(order);
  } catch (error: unknown) {
    console.error("Unexpected error in get order API:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { orderId: string } }
) {
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

    const updateData: UpdateOrderStatusRequest = await req.json();

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

    // Get current order
    const { data: order, error: orderError } = await adminSupabase
      .from("orders")
      .select("*")
      .eq("id", params.orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if user owns this order
    if (order.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if order can be cancelled (only pending orders)
    if (updateData.status === "Cancelled" && order.status !== "Pending") {
      return NextResponse.json(
        { error: "Only pending orders can be cancelled" },
        { status: 400 }
      );
    }

    // Update order
    const { error: updateError } = await adminSupabase
      .from("orders")
      .update({
        status: updateData.status,
        cancelledAt:
          updateData.status === "Cancelled" ? new Date().toISOString() : null,
        cancelledBy: updateData.status === "Cancelled" ? session.user.id : null,
      })
      .eq("id", params.orderId);

    if (updateError) {
      console.error("Error updating order:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Add to order history
    const { error: historyError } = await adminSupabase
      .from("order_history")
      .insert([
        {
          orderId: params.orderId,
          status: updateData.status,
          notes: updateData.notes,
          changedBy: session.user.id,
        },
      ]);

    if (historyError) {
      console.error("Error adding to order history:", historyError);
      // Non-critical error, don't fail the update
    }

    // If order is cancelled, restore stock
    if (updateData.status === "Cancelled") {
      const { data: orderItems, error: itemsError } = await adminSupabase
        .from("order_items")
        .select(
          `
          *,
          product (*)
        `
        )
        .eq("orderId", params.orderId);

      if (!itemsError && orderItems) {
        for (const item of orderItems) {
          const { error: stockError } = await adminSupabase
            .from("products")
            .update({
              stock: item.product.stock + item.quantity,
            })
            .eq("id", item.productId);

          if (stockError) {
            console.error("Error restoring product stock:", stockError);
          }
        }
      }
    }

    return NextResponse.json({ message: "Order updated successfully" });
  } catch (error: unknown) {
    console.error("Unexpected error in update order API:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

