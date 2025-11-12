import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CreateRiderRequest } from '@/types/rider';

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const RIDER_MANAGER_ROLE = "rider_manager";

export async function POST(req: Request) {
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

    // Only admin or rider manager can create riders
    if (session.user?.email !== ADMIN_EMAIL && profile.role !== RIDER_MANAGER_ROLE) {
      return NextResponse.json(
        { error: "Access Denied: Rider's Manager privileges required." },
        { status: 403 }
      );
    }

    const body: CreateRiderRequest = await req.json();
    const { userId, cellphoneNumber, status } = body;

    if (!userId || !cellphoneNumber) {
      return NextResponse.json(
        { error: "User ID and cellphone number are required." },
        { status: 400 }
      );
    }

    // Check if user exists in profiles
    const { data: targetUserProfile, error: targetProfileError } = await localAdminSupabase
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .single();

    if (targetProfileError || !targetUserProfile) {
      return NextResponse.json(
        { error: "User not found in profiles." },
        { status: 404 }
      );
    }

    // Check if rider already exists for this user
    const { data: existingRider, error: checkError } = await localAdminSupabase
      .from('riders')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existingRider) {
      return NextResponse.json(
        { error: "A rider record already exists for this user." },
        { status: 400 }
      );
    }

    // Update user role to "rider" in profiles table if not already
    if (targetUserProfile.role !== 'rider') {
      const { error: roleUpdateError } = await localAdminSupabase
        .from('profiles')
        .update({ role: 'rider' })
        .eq('id', userId);

      if (roleUpdateError) {
        console.error("Error updating user role in profiles:", roleUpdateError);
        return NextResponse.json(
          { error: "Failed to update user role to rider in profiles table." },
          { status: 500 }
        );
      }

      // Also update user metadata in Supabase Auth
      const { error: authUpdateError } = await localAdminSupabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          role: 'rider',
        },
      });

      if (authUpdateError) {
        console.error("Error updating auth user metadata:", authUpdateError);
        // Don't fail the whole operation, just log the error
        console.warn("Warning: User role updated in profiles but auth metadata update failed");
      }
    }

    // Create rider record
    const { data: newRider, error: createError } = await localAdminSupabase
      .from('riders')
      .insert([{
        user_id: userId,
        cellphone_number: cellphoneNumber,
        status: status || 'Available',
      }])
      .select()
      .single();

    if (createError) {
      console.error("API Route - Error creating rider:", createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    // Fetch the full rider with user profile
    const { data: fullRider, error: fetchError } = await localAdminSupabase
      .from('riders')
      .select('*')
      .eq('id', newRider.id)
      .single();

    if (fetchError) {
      console.error("API Route - Error fetching created rider:", fetchError);
      return NextResponse.json({
        message: "Rider created successfully (user profile might be incomplete in response)",
        rider: newRider
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
      message: "Rider created successfully",
      rider: transformedRider
    });

  } catch (error: unknown) {
    console.error("API Route - Unexpected error in rider creation API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

