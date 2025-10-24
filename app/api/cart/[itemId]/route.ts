import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { UpdateCartItemRequest } from "@/types/order";

export async function PUT(
  req: Request,
  { params }: { params: { itemId: string } }
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

    const { quantity }: UpdateCartItemRequest = await req.json();

    if (!quantity || quantity <= 0) {
      return NextResponse.json(
        { error: "Valid quantity is required" },
        { status: 400 }
      );
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

    // Get cart item with product info
    const { data: cartItem, error: itemError } = await adminSupabase
      .from("cart_items")
      .select(
        `
        *,
        product (*),
        cart!inner (userId)
      `
      )
      .eq("id", params.itemId)
      .single();

    if (itemError || !cartItem) {
      return NextResponse.json(
        { error: "Cart item not found" },
        { status: 404 }
      );
    }

    // Check if user owns this cart
    if (cartItem.cart.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check stock availability
    if (cartItem.product.stock < quantity) {
      return NextResponse.json(
        { error: `Only ${cartItem.product.stock} items available in stock` },
        { status: 400 }
      );
    }

    // Update cart item
    const { error: updateError } = await adminSupabase
      .from("cart_items")
      .update({ quantity })
      .eq("id", params.itemId);

    if (updateError) {
      console.error("Error updating cart item:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Cart item updated successfully" });
  } catch (error: unknown) {
    console.error("Unexpected error in update cart item API:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { itemId: string } }
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

    // Get cart item to verify ownership
    const { data: cartItem, error: itemError } = await adminSupabase
      .from("cart_items")
      .select(
        `
        *,
        cart!inner (userId)
      `
      )
      .eq("id", params.itemId)
      .single();

    if (itemError || !cartItem) {
      return NextResponse.json(
        { error: "Cart item not found" },
        { status: 404 }
      );
    }

    // Check if user owns this cart
    if (cartItem.cart.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete cart item
    const { error: deleteError } = await adminSupabase
      .from("cart_items")
      .delete()
      .eq("id", params.itemId);

    if (deleteError) {
      console.error("Error deleting cart item:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Cart item removed successfully" });
  } catch (error: unknown) {
    console.error("Unexpected error in delete cart item API:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

