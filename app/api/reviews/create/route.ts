import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// Simple in-memory reviews storage (for demo purposes)
let reviews: any[] = [];

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

    const { userName, userEmail, rating, title, content } = await req.json();

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

    // Use customer's actual name or provided name
    const customerName = userName?.trim() || 
      `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || 
      "Customer";

    // Create review (customers only)
    const review = {
      id: `review-${Date.now()}`,
      userId: session.user.id,
      userName: customerName,
      userEmail: session.user.email || userEmail || "customer@example.com",
      rating: parseInt(rating),
      title: title.trim(),
      content: content.trim(),
      isApproved: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    reviews.push(review);

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

export async function GET(req: Request) {
  try {
    // Return only approved reviews
    const approvedReviews = reviews.filter((review) => review.isApproved);

    return NextResponse.json(approvedReviews);
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
