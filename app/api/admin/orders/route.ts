import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { UserRole } from "@/types/user";

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const ALLOWED_ROLES: UserRole[] = ["admin", "order_manager", "sales_staff"];

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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    let query = adminSupabase.from("orders").select(
      `
        *,
        items:order_items (
          *,
          product:products (*)
        )
      `,
      { count: "exact" }
    );

    if (status) {
      query = query.eq("status", status);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: orders, error, count } = await query;

    if (error) {
      console.error("Error fetching orders:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!orders) {
      return NextResponse.json({ orders: [], total: 0, page, limit });
    }

    // Apply sorting
    orders.sort((a, b) => {
      let valA: string | number | null = null;
      let valB: string | number | null = null;

      if (sortBy === "createdAt") {
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
      } else if (sortBy === "totalAmount") {
        valA = a.totalAmount;
        valB = b.totalAmount;
      } else if (sortBy === "status") {
        valA = a.status;
        valB = b.status;
      } else if (sortBy === "customerName") {
        valA = a.customerName;
        valB = b.customerName;
      }

      if (valA === null && valB === null) return 0;
      if (valA === null) return sortOrder === "asc" ? 1 : -1;
      if (valB === null) return sortOrder === "asc" ? -1 : 1;

      if (valA < valB) {
        return sortOrder === "asc" ? -1 : 1;
      } else if (valA > valB) {
        return sortOrder === "asc" ? 1 : -1;
      }
      return 0;
    });

    return NextResponse.json({
      orders,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error: unknown) {
    console.error("Unexpected error in admin orders API:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
