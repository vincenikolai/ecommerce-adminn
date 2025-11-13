import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { UserRole } from "@/types/user";

const ADMIN_EMAIL = "eastlachemicals@gmail.com";

export async function DELETE(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const adminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
      },
    });

    const cookieStore = cookies();
    const authClient = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { session }, error: sessionError } = await authClient.auth.getSession();

    if (sessionError) {
      console.error("Session error:", sessionError);
      return NextResponse.json({ error: sessionError.message }, { status: 401 });
    }

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!profile || (profile.role !== 'admin' && session.user?.email !== ADMIN_EMAIL)) {
      return NextResponse.json(
        { error: "Access Denied: Admin privileges required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const reviewId = searchParams.get('reviewId');

    if (!reviewId) {
      return NextResponse.json(
        { error: "Review ID is required" },
        { status: 400 }
      );
    }

    // Delete review (comments will be cascade deleted)
    const { error: deleteError } = await adminSupabase
      .from('reviews')
      .delete()
      .eq('id', reviewId);

    if (deleteError) {
      console.error("Error deleting review:", deleteError);
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Review deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in delete review API:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

