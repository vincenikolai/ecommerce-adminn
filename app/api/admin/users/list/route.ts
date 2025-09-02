import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = "eastlachemicals@gmail.com";

export async function GET(req: Request) {
  // CANARY TEST: Very early log and response to check if API route is hit
  console.log("CANARY TEST: API route /api/admin/users/list hit!");
  // return NextResponse.json({ message: "Canary test successful!" });

  const { searchParams } = new URL(req.url);
  const sortBy = searchParams.get('sortBy') || 'email';
  const sortOrder = searchParams.get('sortOrder') || 'asc';

  let supabaseUrl = '';
  let supabaseServiceRoleKey = '';

  try {
    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    // Log environment variables (masked for security) to verify they are loaded
    console.log("NEXT_PUBLIC_SUPABASE_URL loaded:", !!supabaseUrl);
    console.log("SUPABASE_SERVICE_ROLE_KEY loaded:", !!supabaseServiceRoleKey);

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing environment variables for Supabase admin client in API route');
    }

    // Re-initialize adminSupabase here to ensure env vars are fresh
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

    if (!session || session.user?.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Access Denied: User not allowed." }, { status: 403 });
    }

    console.log("Fetching users from Supabase...");

    // Fetch all users from auth.users (admin privilege required)
    const { data: authUsers, error: authError } = await localAdminSupabase.auth.admin.listUsers();

    if (authError) {
      console.error("Error fetching auth users:", authError);
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    console.log("Fetched authUsers:", JSON.stringify(authUsers, null, 2));

    if (!authUsers || authUsers.users.length === 0) {
      return NextResponse.json({ error: "No auth users found or empty list" }, { status: 404 });
    }

    const userIds = authUsers.users.map(user => user.id);
    console.log("User IDs for profile fetch:", userIds);

    // Fetch profiles for these users
    const { data: profiles, error: profileError } = await localAdminSupabase
      .from('profiles')
      .select('id, first_name, last_name, ban_duration, role')
      .in('id', userIds);

    if (profileError) {
      console.error("Error fetching profiles:", profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    console.log("Fetched profiles:", JSON.stringify(profiles, null, 2));

    // Combine data
    let combinedUsers = authUsers.users.map(authUser => {
      const profile = profiles?.find(p => p.id === authUser.id);
      return {
        id: authUser.id,
        email: authUser.email,
        first_name: profile?.first_name || null,
        last_name: profile?.last_name || null,
        ban_duration: profile?.ban_duration || null,
        role: profile?.role || "customer", // Default to 'customer' if not set
        created_at: authUser.created_at, // Add created_at from authUser
      };
    });

    // Apply sorting
    combinedUsers.sort((a, b) => {
      let valA: string | null = null;
      let valB: string | null = null;

      if (sortBy === "email") {
        valA = a.email;
        valB = b.email;
      } else if (sortBy === "role") {
        valA = a.role;
        valB = b.role;
      } else if (sortBy === "created_at") {
        valA = a.created_at;
        valB = b.created_at;
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

    return NextResponse.json(combinedUsers);
  } catch (error: unknown) {
    console.error("Unexpected error in admin users list route:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
