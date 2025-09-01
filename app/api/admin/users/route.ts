import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'

const ADMIN_EMAIL = "eastlachemicals@gmail.com";

export async function POST(req: Request) {
  try {
    const authClient = createRouteHandlerClient({ cookies });
    const { data: { session }, error: sessionError } = await authClient.auth.getSession();

    if (sessionError || !session || session.user?.email !== ADMIN_EMAIL) {
      return new NextResponse("User not allowed", { status: 403 });
    }

    const { userId, ban_duration } = await req.json();

    if (!userId) {
      return new NextResponse("User ID is required", { status: 400 });
    }

    let bannedUntil: string | null = null;
    if (ban_duration !== 'none') {
      const now = new Date();
      // For '24h', set banned until 24 hours from now. Extend as needed for other durations.
      if (ban_duration === '24h') {
        now.setHours(now.getHours() + 24);
      }
      // Format to ISO string for Supabase
      bannedUntil = now.toISOString();
    }

    // Update user's banned_until status in Supabase Auth
    const { error: authUpdateError } = await adminSupabase.auth.admin.updateUserById(userId, {
      banned_until: bannedUntil,
    });

    if (authUpdateError) {
      console.error("Error updating user auth banned_until status:", authUpdateError);
      return new NextResponse(authUpdateError.message, { status: 500 });
    }

    // Update ban_duration in the profiles table (for display/custom logic)
    const { data, error: profileUpdateError } = await adminSupabase
      .from('profiles')
      .update({ ban_duration: ban_duration })
      .eq('id', userId);

    if (profileUpdateError) {
      console.error("Error updating user profile ban_duration:", profileUpdateError);
      return new NextResponse(profileUpdateError.message, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("Unexpected error in admin users route:", error);
    return new NextResponse(error instanceof Error ? error.message : "Internal Server Error", { status: 500 });
  }
}
