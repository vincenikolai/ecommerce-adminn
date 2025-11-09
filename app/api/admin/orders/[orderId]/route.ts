import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { UserRole } from "@/types/user";
import { UpdateOrderStatusRequest } from "@/types/order";

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const ALLOWED_ROLES: UserRole[] = ["admin", "order_manager", "sales_staff"];

export async function GET(
  req: Request,
  { params }: { params: { orderId: string } }
) {
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

    const { data: order, error } = await adminSupabase
      .from("orders")
      .select(
        `
        *,
        items:order_items (
          *,
          product:products (*)
        ),
        orderHistory:order_history (*)
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

    return NextResponse.json(order);
  } catch (error: unknown) {
    console.error("Unexpected error in get admin order API:", error);
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

    const updateData: UpdateOrderStatusRequest = await req.json();

    // Get current order
    const { data: order, error: orderError } = await adminSupabase
      .from("orders")
      .select("*")
      .eq("id", params.orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Update order
    const updateFields: any = {
      status: updateData.status,
    };

    // If approving order, set approval fields
    if (updateData.status === "Confirmed") {
      updateFields.approvedBy = session.user.id;
      updateFields.approvedAt = new Date().toISOString();
    }

    // Mark delivery status when delivered; this is when order is considered complete for COD
    if (updateData.status === "Delivered") {
      updateFields.deliveryStatus = "Delivered";
    }

    const { error: updateError } = await adminSupabase
      .from("orders")
      .update(updateFields)
      .eq("id", params.orderId);

    if (updateError) {
      console.error("Error updating order:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Inventory allocation/deallocation based on status transitions
    try {
      if (updateData.status === "Confirmed") {
        // Allocate raw materials using BOM (transaction inside SQL function)
        const { error: allocError } = await adminSupabase.rpc(
          "fn_allocate_materials_for_order",
          { p_order_id: params.orderId }
        );
        if (allocError) {
          console.error("Error allocating materials:", allocError);
        }
      } else if (updateData.status === "Cancelled") {
        // Reverse any allocations
        const { error: revError } = await adminSupabase.rpc(
          "fn_reverse_allocations_for_order",
          { p_order_id: params.orderId }
        );
        if (revError) {
          console.error("Error reversing allocations:", revError);
        }
      }
    } catch (invErr) {
      console.error("Inventory allocation step failed:", invErr);
      // Continue; order status has been updated. Manual remediation may be needed.
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

    return NextResponse.json({ message: "Order updated successfully" });
  } catch (error: unknown) {
    console.error("Unexpected error in update admin order API:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
