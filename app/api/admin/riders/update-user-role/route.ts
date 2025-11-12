import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    // Only admin or rider manager can update user roles to "rider"
    if (session.user?.email !== ADMIN_EMAIL && profile.role !== RIDER_MANAGER_ROLE) {
      return NextResponse.json(
        { error: "Access Denied: Rider's Manager privileges required." },
        { status: 403 }
      );
    }

    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required." },
        { status: 400 }
      );
    }

    // Prevent updating admin user's role
    const { data: targetUser, error: targetUserError } = await localAdminSupabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (targetUserError || !targetUser) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    // Check if user is admin by email
    const { data: authUser } = await localAdminSupabase.auth.admin.getUserById(userId);
    if (authUser?.user?.email === ADMIN_EMAIL) {
      return NextResponse.json(
        { error: "Cannot update admin user's role." },
        { status: 400 }
      );
    }

    // Update user role to "rider" in profiles table
    const { error: updateError } = await localAdminSupabase
      .from('profiles')
      .update({ role: 'rider' })
      .eq('id', userId);

    if (updateError) {
      console.error("API Route - Error updating user role:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Also update user metadata in Supabase Auth
    const { error: authUpdateError } = await localAdminSupabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        role: 'rider',
      },
    });

    if (authUpdateError) {
      console.error("API Route - Error updating auth user metadata:", authUpdateError);
      // Don't fail the whole operation, just log the error
    }

    return NextResponse.json({
      message: "User role updated to 'rider' successfully",
      userId,
    });

  } catch (error: unknown) {
    console.error("API Route - Unexpected error in update user role API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

