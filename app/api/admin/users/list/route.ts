import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = "eastlachemicals@gmail.com";

export async function GET(req: Request) {
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

    const authClient = createRouteHandlerClient({ cookies });
    const { data: { session }, error: sessionError } = await authClient.auth.getSession();

    if (sessionError) {
      console.error("Session error:", sessionError);
      return new NextResponse(sessionError.message, { status: 401 });
    }

    if (!session || session.user?.email !== ADMIN_EMAIL) {
      return new NextResponse("User not allowed", { status: 403 });
    }

    // Fetch all users from auth.users (admin privilege required)
    const { data: authUsers, error: authError } = await localAdminSupabase.auth.admin.listUsers();

    if (authError) {
      console.error("Error fetching auth users:", authError);
      return new NextResponse(authError.message, { status: 500 });
    }

    console.log("Fetched authUsers:", JSON.stringify(authUsers, null, 2));

    if (!authUsers || authUsers.users.length === 0) {
      return new NextResponse("No auth users found or empty list", { status: 404 });
    }

    const userIds = authUsers.users.map(user => user.id);
    console.log("User IDs for profile fetch:", userIds);

    // Fetch profiles for these users
    const { data: profiles, error: profileError } = await localAdminSupabase
      .from('profiles')
      .select('id, first_name, last_name, ban_duration')
      .in('id', userIds);

    if (profileError) {
      console.error("Error fetching profiles:", profileError);
      return new NextResponse(profileError.message, { status: 500 });
    }

    console.log("Fetched profiles:", JSON.stringify(profiles, null, 2));

    // Combine data
    const combinedUsers = authUsers.users.map(authUser => {
      const profile = profiles?.find(p => p.id === authUser.id);
      return {
        id: authUser.id,
        email: authUser.email,
        first_name: profile?.first_name || null,
        last_name: profile?.last_name || null,
        ban_duration: profile?.ban_duration || null,
        // Add any other relevant authUser properties you want
      };
    });

    return NextResponse.json(combinedUsers);
  } catch (error: any) {
    console.error("Unexpected error in admin users list route:", error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}
