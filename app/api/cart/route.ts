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

    // Get user profile to check role
    const { data: profile, error: profileError } = await authClient
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // Only customers can access cart
    if (profile.role !== "customer") {
      return NextResponse.json(
        { error: "Only customers can access cart" },
        { status: 403 }
      );
    }

    // Admin Supabase client

    const userId = session.user.id;

    // Get or create cart for user
    let { data: cart, error: cartError } = await adminSupabase
      .from("carts")
      .select("*")
      .eq("userId", userId)
      .single();

    if (cartError && cartError.code === "PGRST116") {
      // Cart doesn't exist, create it (idempotent if race)
      const { data: createdCart, error: createError } = await adminSupabase
        .from("carts")
        .upsert(
          { userId: userId, updatedAt: new Date().toISOString() },
          { onConflict: "userId" }
        )
        .select()
        .single();

      if (createError || !createdCart) {
        console.error("Error creating cart:", createError);
        return NextResponse.json(
          { error: createError.message || "Failed to create cart" },
          { status: 500 }
        );
      }

      cart = createdCart;
    } else if (cartError) {
      console.error("Error fetching cart:", cartError);
      return NextResponse.json({ error: cartError.message }, { status: 500 });
    }

    // Get cart items with product details
    const { data: cartItems, error: itemsError } = await adminSupabase
      .from("cart_items")
      .select(
        `
        *,
        product:products(*)
      `
      )
      .eq("cartId", cart.id);

    if (itemsError) {
      console.error("Error fetching cart items:", itemsError);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    return NextResponse.json({
      id: cart.id,
      userId: cart.userId,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
      items: cartItems || [],
    });
  } catch (error: unknown) {
    console.error("Unexpected error in cart API:", error);
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

    // Get user profile to check role
    const { data: profile, error: profileError } = await authClient
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // Only customers can add to cart
    if (profile.role !== "customer") {
      return NextResponse.json(
        { error: "Only customers can add items to cart" },
        { status: 403 }
      );
    }

    const { productId, quantity } = await req.json();

    if (!productId || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: "Product ID and valid quantity are required" },
        { status: 400 }
      );
    }

    // Admin Supabase client

    const userId = session.user.id;

    // Get product and check stock
    const { data: product, error: productError } = await adminSupabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check stock availability
    if (product.stock < quantity) {
      return NextResponse.json(
        { error: `Only ${product.stock} items available in stock` },
        { status: 400 }
      );
    }

    // Get or create cart for user
    let { data: cart, error: cartError } = await adminSupabase
      .from("carts")
      .select("*")
      .eq("userId", userId)
      .single();

    if (cartError && cartError.code === "PGRST116") {
      // Cart doesn't exist, create it (idempotent)
      const { data: createdCart, error: createError } = await adminSupabase
        .from("carts")
        .upsert(
          { userId: userId, updatedAt: new Date().toISOString() },
          { onConflict: "userId" }
        )
        .select()
        .single();

      if (createError || !createdCart) {
        console.error("Error creating cart:", createError);
        return NextResponse.json(
          { error: createError.message || "Failed to create cart" },
          { status: 500 }
        );
      }

      cart = createdCart;
    } else if (cartError) {
      console.error("Error fetching cart:", cartError);
      return NextResponse.json({ error: cartError.message }, { status: 500 });
    }

    // Check if item already exists in cart
    const { data: existingItem, error: existingItemError } = await adminSupabase
      .from("cart_items")
      .select("*")
      .eq("cartId", cart.id)
      .eq("productId", productId)
      .single();

    if (existingItemError && existingItemError.code !== "PGRST116") {
      console.error("Error checking existing cart item:", existingItemError);
      return NextResponse.json(
        { error: existingItemError.message },
        { status: 500 }
      );
    }

    if (existingItem) {
      // Update existing item quantity
      const newQuantity = existingItem.quantity + quantity;

      // Check stock availability for total quantity
      if (product.stock < newQuantity) {
        return NextResponse.json(
          {
            error: `Only ${
              product.stock - existingItem.quantity
            } more items available in stock`,
          },
          { status: 400 }
        );
      }

      // Deduct stock
      const { error: stockError } = await adminSupabase
        .from("products")
        .update({ stock: product.stock - quantity })
        .eq("id", productId);

      if (stockError) {
        console.error("Error deducting stock:", stockError);
        return NextResponse.json(
          { error: "Failed to update product stock" },
          { status: 500 }
        );
      }

      // Update cart item
      const { error: updateError } = await adminSupabase
        .from("cart_items")
        .update({ quantity: newQuantity })
        .eq("id", existingItem.id);

      if (updateError) {
        // Rollback stock deduction
        await adminSupabase
          .from("products")
          .update({ stock: product.stock })
          .eq("id", productId);

        console.error("Error updating cart item:", updateError);
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }
    } else {
      // Deduct stock
      const { error: stockError } = await adminSupabase
        .from("products")
        .update({ stock: product.stock - quantity })
        .eq("id", productId);

      if (stockError) {
        console.error("Error deducting stock:", stockError);
        return NextResponse.json(
          { error: "Failed to update product stock" },
          { status: 500 }
        );
      }

      // Add new item to cart
      const { error: insertError } = await adminSupabase
        .from("cart_items")
        .insert([
          {
            cartId: cart.id,
            productId: productId,
            quantity: quantity,
          },
        ]);

      if (insertError) {
        // Rollback stock deduction
        await adminSupabase
          .from("products")
          .update({ stock: product.stock })
          .eq("id", productId);

        console.error("Error adding cart item:", insertError);
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 }
        );
      }
    }

    // Update cart timestamp
    await adminSupabase
      .from("carts")
      .update({ updatedAt: new Date().toISOString() })
      .eq("id", cart.id);

    return NextResponse.json({ message: "Item added to cart successfully" });
  } catch (error: unknown) {
    console.error("Unexpected error in add to cart API:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
