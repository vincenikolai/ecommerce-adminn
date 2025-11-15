import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { UpdateCartItemRequest } from "@/types/order";

export async function PUT(
  req: Request,
  { params }: { params: { itemId: string } }
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

    const { quantity }: UpdateCartItemRequest = await req.json();

    if (!quantity || quantity <= 0) {
      return NextResponse.json(
        { error: "Valid quantity is required" },
        { status: 400 }
      );
    }

    // Get cart item with product info
    const { data: cartItem, error: itemError } = await adminSupabase
      .from("cart_items")
      .select(
        `
        *,
        product:products(*)
      `
      )
      .eq("id", params.itemId)
      .single();

    if (itemError || !cartItem) {
      console.error("Error fetching cart item:", itemError);
      return NextResponse.json(
        { error: "Cart item not found" },
        { status: 404 }
      );
    }

    // Get the cart to verify ownership
    const { data: cart, error: cartError } = await adminSupabase
      .from("carts")
      .select("userId")
      .eq("id", cartItem.cartId)
      .single();

    if (cartError || !cart) {
      console.error("Error fetching cart:", cartError);
      return NextResponse.json(
        { error: "Cart not found" },
        { status: 404 }
      );
    }

    // Check if user owns this cart
    if (cart.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check stock availability for the new quantity (but don't subtract stock)
    if (cartItem.product.stock < quantity) {
      return NextResponse.json(
        {
          error: `Only ${cartItem.product.stock} items available in stock`,
        },
        { status: 400 }
      );
    }

    // Update cart item (no stock subtraction)
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

    // Get cart item to verify ownership
    const { data: cartItem, error: itemError } = await adminSupabase
      .from("cart_items")
      .select("*")
      .eq("id", params.itemId)
      .single();

    if (itemError || !cartItem) {
      console.error("Error fetching cart item:", itemError);
      return NextResponse.json(
        { error: "Cart item not found" },
        { status: 404 }
      );
    }

    // Get the cart to verify ownership
    const { data: cart, error: cartError } = await adminSupabase
      .from("carts")
      .select("userId")
      .eq("id", cartItem.cartId)
      .single();

    if (cartError || !cart) {
      console.error("Error fetching cart:", cartError);
      return NextResponse.json(
        { error: "Cart not found" },
        { status: 404 }
      );
    }

    // Check if user owns this cart
    if (cart.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete cart item (no stock restoration needed since we don't subtract stock)
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
