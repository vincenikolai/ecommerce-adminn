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
        product (*),
        carts!inner (userId)
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
    if (cartItem.carts.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const currentCartQuantity = cartItem.quantity;
    const quantityDifference = quantity - currentCartQuantity;

    // Check stock availability for the new quantity
    if (cartItem.product.stock + currentCartQuantity < quantity) {
      return NextResponse.json(
        {
          error: `Only ${
            cartItem.product.stock + currentCartQuantity
          } items available in stock`,
        },
        { status: 400 }
      );
    }

    // Adjust stock based on quantity change
    if (quantityDifference !== 0) {
      const { error: stockError } = await adminSupabase
        .from("products")
        .update({ stock: cartItem.product.stock - quantityDifference })
        .eq("id", cartItem.productId);

      if (stockError) {
        console.error("Error updating product stock:", stockError);
        return NextResponse.json(
          { error: "Failed to update product stock" },
          { status: 500 }
        );
      }
    }

    // Update cart item
    const { error: updateError } = await adminSupabase
      .from("cart_items")
      .update({ quantity })
      .eq("id", params.itemId);

    if (updateError) {
      // Rollback stock change if update fails
      if (quantityDifference !== 0) {
        await adminSupabase
          .from("products")
          .update({ stock: cartItem.product.stock })
          .eq("id", cartItem.productId);
      }

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
      .select(
        `
        *,
        carts!inner (userId)
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
    if (cartItem.carts.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get product to restore stock
    const { data: product, error: productError } = await adminSupabase
      .from("products")
      .select("*")
      .eq("id", cartItem.productId)
      .single();

    if (productError) {
      console.error("Error fetching product:", productError);
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

    // Restore stock if product was found
    if (product) {
      const { error: stockError } = await adminSupabase
        .from("products")
        .update({ stock: product.stock + cartItem.quantity })
        .eq("id", cartItem.productId);

      if (stockError) {
        console.error("Error restoring product stock:", stockError);
        // Non-critical error, don't fail the delete
      }
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
