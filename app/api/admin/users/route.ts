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

    const { data, error } = await adminSupabase.auth.admin.updateUserById(userId, {
      ban_duration: ban_duration,
    });

    if (error) {
      console.error("Error updating user ban status:", error);
      return new NextResponse(error.message, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected error in admin users route:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
