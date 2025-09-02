import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UserProfile } from '@/types/user';

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const PURCHASE_ORDER_MANAGER_ROLE = "purchase_order_manager";

export async function DELETE(req: Request) {
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

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Product ID is required." }, { status: 400 });
    }

    const { error: deleteError } = await localAdminSupabase
      .from('products')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error("Error deleting product:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Product deleted successfully", id });
  } catch (error: unknown) {
    console.error("Unexpected error in product deletion API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
