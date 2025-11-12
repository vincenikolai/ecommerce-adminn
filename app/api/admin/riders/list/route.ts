import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Rider } from '@/types/rider';

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

    // Only admin or rider manager can access riders list
    if (session.user?.email !== ADMIN_EMAIL && profile.role !== RIDER_MANAGER_ROLE) {
      return NextResponse.json(
        { error: "Access Denied: Rider's Manager privileges required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const statusFilter = searchParams.get('status') || 'all';

    console.log("API Route - Fetching riders from Supabase...");

    // Fetch riders
    let query = localAdminSupabase
      .from('riders')
      .select('*');

    // Filter by status
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    // Apply sorting
    if (sortBy === 'created_at') {
      query = query.order('created_at', { ascending: sortOrder === 'asc' });
    } else if (sortBy === 'cellphone_number') {
      query = query.order('cellphone_number', { ascending: sortOrder === 'asc' });
    } else if (sortBy === 'status') {
      query = query.order('status', { ascending: sortOrder === 'asc' });
    } else {
      query = query.order('created_at', { ascending: sortOrder === 'asc' });
    }

    const { data: riders, error: ridersError } = await query;

    if (ridersError) {
      console.error("API Route - Error fetching riders:", ridersError);
      return NextResponse.json({ error: ridersError.message }, { status: 500 });
    }

    if (!riders || riders.length === 0) {
      return NextResponse.json([]);
    }

    // Get user IDs from riders
    const userIds = riders.map((rider: any) => rider.user_id);

    // Fetch profiles for these users
    const { data: profiles, error: profilesError } = await localAdminSupabase
      .from('profiles')
      .select('id, first_name, last_name, role')
      .in('id', userIds);

    if (profilesError) {
      console.error("API Route - Error fetching profiles:", profilesError);
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // Fetch auth users to get emails
    const { data: authUsers, error: authError } = await localAdminSupabase.auth.admin.listUsers();

    if (authError) {
      console.error("API Route - Error fetching auth users:", authError);
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    // Transform the data to match Rider interface
    const transformedRiders: Rider[] = (riders || []).map((rider: any) => {
      const profile = profiles?.find((p: any) => p.id === rider.user_id);
      const authUser = authUsers?.users.find((u: any) => u.id === rider.user_id);

      return {
        id: rider.id,
        userId: rider.user_id,
        cellphoneNumber: rider.cellphone_number,
        status: rider.status as "Available" | "Not Available",
        createdAt: rider.created_at,
        updatedAt: rider.updated_at,
        user: {
          id: rider.user_id,
          email: authUser?.email || '',
          first_name: profile?.first_name || null,
          last_name: profile?.last_name || null,
          role: profile?.role || 'customer',
        },
      };
    });

    console.log("API Route - Successfully fetched riders. Count:", transformedRiders.length);
    return NextResponse.json(transformedRiders);
  } catch (error: unknown) {
    console.error("API Route - Unexpected error in riders list API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

