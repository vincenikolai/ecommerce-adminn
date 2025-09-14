import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'

const ADMIN_EMAIL = "eastlachemicals@gmail.com";

export async function POST(req: Request) {
  try {
    const authClient = createRouteHandlerClient({ cookies: () => cookies() });
    const { data: { session }, error: sessionError } = await authClient.auth.getSession();

    if (sessionError || !session || session.user?.email !== ADMIN_EMAIL) {
      return new NextResponse("User not allowed", { status: 403 });
    }

    const { userId, ban_duration } = await req.json();

    if (!userId) {
      return new NextResponse("User ID is required", { status: 400 });
    }

    let bannedUntil: string | null = null;
    let profileBanDuration: string | null = null;

    if (ban_duration === 'blocked') {
      // Set banned_until to a very distant future date for a permanent block
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 100); // 100 years from now
      bannedUntil = farFuture.toISOString();
      profileBanDuration = 'blocked';
    } else if (ban_duration === 'unblocked') {
      bannedUntil = null;
      profileBanDuration = 'none';
    } else {
      return new NextResponse("Invalid ban_duration provided", { status: 400 });
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
      .update({ ban_duration: profileBanDuration })
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
