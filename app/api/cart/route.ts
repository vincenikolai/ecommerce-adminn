import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// Simple in-memory cart storage (for demo purposes)
let carts: { [userId: string]: any } = {};

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

    const userId = session.user.id;

    if (!carts[userId]) {
      carts[userId] = {
        id: `cart-${userId}`,
        userId: userId,
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    return NextResponse.json(carts[userId]);
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

    const userId = session.user.id;

    if (!carts[userId]) {
      carts[userId] = {
        id: `cart-${userId}`,
        userId: userId,
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Check if item already exists in cart
    const existingItemIndex = carts[userId].items.findIndex(
      (item: any) => item.productId === productId
    );

    if (existingItemIndex >= 0) {
      // Update existing item quantity
      carts[userId].items[existingItemIndex].quantity += quantity;
    } else {
      // Add new item to cart
      carts[userId].items.push({
        id: `cart-item-${Date.now()}`,
        cartId: carts[userId].id,
        productId: productId,
        quantity: quantity,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    carts[userId].updatedAt = new Date().toISOString();

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
