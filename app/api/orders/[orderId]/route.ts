import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { UpdateOrderStatusRequest, CancelOrderRequest } from "@/types/order";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    
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
        items:order_items(
          *,
          product:products(*)
        )
      `
      )
      .eq("id", orderId)
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
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    
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
      .eq("id", orderId)
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

    // If order is cancelled, delete it instead of updating status
    if (updateData.status === "Cancelled" && order.status === "Pending") {
      // Check if there's a delivery associated with this order
      const { data: delivery, error: deliveryError } = await adminSupabase
        .from("deliveries")
        .select("id")
        .eq("order_id", orderId)
        .single();

      if (deliveryError && deliveryError.code !== "PGRST116") {
        // PGRST116 is "not found" error, which is fine
        console.error("Error checking for delivery:", deliveryError);
      }

      if (delivery) {
        // Get rider_id before deleting delivery
        const { data: deliveryData } = await adminSupabase
          .from("deliveries")
          .select("rider_id")
          .eq("order_id", orderId)
          .single();

        // If delivery exists, delete it first (it has CASCADE but let's be explicit)
        const { error: deleteDeliveryError } = await adminSupabase
          .from("deliveries")
          .delete()
          .eq("order_id", orderId);

        if (deleteDeliveryError) {
          console.error("Error deleting delivery:", deleteDeliveryError);
          return NextResponse.json(
            { error: "Failed to delete associated delivery" },
            { status: 500 }
          );
        }

        // Update rider status back to Available if delivery was deleted
        if (deliveryData?.rider_id) {
          await adminSupabase
            .from("riders")
            .update({ status: "Available" })
            .eq("id", deliveryData.rider_id);
        }
      }

      // Check if there's a sales invoice (shouldn't exist for pending orders, but check anyway)
      const { data: invoice, error: invoiceError } = await adminSupabase
        .from("sales_invoices")
        .select("id")
        .eq("orderId", orderId)
        .single();

      if (invoiceError && invoiceError.code !== "PGRST116") {
        console.error("Error checking for invoice:", invoiceError);
      }

      if (invoice) {
        // Delete invoice items first (CASCADE should handle this, but be explicit)
        await adminSupabase
          .from("sales_invoice_items")
          .delete()
          .eq("salesInvoiceId", invoice.id);

        // Delete invoice
        const { error: deleteInvoiceError } = await adminSupabase
          .from("sales_invoices")
          .delete()
          .eq("orderId", orderId);

        if (deleteInvoiceError) {
          console.error("Error deleting invoice:", deleteInvoiceError);
          // Continue with order deletion even if invoice deletion fails
        }
      }

      // Delete the order (CASCADE will automatically delete order_items and order_history)
      const { error: deleteError } = await adminSupabase
        .from("orders")
        .delete()
        .eq("id", orderId);

      if (deleteError) {
        console.error("Error deleting order:", deleteError);
        return NextResponse.json(
          { error: deleteError.message || "Failed to delete order" },
          { status: 500 }
        );
      }

      // Note: No need to restore stock since pending orders never had stock subtracted
      return NextResponse.json({ message: "Order cancelled and deleted successfully" });
    }

    // For non-cancellation updates, update order status normally
    const { error: updateError } = await adminSupabase
      .from("orders")
      .update({
        status: updateData.status,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("Error updating order:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Add to order history if table exists
    const { error: historyError } = await adminSupabase
      .from("order_history")
      .insert([
        {
          orderId: orderId,
          status: updateData.status,
          notes: updateData.notes || null,
          changedBy: session.user.id,
        },
      ]).catch(() => {
        // Ignore if order_history table doesn't exist
        return { error: null };
      });

    if (historyError) {
      console.error("Error adding to order history:", historyError);
      // Non-critical error, don't fail the update
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

