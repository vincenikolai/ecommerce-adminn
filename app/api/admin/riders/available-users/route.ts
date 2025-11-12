import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UserProfile } from '@/types/user';

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const RIDER_MANAGER_ROLE = "rider_manager";

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

    const cookieStore = cookies();
    const authClient = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { session }, error: sessionError } = await authClient.auth.getSession();

    if (sessionError) {
      console.error("API Route - Session error:", sessionError);
      return NextResponse.json({ error: sessionError.message }, { status: 401 });
    }

    if (!session) {
      return NextResponse.json({ error: "Access Denied: No active session." }, { status: 403 });
    }

    // Check user role
    const { data: profile, error: profileError } = await localAdminSupabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Access Denied: Could not verify user role." },
        { status: 403 }
      );
    }

    // Only admin or rider manager can access
    if (session.user?.email !== ADMIN_EMAIL && profile.role !== RIDER_MANAGER_ROLE) {
      return NextResponse.json(
        { error: "Access Denied: Rider's Manager privileges required." },
        { status: 403 }
      );
    }

    // Fetch all users from auth
    const { data: authUsers, error: authError } = await localAdminSupabase.auth.admin.listUsers();

    if (authError) {
      console.error("Error fetching auth users:", authError);
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    if (!authUsers || authUsers.users.length === 0) {
      return NextResponse.json([]);
    }

    const userIds = authUsers.users.map(user => user.id);

    // Fetch profiles
    const { data: profiles, error: profilesError } = await localAdminSupabase
      .from('profiles')
      .select('id, first_name, last_name, role')
      .in('id', userIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // Fetch existing riders to exclude
    const { data: existingRiders, error: ridersError } = await localAdminSupabase
      .from('riders')
      .select('user_id');

    if (ridersError) {
      console.error("Error fetching riders:", ridersError);
      return NextResponse.json({ error: ridersError.message }, { status: 500 });
    }

    const riderUserIds = new Set((existingRiders || []).map((r: any) => r.user_id));

    // Combine and filter
    let availableUsers: UserProfile[] = authUsers.users
      .map((authUser) => {
        const profile = profiles?.find((p) => p.id === authUser.id);
        return {
          ...authUser,
          first_name: profile?.first_name || null,
          last_name: profile?.last_name || null,
          role: (profile?.role as any) || 'customer',
          ban_duration: null,
        } as UserProfile;
      })
      .filter((user) => !riderUserIds.has(user.id) && user.email !== ADMIN_EMAIL);

    // If the requester is a rider_manager (not admin), filter to only show users with role "customer"
    if (session.user?.email !== ADMIN_EMAIL && profile.role === RIDER_MANAGER_ROLE) {
      availableUsers = availableUsers.filter((user) => user.role === 'customer');
    }

    return NextResponse.json(availableUsers);
  } catch (error: unknown) {
    console.error("API Route - Unexpected error in available users API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

