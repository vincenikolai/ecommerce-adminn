import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const approvedOnly = searchParams.get("approved") !== "false";

    // Fetch reviews
    let query = adminSupabase
      .from('reviews')
      .select('*')
      .order('createdAt', { ascending: false });

    if (approvedOnly) {
      query = query.eq('isApproved', true);
    }

    const { data: reviews, error } = await query;

    if (error) {
      console.error("Error fetching reviews:", error);
      return NextResponse.json(
        {
          error: "Failed to fetch reviews",
        },
        { status: 500 }
      );
    }

    // Fetch all comments for these reviews
    const reviewIds = (reviews || []).map((r: any) => r.id);
    let reviewsWithComments = reviews || [];

    if (reviewIds.length > 0) {
      const { data: allComments, error: commentsError } = await adminSupabase
        .from('review_comments')
        .select('*')
        .in('reviewId', reviewIds)
        .order('createdAt', { ascending: true });

      if (!commentsError && allComments) {
        // Organize comments into nested structure
        reviewsWithComments = (reviews || []).map((review: any) => {
          const reviewComments = allComments.filter((c: any) => c.reviewId === review.id);
          
          // Separate top-level comments from replies
          const topLevelComments = reviewComments.filter((c: any) => !c.parentCommentId);
          const replies = reviewComments.filter((c: any) => c.parentCommentId);
          
          // Attach replies to their parent comments
          const commentsWithReplies = topLevelComments.map((comment: any) => ({
            ...comment,
            replies: replies.filter((r: any) => r.parentCommentId === comment.id),
          }));

          return {
            ...review,
            comments: commentsWithReplies,
          };
        });
      }
    }

    return NextResponse.json(reviewsWithComments, { status: 200 });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch reviews",
      },
      { status: 500 }
    );
  }
}
