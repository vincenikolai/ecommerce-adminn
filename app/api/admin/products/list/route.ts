import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UserProfile } from '@/types/user';

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const PURCHASE_ORDER_MANAGER_ROLE = "purchase_order_manager";

export async function GET(req: Request) {
  let supabaseUrl = '';
  let supabaseServiceRoleKey = '';

  try {
    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing environment variables for Supabase admin client in API route');
    }

    const localAdminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
      },
    });

    const authClient = createRouteHandlerClient({ cookies: () => cookies() });
    const { data: { session }, error: sessionError } = await authClient.auth.getSession();

    if (sessionError) {
      console.error("Session error:", sessionError);
      return NextResponse.json({ error: sessionError.message }, { status: 401 });
    }

    if (!session) {
      return NextResponse.json({ error: "Access Denied: No active session." }, { status: 403 });
    }

    // Fetch the user's role from the profiles table
    const { data: profile, error: profileError } = await localAdminSupabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!profile || (profile.role !== PURCHASE_ORDER_MANAGER_ROLE && session.user?.email !== ADMIN_EMAIL)) {
      return NextResponse.json({ error: "Access Denied: Insufficient privileges." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    console.log("Fetching products from Supabase...");

    let { data: products, error: productsError } = await localAdminSupabase
      .from('products')
      .select('*'); // Select all columns for now

    if (productsError) {
      console.error("Error fetching products:", productsError);
      return NextResponse.json({ error: productsError.message }, { status: 500 });
    }

    if (!products) {
      products = [];
    }

    // Apply sorting
    products.sort((a, b) => {
      let valA: string | number | null = null;
      let valB: string | number | null = null;

      if (sortBy === "name") {
        valA = a.name;
        valB = b.name;
      } else if (sortBy === "created_at") {
        valA = a.created_at;
        valB = b.created_at;
      } else if (sortBy === "stock") {
        valA = a.stock;
        valB = b.stock;
      } else if (sortBy === "price") {
        valA = a.price;
        valB = b.price;
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

    return NextResponse.json(products);
  } catch (error: unknown) {
    console.error("Unexpected error in products list API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
