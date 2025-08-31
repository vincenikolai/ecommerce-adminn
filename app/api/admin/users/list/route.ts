import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'

const ADMIN_EMAIL = "eastlachemicals@gmail.com";

export async function GET(req: Request) {
  try {
    const authClient = createRouteHandlerClient({ cookies });
    const { data: { session }, error: sessionError } = await authClient.auth.getSession();

    if (sessionError || !session || session.user?.email !== ADMIN_EMAIL) {
      return new NextResponse("User not allowed", { status: 403 });
    }

    // Fetch all users from auth.users (admin privilege required)
    const { data: authUsers, error: authError } = await adminSupabase.auth.admin.listUsers();

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
    const { data: profiles, error: profileError } = await adminSupabase
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
  } catch (error) {
    console.error("Unexpected error in admin users list route:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
