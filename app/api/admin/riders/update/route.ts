import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UpdateRiderRequest } from '@/types/rider';

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const RIDER_MANAGER_ROLE = "rider_manager";

export async function PATCH(req: Request) {
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

    // Only admin or rider manager can update riders
    if (session.user?.email !== ADMIN_EMAIL && profile.role !== RIDER_MANAGER_ROLE) {
      return NextResponse.json(
        { error: "Access Denied: Rider's Manager privileges required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Rider ID is required." }, { status: 400 });
    }

    const body: UpdateRiderRequest = await req.json();
    const { cellphoneNumber, status } = body;

    if (!cellphoneNumber && !status) {
      return NextResponse.json(
        { error: "At least one field (cellphoneNumber or status) must be provided for update." },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: any = {};
    if (cellphoneNumber !== undefined) {
      updateData.cellphone_number = cellphoneNumber;
    }
    if (status !== undefined) {
      updateData.status = status;
    }
    updateData.updated_at = new Date().toISOString();

    // Update rider
    const { data: updatedRider, error: updateError } = await localAdminSupabase
      .from('riders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error("API Route - Error updating rider:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!updatedRider) {
      return NextResponse.json({ error: "Rider not found or no changes made." }, { status: 404 });
    }

    // Fetch the full rider with user profile
    const { data: fullRider, error: fetchError } = await localAdminSupabase
      .from('riders')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error("API Route - Error fetching updated rider:", fetchError);
      return NextResponse.json({
        message: "Rider updated successfully (user profile might be incomplete in response)",
        rider: updatedRider
      });
    }

    // Fetch user profile and auth user
    const { data: userProfile, error: profileError } = await localAdminSupabase
      .from('profiles')
      .select('id, first_name, last_name, role')
      .eq('id', fullRider.user_id)
      .single();

    const { data: authUser, error: authError } = await localAdminSupabase.auth.admin.getUserById(fullRider.user_id);

    const transformedRider = {
      id: fullRider.id,
      userId: fullRider.user_id,
      cellphoneNumber: fullRider.cellphone_number,
      status: fullRider.status as "Available" | "Not Available",
      createdAt: fullRider.created_at,
      updatedAt: fullRider.updated_at,
      user: {
        id: fullRider.user_id,
        email: authUser?.user?.email || '',
        first_name: userProfile?.first_name || null,
        last_name: userProfile?.last_name || null,
        role: userProfile?.role || 'customer',
      },
    };

    return NextResponse.json({
      message: "Rider updated successfully",
      rider: transformedRider
    });

  } catch (error: unknown) {
    console.error("API Route - Unexpected error in rider update API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

