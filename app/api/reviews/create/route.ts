import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { CreateReviewRequest } from "@/types/review";

export async function POST(req: Request) {
  try {
    const authClient = createRouteHandlerClient({ cookies });
    const {
      data: { session },
      error: sessionError,
    } = await authClient.auth.getSession();

    if (sessionError) {
      console.error("Session error:", sessionError);
      return NextResponse.json(
        { error: sessionError.message },
        { status: 401 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { error: "Authentication required to submit reviews" },
        { status: 401 }
      );
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await authClient
      .from("profiles")
      .select("role, first_name, last_name")
      .eq("id", session.user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // Only customers can submit reviews
    if (profile.role !== "customer") {
      return NextResponse.json(
        { error: "Only customers can submit reviews" },
        { status: 403 }
      );
    }

    const body: CreateReviewRequest = await req.json();
    const { rating, title, content, productId, orderId } = body;

    if (!rating || !title || !content) {
      return NextResponse.json(
        {
          error: "Rating, title, and content are required",
        },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        {
          error: "Rating must be between 1 and 5",
        },
        { status: 400 }
      );
    }

    // Use customer's actual name
    const customerName = 
      `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || 
      "Customer";

    // Create Supabase admin client for database operations
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

    // Create review in database
    const { data: review, error: reviewError } = await adminSupabase
      .from('reviews')
      .insert([{
        userId: session.user.id,
        userName: customerName,
        userEmail: session.user.email || "customer@example.com",
        rating: parseInt(rating.toString()),
        title: title.trim(),
        content: content.trim(),
        isApproved: false, // Requires admin approval
        productId: productId || null,
        orderId: orderId || null,
      }])
      .select()
      .single();

    if (reviewError || !review) {
      console.error("Error creating review:", reviewError);
      return NextResponse.json(
        {
          error: "Failed to create review",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message:
          "Review submitted successfully. It will be reviewed before being published.",
        review,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating review:", error);
    return NextResponse.json(
      {
        error: "Failed to create review",
      },
      { status: 500 }
    );
  }
}

