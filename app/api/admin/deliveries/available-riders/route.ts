import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const DELIVERY_MANAGER_ROLE = "delivery_manager";

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

    // Only admin or delivery manager can access
    if (session.user?.email !== ADMIN_EMAIL && profile.role !== DELIVERY_MANAGER_ROLE) {
      return NextResponse.json(
        { error: "Access Denied: Delivery Manager privileges required." },
        { status: 403 }
      );
    }

    // Fetch riders with status "Available"
    const { data: availableRiders, error: ridersError } = await localAdminSupabase
      .from('riders')
      .select(`
        id,
        user_id,
        cellphone_number,
        status
      `)
      .eq('status', 'Available')
      .order('created_at', { ascending: true });

    if (ridersError) {
      console.error("API Route - Error fetching available riders:", ridersError);
      return NextResponse.json({ error: ridersError.message }, { status: 500 });
    }

    if (!availableRiders || availableRiders.length === 0) {
      return NextResponse.json([]);
    }

    // Get user IDs
    const userIds = availableRiders.map((r: any) => r.user_id).filter(Boolean);

    // Fetch user profiles
    const { data: profiles, error: profilesError } = await localAdminSupabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', userIds);

    if (profilesError) {
      console.error("API Route - Error fetching profiles:", profilesError);
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // Fetch auth users for emails
    const { data: authUsers } = await localAdminSupabase.auth.admin.listUsers();

    // Transform the data
    const transformedRiders = (availableRiders || []).map((rider: any) => {
      const profile = profiles?.find((p: any) => p.id === rider.user_id);
      const authUser = authUsers?.users.find((u: any) => u.id === rider.user_id);

      return {
        id: rider.id,
        cellphoneNumber: rider.cellphone_number,
        status: rider.status,
        user: {
          id: rider.user_id,
          email: authUser?.email || '',
          first_name: profile?.first_name || null,
          last_name: profile?.last_name || null,
        },
      };
    });

    return NextResponse.json(transformedRiders);
  } catch (error: unknown) {
    console.error("API Route - Unexpected error in available riders API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

