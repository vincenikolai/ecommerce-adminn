import { NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
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
