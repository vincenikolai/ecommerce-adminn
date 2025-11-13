import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { CreateReviewCommentRequest } from "@/types/review";

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
        { error: "Authentication required to post comments" },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await authClient
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", session.user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    const body: CreateReviewCommentRequest = await req.json();
    const { reviewId, content, parentCommentId } = body;

    if (!reviewId || !content) {
      return NextResponse.json(
        {
          error: "Review ID and content are required",
        },
        { status: 400 }
      );
    }

    // Verify review exists
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

    // Check if review exists
    const { data: review, error: reviewError } = await adminSupabase
      .from('reviews')
      .select('id, isApproved')
      .eq('id', reviewId)
      .single();

    if (reviewError || !review) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    if (!review.isApproved) {
      return NextResponse.json(
        { error: "Cannot comment on unapproved reviews" },
        { status: 403 }
      );
    }

    // If replying to a comment, verify parent comment exists
    if (parentCommentId) {
      const { data: parentComment, error: parentError } = await adminSupabase
        .from('review_comments')
        .select('id')
        .eq('id', parentCommentId)
        .single();

      if (parentError || !parentComment) {
        return NextResponse.json(
          { error: "Parent comment not found" },
          { status: 404 }
        );
      }
    }

    // Use user's actual name
    const userName = 
      `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || 
      "User";

    // Create comment
    const { data: comment, error: commentError } = await adminSupabase
      .from('review_comments')
      .insert([{
        reviewId,
        userId: session.user.id,
        userName,
        userEmail: session.user.email || "user@example.com",
        content: content.trim(),
        parentCommentId: parentCommentId || null,
        isApproved: true, // Comments are auto-approved
      }])
      .select()
      .single();

    if (commentError || !comment) {
      console.error("Error creating comment:", commentError);
      return NextResponse.json(
        {
          error: "Failed to create comment",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Comment posted successfully",
        comment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      {
        error: "Failed to create comment",
      },
      { status: 500 }
    );
  }
}

